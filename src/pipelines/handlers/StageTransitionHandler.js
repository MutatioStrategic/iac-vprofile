/**
 * Stage Transition Handler
 * Manages stage transition logic and validations
 */

const eventBus = require('../engine/EventBus');
const stateManager = require('../engine/StateManager');
const { getStageDefinition, isValidTransition } = require('../registry/stageDefinitions');
const { getMatterType } = require('../registry/matterTypes');

class StageTransitionHandler {
  constructor() {
    this.transitionRules = new Map();
    this.transitionCallbacks = new Map();
    this.setupDefaultRules();
  }

  /**
   * Can transition to stage
   * @param {string} caseId - Case ID
   * @param {string} targetStage - Target stage
   * @returns {Object} Validation result
   */
  canTransition(caseId, targetStage) {
    const caseData = stateManager.getCase(caseId);
    if (!caseData) {
      return {
        allowed: false,
        reason: 'Case not found'
      };
    }

    const currentStage = caseData.currentStage;

    // Check if transition is valid
    if (!isValidTransition(currentStage, targetStage)) {
      return {
        allowed: false,
        reason: `Invalid transition from ${currentStage} to ${targetStage}`
      };
    }

    // Check stage definition
    const stageDefinition = getStageDefinition(targetStage);

    // Validate required fields
    const missingFields = this.validateRequiredFields(caseData, stageDefinition);
    if (missingFields.length > 0) {
      return {
        allowed: false,
        reason: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields
      };
    }

    // Check custom transition rules
    const ruleKey = `${currentStage}_to_${targetStage}`;
    if (this.transitionRules.has(ruleKey)) {
      const rule = this.transitionRules.get(ruleKey);
      const ruleResult = rule(caseData);
      if (!ruleResult.allowed) {
        return ruleResult;
      }
    }

    return {
      allowed: true,
      reason: 'Transition is valid'
    };
  }

  /**
   * Validate required fields for stage
   * @param {Object} caseData - Case data
   * @param {Object} stageDefinition - Stage definition
   * @returns {Array<string>} Missing fields
   */
  validateRequiredFields(caseData, stageDefinition) {
    const missingFields = [];

    for (const field of stageDefinition.requiredFields) {
      if (!caseData.data[field] && !caseData[field]) {
        missingFields.push(field);
      }
    }

    return missingFields;
  }

  /**
   * Get available transitions for case
   * @param {string} caseId - Case ID
   * @returns {Array<Object>} Available transitions
   */
  getAvailableTransitions(caseId) {
    const caseData = stateManager.getCase(caseId);
    if (!caseData) {
      return [];
    }

    const currentStage = caseData.currentStage;
    const stageDefinition = getStageDefinition(currentStage);
    const nextStages = stageDefinition.nextStages;

    return nextStages.map(stage => {
      const validation = this.canTransition(caseId, stage);
      const targetDefinition = getStageDefinition(stage);

      return {
        stage,
        name: targetDefinition.name,
        description: targetDefinition.description,
        color: targetDefinition.color,
        icon: targetDefinition.icon,
        allowed: validation.allowed,
        reason: validation.reason,
        missingFields: validation.missingFields || []
      };
    });
  }

  /**
   * Execute transition with validation
   * @param {string} caseId - Case ID
   * @param {string} targetStage - Target stage
   * @param {Object} metadata - Transition metadata
   * @returns {Object} Transition result
   */
  async executeTransition(caseId, targetStage, metadata = {}) {
    // Validate transition
    const validation = this.canTransition(caseId, targetStage);
    if (!validation.allowed) {
      throw new Error(`Transition not allowed: ${validation.reason}`);
    }

    const caseData = stateManager.getCase(caseId);
    const currentStage = caseData.currentStage;

    // Execute pre-transition callbacks
    await this.executeCallbacks('pre', currentStage, targetStage, caseData, metadata);

    // Perform transition
    const updatedCase = stateManager.transitionStage(caseId, targetStage, metadata);

    // Execute post-transition callbacks
    await this.executeCallbacks('post', currentStage, targetStage, updatedCase, metadata);

    // Log transition
    this.logTransition(caseId, currentStage, targetStage, metadata);

    return {
      success: true,
      case: updatedCase,
      fromStage: currentStage,
      toStage: targetStage,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Register transition rule
   * @param {string} fromStage - From stage
   * @param {string} toStage - To stage
   * @param {Function} rule - Rule function
   */
  registerRule(fromStage, toStage, rule) {
    const ruleKey = `${fromStage}_to_${toStage}`;
    this.transitionRules.set(ruleKey, rule);
  }

  /**
   * Register transition callback
   * @param {string} type - 'pre' or 'post'
   * @param {string} fromStage - From stage
   * @param {string} toStage - To stage
   * @param {Function} callback - Callback function
   */
  registerCallback(type, fromStage, toStage, callback) {
    const callbackKey = `${type}_${fromStage}_to_${toStage}`;
    if (!this.transitionCallbacks.has(callbackKey)) {
      this.transitionCallbacks.set(callbackKey, []);
    }
    this.transitionCallbacks.get(callbackKey).push(callback);
  }

  /**
   * Execute callbacks
   * @private
   */
  async executeCallbacks(type, fromStage, toStage, caseData, metadata) {
    const callbackKey = `${type}_${fromStage}_to_${toStage}`;

    if (this.transitionCallbacks.has(callbackKey)) {
      const callbacks = this.transitionCallbacks.get(callbackKey);
      for (const callback of callbacks) {
        try {
          await callback(caseData, metadata);
        } catch (error) {
          console.error(
            `Error executing ${type} transition callback ${fromStage} -> ${toStage}:`,
            error
          );
        }
      }
    }
  }

  /**
   * Log transition
   * @private
   */
  logTransition(caseId, fromStage, toStage, metadata) {
    eventBus.publish('transition_logged', {
      caseId,
      fromStage,
      toStage,
      metadata,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get transition history for case
   * @param {string} caseId - Case ID
   * @returns {Array<Object>} Transition history
   */
  getTransitionHistory(caseId) {
    const history = stateManager.getCaseHistory(caseId);
    return history.filter(entry => entry.type === 'stage_transition');
  }

  /**
   * Calculate average time in stage
   * @param {string} matterType - Matter type
   * @param {string} stage - Stage
   * @returns {Object} Average time statistics
   */
  calculateAverageTimeInStage(matterType, stage) {
    const cases = stateManager.getAllCases({ matterType });
    const stageDurations = [];

    for (const caseData of cases) {
      const history = stateManager.getCaseHistory(caseData.id);
      const stageTransitions = history.filter(
        entry => entry.type === 'stage_transition'
      );

      // Find entry and exit times for the stage
      let entryTime = null;
      let exitTime = null;

      for (let i = 0; i < stageTransitions.length; i++) {
        const transition = stageTransitions[i];
        if (transition.toStage === stage) {
          entryTime = new Date(transition.timestamp);
        }
        if (transition.fromStage === stage && entryTime) {
          exitTime = new Date(transition.timestamp);
          const duration = exitTime - entryTime;
          stageDurations.push(duration);
          entryTime = null;
          exitTime = null;
        }
      }
    }

    if (stageDurations.length === 0) {
      return {
        average: 0,
        count: 0,
        unit: 'days'
      };
    }

    const averageMs = stageDurations.reduce((a, b) => a + b, 0) / stageDurations.length;
    const averageDays = averageMs / (1000 * 60 * 60 * 24);

    return {
      average: Math.round(averageDays * 10) / 10,
      count: stageDurations.length,
      unit: 'days',
      min: Math.round((Math.min(...stageDurations) / (1000 * 60 * 60 * 24)) * 10) / 10,
      max: Math.round((Math.max(...stageDurations) / (1000 * 60 * 60 * 24)) * 10) / 10
    };
  }

  /**
   * Setup default transition rules
   * @private
   */
  setupDefaultRules() {
    // Example rule: Can't transition to trial without discovery
    this.registerRule('filing', 'trial', (caseData) => {
      const history = stateManager.getCaseHistory(caseData.id);
      const hasDiscovery = history.some(
        entry => entry.type === 'stage_transition' && entry.toStage === 'discovery'
      );

      if (!hasDiscovery) {
        return {
          allowed: false,
          reason: 'Must complete discovery before proceeding to trial'
        };
      }

      return { allowed: true };
    });

    // Example rule: Can't close case without settlement or verdict
    this.registerRule('litigation', 'closed', (caseData) => {
      if (!caseData.data.outcome) {
        return {
          allowed: false,
          reason: 'Must specify case outcome before closing'
        };
      }

      return { allowed: true };
    });
  }
}

// Create singleton instance
const stageTransitionHandler = new StageTransitionHandler();

module.exports = stageTransitionHandler;
module.exports.StageTransitionHandler = StageTransitionHandler;
