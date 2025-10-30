/**
 * Basic Usage Examples
 * Demonstrates how to use the case management system
 */

const pipelineExecutor = require('../pipelines/engine/PipelineExecutor');
const stateManager = require('../pipelines/engine/StateManager');
const stageTransitionHandler = require('../pipelines/handlers/StageTransitionHandler');
const notificationHandler = require('../pipelines/handlers/NotificationHandler');
const eventBus = require('../pipelines/engine/EventBus');

// Example 1: Create a new personal injury case
async function example1_CreateCase() {
  console.log('\n=== Example 1: Create Personal Injury Case ===\n');

  const newCase = await pipelineExecutor.createCase({
    matterType: 'personal_injury',
    client: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '555-0100'
    },
    assignedTo: 'attorney_smith',
    data: {
      client_name: 'John Doe',
      contact_info: 'john.doe@example.com',
      case_description: 'Motor vehicle accident on Highway 101',
      incident_date: '2024-01-15',
      estimated_value: 75000
    },
    customFields: {
      referral_source: 'Website',
      urgency: 'High'
    }
  });

  console.log('Case created:', newCase.id);
  console.log('Current stage:', newCase.currentStage);
  console.log('Matter type:', newCase.matterType);

  return newCase;
}

// Example 2: Transition through stages
async function example2_TransitionStages(caseId) {
  console.log('\n=== Example 2: Transition Through Stages ===\n');

  // Check available transitions
  const availableTransitions = stageTransitionHandler.getAvailableTransitions(caseId);
  console.log('Available transitions:');
  availableTransitions.forEach(t => {
    console.log(`  - ${t.name} (${t.allowed ? 'allowed' : 'not allowed'})`);
    if (!t.allowed) {
      console.log(`    Reason: ${t.reason}`);
    }
  });

  // Prepare case data for transition
  const currentCase = stateManager.getCase(caseId);
  currentCase.data.investigator_assigned = 'investigator_jones';

  stateManager.updateCase(caseId, {
    data: currentCase.data
  });

  // Transition to investigation
  console.log('\nTransitioning to investigation stage...');
  const result = await stageTransitionHandler.executeTransition(
    caseId,
    'investigation',
    { notes: 'Starting investigation phase' }
  );

  console.log('Transition successful!');
  console.log('New stage:', result.case.currentStage);
}

// Example 3: Add documents and deadlines
async function example3_AddDocumentsAndDeadlines(caseId) {
  console.log('\n=== Example 3: Add Documents and Deadlines ===\n');

  // Add document
  const document = await pipelineExecutor.addDocument(caseId, {
    name: 'Police Report',
    type: 'police_report',
    url: '/documents/police-report-12345.pdf',
    uploadedBy: 'attorney_smith',
    size: 245678,
    mimeType: 'application/pdf'
  });

  console.log('Document added:', document.documents[document.documents.length - 1].name);

  // Add deadline
  const deadline = await pipelineExecutor.addDeadline(caseId, {
    title: 'Demand Letter Due',
    description: 'Send demand letter to insurance company',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    priority: 'high',
    assignedTo: 'attorney_smith'
  });

  console.log('Deadline added:', deadline.deadlines[deadline.deadlines.length - 1].title);
}

// Example 4: Subscribe to events
function example4_SubscribeToEvents(caseId) {
  console.log('\n=== Example 4: Subscribe to Events ===\n');

  // Subscribe to stage changes
  const unsubscribeStageChange = eventBus.subscribe('stage_change', (event) => {
    console.log(`[EVENT] Stage changed for case ${event.data.caseId}:`);
    console.log(`  From: ${event.data.fromStage}`);
    console.log(`  To: ${event.data.toStage}`);
  });

  // Subscribe to document uploads
  const unsubscribeDocUpload = eventBus.subscribe('document_upload', (event) => {
    console.log(`[EVENT] Document uploaded for case ${event.data.caseId}:`);
    console.log(`  Document: ${event.data.document.name}`);
  });

  // Subscribe to all events for a specific case
  const unsubscribeAll = eventBus.subscribe('*', (event) => {
    if (event.data.caseId === caseId) {
      console.log(`[EVENT] ${event.name} - Case ${event.data.caseId}`);
    }
  });

  console.log('Subscribed to events!');

  // Return unsubscribe functions for cleanup
  return {
    unsubscribeStageChange,
    unsubscribeDocUpload,
    unsubscribeAll
  };
}

// Example 5: Get pipeline status
function example5_GetPipelineStatus(caseId) {
  console.log('\n=== Example 5: Get Pipeline Status ===\n');

  const pipelineStatus = pipelineExecutor.getPipelineStatus(caseId);

  console.log('Case ID:', pipelineStatus.caseId);
  console.log('Matter Type:', pipelineStatus.matterType);
  console.log('Current Stage:', pipelineStatus.currentStage);
  console.log('Progress:', `${pipelineStatus.progress.toFixed(1)}%`);
  console.log('\nStages:');

  pipelineStatus.stages.forEach((stage, index) => {
    const statusIcon =
      stage.status === 'completed' ? '✓' :
      stage.status === 'active' ? '●' :
      '○';

    console.log(
      `  ${statusIcon} ${stage.definition.name} (${stage.status})`
    );
  });

  console.log('\nHistory:');
  pipelineStatus.history.slice(-5).forEach(entry => {
    console.log(`  - ${entry.type} at ${entry.timestamp}`);
  });
}

// Example 6: Statistics and analytics
function example6_GetStatistics() {
  console.log('\n=== Example 6: Statistics ===\n');

  const stats = stateManager.getStats();

  console.log('Total cases:', stats.total);
  console.log('Active cases:', stats.active);
  console.log('Closed cases:', stats.closed);

  console.log('\nBy Matter Type:');
  Object.entries(stats.byMatterType).forEach(([type, count]) => {
    console.log(`  - ${type}: ${count}`);
  });

  console.log('\nBy Stage:');
  Object.entries(stats.byStage).forEach(([stage, count]) => {
    console.log(`  - ${stage}: ${count}`);
  });

  console.log('\nBy Assignee:');
  Object.entries(stats.byAssignee).forEach(([assignee, count]) => {
    console.log(`  - ${assignee}: ${count}`);
  });
}

// Example 7: Custom automations
function example7_RegisterCustomAutomation() {
  console.log('\n=== Example 7: Custom Automations ===\n');

  // Register automation for when case enters demand stage
  pipelineExecutor.registerAutomation('on_demand_enter', async (caseId, data) => {
    console.log(`[AUTOMATION] Case ${caseId} entered demand stage`);
    console.log('  - Generating demand letter template...');
    console.log('  - Notifying client about demand process...');
    console.log('  - Setting response deadline (30 days)...');

    // Add a deadline
    await pipelineExecutor.addDeadline(caseId, {
      title: 'Response to Demand',
      description: 'Deadline for response to demand letter',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      priority: 'high'
    });
  });

  console.log('Custom automation registered!');
}

// Example 8: Notification handling
function example8_NotificationHandling(caseId) {
  console.log('\n=== Example 8: Notification Handling ===\n');

  // Subscribe user to case notifications
  notificationHandler.subscribe('user_123', caseId, [
    'stage_change',
    'document_upload',
    'deadline_approaching'
  ]);

  console.log('User subscribed to case notifications');

  // Register custom notification channel
  notificationHandler.registerChannel('slack', async (notification) => {
    console.log('[SLACK] Sending notification:');
    console.log(`  Subject: ${notification.subject}`);
    console.log(`  Recipients: ${notification.recipients.join(', ')}`);
  });

  console.log('Custom notification channel registered');
}

// Run all examples
async function runAllExamples() {
  try {
    // Example 1: Create case
    const newCase = await example1_CreateCase();

    // Example 4: Subscribe to events (before making changes)
    const subscriptions = example4_SubscribeToEvents(newCase.id);

    // Example 7: Register custom automation
    example7_RegisterCustomAutomation();

    // Example 8: Setup notifications
    example8_NotificationHandling(newCase.id);

    // Wait a bit for event subscriptions to be ready
    await new Promise(resolve => setTimeout(resolve, 100));

    // Example 2: Transition stages
    await example2_TransitionStages(newCase.id);

    // Example 3: Add documents and deadlines
    await example3_AddDocumentsAndDeadlines(newCase.id);

    // Example 5: Get pipeline status
    example5_GetPipelineStatus(newCase.id);

    // Example 6: Get statistics
    example6_GetStatistics();

    console.log('\n=== All Examples Complete! ===\n');

    // Cleanup subscriptions
    subscriptions.unsubscribeStageChange();
    subscriptions.unsubscribeDocUpload();
    subscriptions.unsubscribeAll();

  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run if called directly
if (require.main === module) {
  runAllExamples();
}

module.exports = {
  example1_CreateCase,
  example2_TransitionStages,
  example3_AddDocumentsAndDeadlines,
  example4_SubscribeToEvents,
  example5_GetPipelineStatus,
  example6_GetStatistics,
  example7_RegisterCustomAutomation,
  example8_NotificationHandling,
  runAllExamples
};
