/**
 * Case Management Pipeline System
 * Main entry point
 */

// Engine Components
const PipelineExecutor = require('./pipelines/engine/PipelineExecutor');
const StateManager = require('./pipelines/engine/StateManager');
const EventBus = require('./pipelines/engine/EventBus');

// Handlers
const StageTransitionHandler = require('./pipelines/handlers/StageTransitionHandler');
const NotificationHandler = require('./pipelines/handlers/NotificationHandler');

// Registry
const MatterTypes = require('./pipelines/registry/matterTypes');
const StageDefinitions = require('./pipelines/registry/stageDefinitions');

// API
const CaseAPI = require('./api/CaseAPI');
const server = require('./api/server');

/**
 * Main Case Management System
 */
class CaseManagementSystem {
  constructor() {
    this.executor = PipelineExecutor;
    this.stateManager = StateManager;
    this.eventBus = EventBus;
    this.transitionHandler = StageTransitionHandler;
    this.notificationHandler = NotificationHandler;
    this.matterTypes = MatterTypes;
    this.stageDefinitions = StageDefinitions;
  }

  /**
   * Initialize the system
   */
  async initialize(config = {}) {
    console.log('🚀 Initializing Case Management System...');

    // Apply configuration
    if (config.customMatterTypes) {
      this.registerMatterTypes(config.customMatterTypes);
    }

    if (config.customStages) {
      this.registerStages(config.customStages);
    }

    if (config.automations) {
      this.registerAutomations(config.automations);
    }

    if (config.notificationChannels) {
      this.registerNotificationChannels(config.notificationChannels);
    }

    console.log('✅ Case Management System initialized');

    return this;
  }

  /**
   * Register custom matter types
   */
  registerMatterTypes(matterTypes) {
    Object.assign(this.matterTypes.matterTypes, matterTypes);
  }

  /**
   * Register custom stage definitions
   */
  registerStages(stages) {
    Object.assign(this.stageDefinitions.stageDefinitions, stages);
  }

  /**
   * Register automations
   */
  registerAutomations(automations) {
    Object.entries(automations).forEach(([trigger, handler]) => {
      this.executor.registerAutomation(trigger, handler);
    });
  }

  /**
   * Register notification channels
   */
  registerNotificationChannels(channels) {
    Object.entries(channels).forEach(([name, handler]) => {
      this.notificationHandler.registerChannel(name, handler);
    });
  }

  /**
   * Create a new case
   */
  async createCase(caseData) {
    return this.executor.createCase(caseData);
  }

  /**
   * Get case by ID
   */
  getCase(caseId) {
    return this.stateManager.getCase(caseId);
  }

  /**
   * Transition case stage
   */
  async transitionStage(caseId, targetStage, metadata) {
    return this.transitionHandler.executeTransition(caseId, targetStage, metadata);
  }

  /**
   * Get pipeline status
   */
  getPipelineStatus(caseId) {
    return this.executor.getPipelineStatus(caseId);
  }

  /**
   * Get system statistics
   */
  getStats() {
    return this.stateManager.getStats();
  }

  /**
   * Subscribe to events
   */
  subscribe(eventName, callback) {
    return this.eventBus.subscribe(eventName, callback);
  }

  /**
   * Start API server
   */
  async startServer(port = 3000) {
    return new Promise((resolve) => {
      server.listen(port, () => {
        console.log(`📡 API Server running on port ${port}`);
        console.log(`   Health check: http://localhost:${port}/health`);
        console.log(`   API endpoint: http://localhost:${port}/api`);
        resolve(server);
      });
    });
  }
}

// Create singleton instance
const caseManagementSystem = new CaseManagementSystem();

// Export modules
module.exports = caseManagementSystem;
module.exports.CaseManagementSystem = CaseManagementSystem;
module.exports.PipelineExecutor = PipelineExecutor;
module.exports.StateManager = StateManager;
module.exports.EventBus = EventBus;
module.exports.StageTransitionHandler = StageTransitionHandler;
module.exports.NotificationHandler = NotificationHandler;
module.exports.MatterTypes = MatterTypes;
module.exports.StageDefinitions = StageDefinitions;
module.exports.CaseAPI = CaseAPI;

// Example usage if run directly
if (require.main === module) {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     Case Management Pipeline System                      ║
║     Version 1.0.0                                         ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

Available commands:
  npm start              Start API server
  npm run example        Run usage examples

Usage in code:
  const cms = require('./src');

  // Initialize
  await cms.initialize();

  // Create case
  const newCase = await cms.createCase({
    matterType: 'personal_injury',
    client: { name: 'John Doe' }
  });

  // Start server
  await cms.startServer(3000);

For more information, see README-CASE-MANAGEMENT.md
  `);
}
