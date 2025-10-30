/**
 * Pipeline Executor
 * Main orchestrator for case pipeline execution
 */

const eventBus = require('./EventBus');
const stateManager = require('./StateManager');
const { getMatterType, getStagesForMatterType } = require('../registry/matterTypes');
const { getStageDefinition } = require('../registry/stageDefinitions');

class PipelineExecutor {
  constructor() {
    this.automationHandlers = new Map();
    this.validationRules = new Map();
    this.setupDefaultAutomations();
  }

  /**
   * Create a new case and start pipeline
   * @param {Object} caseData - Case initialization data
   * @returns {Object} Created case
   */
  async createCase(caseData) {
    // Validate matter type
    const matterType = getMatterType(caseData.matterType);
    const stages = getStagesForMatterType(caseData.matterType);

    // Set initial stage if not provided
    if (!caseData.initialStage) {
      caseData.initialStage = stages[0];
    }

    // Initialize case
    const newCase = stateManager.initializeCase(caseData);

    // Execute onboarding automations
    await this.executeAutomations(
      newCase.id,
      'case_created',
      { case: newCase }
    );

    return newCase;
  }

  /**
   * Execute stage transition
   * @param {string} caseId - Case ID
   * @param {string} newStage - Target stage
   * @param {Object} metadata - Transition metadata
   * @returns {Object} Updated case
   */
  async executeTransition(caseId, newStage, metadata = {}) {
    const currentCase = stateManager.getCase(caseId);
    if (!currentCase) {
      throw new Error(`Case ${caseId} not found`);
    }

    // Validate transition requirements
    await this.validateStageRequirements(caseId, newStage);

    // Get stage definition
    const stageDefinition = getStageDefinition(newStage);
    const matterType = getMatterType(currentCase.matterType);

    // Execute pre-transition hooks
    await this.executeHooks('pre_transition', {
      caseId,
      case: currentCase,
      targetStage: newStage,
      metadata
    });

    // Perform transition
    const updatedCase = stateManager.transitionStage(caseId, newStage, metadata);

    // Execute post-transition hooks
    await this.executeHooks('post_transition', {
      caseId,
      case: updatedCase,
      previousStage: currentCase.currentStage,
      currentStage: newStage,
      metadata
    });

    // Execute stage-specific automations
    const automationKey = `on_${newStage}_enter`;
    await this.executeAutomations(caseId, automationKey, { case: updatedCase });

    // Check for matter-type specific automations
    if (matterType.automations) {
      for (const [trigger, actions] of Object.entries(matterType.automations)) {
        if (trigger.includes(newStage)) {
          await this.executeActionSequence(caseId, actions, updatedCase);
        }
      }
    }

    return updatedCase;
  }

  /**
   * Execute action on case
   * @param {string} caseId - Case ID
   * @param {string} actionName - Action name
   * @param {Object} actionData - Action data
   * @returns {Object} Action result
   */
  async executeAction(caseId, actionName, actionData = {}) {
    const currentCase = stateManager.getCase(caseId);
    if (!currentCase) {
      throw new Error(`Case ${caseId} not found`);
    }

    const stageDefinition = getStageDefinition(currentCase.currentStage);

    // Validate action is allowed in current stage
    if (!stageDefinition.actions.includes(actionName)) {
      throw new Error(
        `Action ${actionName} not allowed in stage ${currentCase.currentStage}`
      );
    }

    // Execute action
    const result = await this.executeActionHandler(
      caseId,
      actionName,
      actionData
    );

    // Publish action event
    eventBus.publish('action_executed', {
      caseId,
      actionName,
      actionData,
      result,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  /**
   * Add document to case
   * @param {string} caseId - Case ID
   * @param {Object} document - Document data
   * @returns {Object} Updated case
   */
  async addDocument(caseId, document) {
    const updatedCase = stateManager.addDocument(caseId, document);

    // Execute document upload automations
    await this.executeAutomations(caseId, 'document_uploaded', {
      case: updatedCase,
      document
    });

    return updatedCase;
  }

  /**
   * Add deadline to case
   * @param {string} caseId - Case ID
   * @param {Object} deadline - Deadline data
   * @returns {Object} Updated case
   */
  async addDeadline(caseId, deadline) {
    const updatedCase = stateManager.addDeadline(caseId, deadline);

    // Schedule deadline reminder
    this.scheduleDeadlineReminder(caseId, deadline);

    return updatedCase;
  }

  /**
   * Check deadlines and send reminders
   */
  async checkDeadlines() {
    const allCases = stateManager.getAllCases({ status: 'active' });
    const now = new Date();

    for (const caseItem of allCases) {
      for (const deadline of caseItem.deadlines) {
        if (deadline.status === 'pending') {
          const deadlineDate = new Date(deadline.dueDate);
          const daysUntilDeadline = Math.ceil(
            (deadlineDate - now) / (1000 * 60 * 60 * 24)
          );

          // Check for approaching deadlines (3 days or less)
          if (daysUntilDeadline <= 3 && daysUntilDeadline > 0) {
            eventBus.publish('deadline_approaching', {
              caseId: caseItem.id,
              case: caseItem,
              deadline,
              daysRemaining: daysUntilDeadline
            });
          }

          // Check for overdue deadlines
          if (daysUntilDeadline < 0) {
            eventBus.publish('deadline_overdue', {
              caseId: caseItem.id,
              case: caseItem,
              deadline,
              daysOverdue: Math.abs(daysUntilDeadline)
            });
          }
        }
      }
    }
  }

  /**
   * Validate stage requirements
   * @param {string} caseId - Case ID
   * @param {string} stage - Stage to validate
   */
  async validateStageRequirements(caseId, stage) {
    const currentCase = stateManager.getCase(caseId);
    const stageDefinition = getStageDefinition(stage);

    const missingFields = [];

    // Check required fields
    for (const field of stageDefinition.requiredFields) {
      if (!currentCase.data[field]) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      throw new Error(
        `Missing required fields for ${stage}: ${missingFields.join(', ')}`
      );
    }

    // Execute custom validation rules
    if (this.validationRules.has(stage)) {
      const validator = this.validationRules.get(stage);
      const isValid = await validator(currentCase);
      if (!isValid) {
        throw new Error(`Custom validation failed for stage ${stage}`);
      }
    }

    return true;
  }

  /**
   * Register automation handler
   * @param {string} trigger - Trigger event
   * @param {Function} handler - Handler function
   */
  registerAutomation(trigger, handler) {
    if (!this.automationHandlers.has(trigger)) {
      this.automationHandlers.set(trigger, []);
    }
    this.automationHandlers.get(trigger).push(handler);
  }

  /**
   * Register validation rule
   * @param {string} stage - Stage name
   * @param {Function} validator - Validator function
   */
  registerValidation(stage, validator) {
    this.validationRules.set(stage, validator);
  }

  /**
   * Execute automations for a trigger
   * @private
   */
  async executeAutomations(caseId, trigger, data) {
    if (!this.automationHandlers.has(trigger)) {
      return;
    }

    const handlers = this.automationHandlers.get(trigger);
    for (const handler of handlers) {
      try {
        await handler(caseId, data);
      } catch (error) {
        console.error(`Error executing automation for ${trigger}:`, error);
        eventBus.publish('automation_error', {
          caseId,
          trigger,
          error: error.message
        });
      }
    }
  }

  /**
   * Execute action sequence
   * @private
   */
  async executeActionSequence(caseId, actions, caseData) {
    for (const action of actions) {
      try {
        await this.executeActionHandler(caseId, action, { case: caseData });
      } catch (error) {
        console.error(`Error executing action ${action}:`, error);
      }
    }
  }

  /**
   * Execute action handler
   * @private
   */
  async executeActionHandler(caseId, actionName, actionData) {
    // This is a placeholder for actual action implementations
    // In a real system, this would dispatch to specific action handlers

    console.log(`Executing action: ${actionName} for case ${caseId}`);

    return {
      success: true,
      action: actionName,
      timestamp: new Date().toISOString(),
      data: actionData
    };
  }

  /**
   * Execute hooks
   * @private
   */
  async executeHooks(hookType, data) {
    eventBus.publish(`hook_${hookType}`, data);
  }

  /**
   * Schedule deadline reminder
   * @private
   */
  scheduleDeadlineReminder(caseId, deadline) {
    // In a real system, this would integrate with a job scheduler
    // For now, just publish an event
    eventBus.publish('deadline_scheduled', {
      caseId,
      deadline
    });
  }

  /**
   * Setup default automations
   * @private
   */
  setupDefaultAutomations() {
    // Default automation: Log case creation
    this.registerAutomation('case_created', async (caseId, data) => {
      console.log(`Case created: ${caseId}`);
    });

    // Default automation: Log stage changes
    eventBus.subscribe('stage_change', (event) => {
      console.log(
        `Stage changed for case ${event.data.caseId}: ${event.data.fromStage} -> ${event.data.toStage}`
      );
    });

    // Default automation: Log document uploads
    eventBus.subscribe('document_upload', (event) => {
      console.log(
        `Document uploaded for case ${event.data.caseId}: ${event.data.document.name}`
      );
    });
  }

  /**
   * Get pipeline status for a case
   * @param {string} caseId - Case ID
   * @returns {Object} Pipeline status
   */
  getPipelineStatus(caseId) {
    const caseData = stateManager.getCase(caseId);
    if (!caseData) {
      throw new Error(`Case ${caseId} not found`);
    }

    const matterType = getMatterType(caseData.matterType);
    const stages = getStagesForMatterType(caseData.matterType);
    const currentStageIndex = stages.indexOf(caseData.currentStage);

    return {
      caseId,
      matterType: caseData.matterType,
      currentStage: caseData.currentStage,
      currentStageIndex,
      totalStages: stages.length,
      progress: ((currentStageIndex + 1) / stages.length) * 100,
      stages: stages.map((stage, index) => ({
        stage,
        definition: getStageDefinition(stage),
        status:
          index < currentStageIndex
            ? 'completed'
            : index === currentStageIndex
            ? 'active'
            : 'pending',
        canTransition: index === currentStageIndex + 1
      })),
      history: stateManager.getCaseHistory(caseId)
    };
  }
}

// Create singleton instance
const pipelineExecutor = new PipelineExecutor();

module.exports = pipelineExecutor;
module.exports.PipelineExecutor = PipelineExecutor;
