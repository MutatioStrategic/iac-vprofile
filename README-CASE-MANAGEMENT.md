# Case Management Pipeline System

A comprehensive, event-driven case management system with dynamic pipeline execution, real-time notifications, and generic React components for visualization.

## 🎯 Overview

This system provides a **registry-based architecture** where matter types (case types) are defined declaratively, and the pipeline engine executes them dynamically. It's designed for law firms, legal departments, and any organization that manages cases through defined stages.

### Key Features

- **🔧 Registry-Based**: Single source of truth for matter type definitions
- **⚡ Dynamic Pipeline Creation**: Pipelines constructed at runtime from registry
- **📡 Real-time Events**: Built-in event bus for live updates
- **🔄 State Machine**: Explicit case progression with validation
- **🎨 Generic Components**: Reusable React components for any matter type
- **🔔 Smart Notifications**: Automated alerts and reminders
- **📊 Analytics**: Built-in statistics and progress tracking
- **🔌 API-First**: REST API with SSE support for real-time updates

## 📁 Project Structure

```
src/
├── pipelines/
│   ├── registry/
│   │   ├── matterTypes.js          # Matter type definitions (5 types included)
│   │   └── stageDefinitions.js     # Reusable stage configurations
│   ├── engine/
│   │   ├── PipelineExecutor.js     # Main orchestrator
│   │   ├── StateManager.js         # Case state management
│   │   └── EventBus.js             # Event publishing/subscription
│   └── handlers/
│       ├── StageTransitionHandler.js   # Stage transition logic
│       └── NotificationHandler.js      # Notification management
├── components/
│   └── pipeline/
│       ├── PipelineView.jsx        # Main pipeline view
│       ├── StageCard.jsx           # Stage visualization
│       ├── CaseTimeline.jsx        # Timeline component
│       └── Pipeline.css            # Comprehensive styling
├── api/
│   ├── CaseAPI.js                  # REST API endpoints
│   └── server.js                   # Express server
└── examples/
    ├── basicUsage.js               # Node.js examples
    └── reactExample.jsx            # React integration example
```

## 🚀 Quick Start

### Installation

```bash
# Clone or navigate to the project
cd iac-vprofile

# Install dependencies (if package.json exists, or add these):
npm install express cors
# For React components:
npm install react react-dom
```

### Running Examples

#### 1. Basic Node.js Usage

```bash
node src/examples/basicUsage.js
```

This will demonstrate:
- Creating a case
- Transitioning through stages
- Adding documents and deadlines
- Event subscriptions
- Pipeline status
- Statistics

#### 2. Start API Server

```bash
node src/api/server.js
```

Server will start on `http://localhost:3000`

#### 3. React Application

Import and use the components in your React app:

```jsx
import CaseManagementApp from './src/examples/reactExample';
import './src/components/pipeline/Pipeline.css';

function App() {
  return <CaseManagementApp />;
}
```

## 📋 Matter Types

The system comes with 5 pre-configured matter types:

### 1. Personal Injury
**Stages**: intake → investigation → demand → litigation → settlement

**Use Cases**: Motor vehicle accidents, slip and fall, medical malpractice

### 2. Family Law
**Stages**: consultation → filing → discovery → mediation → trial → post_decree

**Use Cases**: Divorce, custody, child support

### 3. Criminal Defense
**Stages**: arraignment → discovery → pretrial_motions → plea_negotiation → trial → sentencing

**Use Cases**: Criminal charges, DUI/DWI

### 4. Real Estate
**Stages**: contract_review → title_search → inspection → financing → closing_prep → closing

**Use Cases**: Property transactions, closings

### 5. Corporate
**Stages**: intake → document_prep → review → negotiation → execution → compliance

**Use Cases**: Entity formation, contracts, compliance

## 🔧 Core Concepts

### 1. Registry-Based Architecture

Matter types are defined in a single location (`pipelines/registry/matterTypes.js`):

```javascript
const matterTypes = {
  personal_injury: {
    stages: ["intake", "investigation", "demand", "litigation", "settlement"],
    documents: ["medical_records", "police_report", "settlement_agreement"],
    notifications: ["client_update", "deadline_reminder"],
    permissions: {
      lawyer: ["read", "write", "approve", "delete"],
      paralegal: ["read", "write"],
      client: ["read"]
    },
    realtime_events: ["stage_change", "document_upload", "deadline_approaching"],
    automations: {
      on_intake_complete: ["send_welcome_email", "assign_investigator"]
    }
  }
}
```

### 2. Pipeline Execution

The `PipelineExecutor` orchestrates case flow:

```javascript
const pipelineExecutor = require('./pipelines/engine/PipelineExecutor');

// Create case
const newCase = await pipelineExecutor.createCase({
  matterType: 'personal_injury',
  client: { name: 'John Doe', email: 'john@example.com' },
  assignedTo: 'attorney_smith'
});

// Transition stage
await pipelineExecutor.executeTransition(
  newCase.id,
  'investigation',
  { notes: 'Starting investigation' }
);
```

### 3. Event-Driven Updates

Subscribe to events for real-time updates:

```javascript
const eventBus = require('./pipelines/engine/EventBus');

// Subscribe to stage changes
eventBus.subscribe('stage_change', (event) => {
  console.log(`Case ${event.data.caseId} moved to ${event.data.toStage}`);
});

// Subscribe to all events
eventBus.subscribe('*', (event) => {
  console.log('Event:', event.name, event.data);
});
```

### 4. State Management

The `StateManager` maintains case state:

```javascript
const stateManager = require('./pipelines/engine/StateManager');

// Get case
const caseData = stateManager.getCase(caseId);

// Update case
stateManager.updateCase(caseId, {
  data: { investigator_assigned: 'investigator_jones' }
});

// Add document
stateManager.addDocument(caseId, {
  name: 'Police Report',
  type: 'police_report',
  url: '/documents/report.pdf'
});
```

## 🌐 REST API

### Cases

```bash
# Create case
POST /api/cases
{
  "matterType": "personal_injury",
  "client": { "name": "John Doe" },
  "assignedTo": "attorney_smith"
}

# Get all cases
GET /api/cases?matterType=personal_injury&status=active

# Get specific case
GET /api/cases/:caseId

# Update case
PATCH /api/cases/:caseId
```

### Stage Transitions

```bash
# Transition stage
POST /api/cases/:caseId/transition
{
  "targetStage": "investigation",
  "metadata": { "notes": "Starting investigation" }
}

# Get available transitions
GET /api/cases/:caseId/transitions
```

### Documents & Deadlines

```bash
# Add document
POST /api/cases/:caseId/documents
{
  "name": "Police Report",
  "type": "police_report",
  "url": "/documents/report.pdf"
}

# Add deadline
POST /api/cases/:caseId/deadlines
{
  "title": "Demand Letter Due",
  "dueDate": "2024-03-15T00:00:00Z",
  "priority": "high"
}
```

### Pipeline Status

```bash
# Get pipeline status
GET /api/cases/:caseId/pipeline

Response:
{
  "caseId": "CASE-123",
  "currentStage": "investigation",
  "progress": 40,
  "stages": [
    {
      "stage": "intake",
      "status": "completed",
      "definition": { ... }
    },
    {
      "stage": "investigation",
      "status": "active",
      "definition": { ... }
    }
  ]
}
```

### Real-time Events (SSE)

```bash
# Subscribe to events
GET /api/events/:caseId

# Client receives:
data: {"name":"stage_change","data":{...},"timestamp":"..."}
data: {"name":"document_upload","data":{...},"timestamp":"..."}
```

## 🎨 React Components

### PipelineView

Main component for visualizing case pipeline:

```jsx
import PipelineView from './components/pipeline/PipelineView';

<PipelineView
  caseId={caseId}
  pipelineData={pipelineData}
  onStageTransition={handleStageTransition}
  onActionExecute={handleActionExecute}
/>
```

### StageCard

Displays individual stage with actions and details:

```jsx
import StageCard from './components/pipeline/StageCard';

<StageCard
  stage="investigation"
  definition={stageDefinition}
  status="active"
  isActive={true}
  canTransition={false}
  onTransition={handleTransition}
/>
```

### CaseTimeline

Timeline visualization of case history:

```jsx
import CaseTimeline from './components/pipeline/CaseTimeline';

<CaseTimeline
  caseId={caseId}
  history={caseHistory}
/>
```

## 🔔 Notifications

### Subscribe to Case Notifications

```javascript
const notificationHandler = require('./pipelines/handlers/NotificationHandler');

// Subscribe user to case
notificationHandler.subscribe('user_123', caseId, [
  'stage_change',
  'document_upload',
  'deadline_approaching'
]);
```

### Custom Notification Channels

```javascript
// Register Slack channel
notificationHandler.registerChannel('slack', async (notification) => {
  // Send to Slack API
  await slackClient.sendMessage({
    channel: '#legal-cases',
    text: notification.subject
  });
});
```

### Custom Templates

```javascript
// Register custom template
notificationHandler.registerTemplate('custom_event', {
  subject: 'Custom Event for Case {{caseId}}',
  body: 'Details: {{details}}'
});
```

## 🔄 Automations

### Register Custom Automations

```javascript
const pipelineExecutor = require('./pipelines/engine/PipelineExecutor');

// Automation when case enters demand stage
pipelineExecutor.registerAutomation('on_demand_enter', async (caseId, data) => {
  // Generate demand letter
  await generateDemandLetter(caseId);

  // Set response deadline
  await pipelineExecutor.addDeadline(caseId, {
    title: 'Response to Demand',
    dueDate: addDays(new Date(), 30),
    priority: 'high'
  });

  // Notify client
  await notifyClient(caseId, 'demand_sent');
});
```

### Custom Validation Rules

```javascript
const stageTransitionHandler = require('./pipelines/handlers/StageTransitionHandler');

// Rule: Can't close case without outcome
stageTransitionHandler.registerRule('litigation', 'closed', (caseData) => {
  if (!caseData.data.outcome) {
    return {
      allowed: false,
      reason: 'Must specify case outcome before closing'
    };
  }
  return { allowed: true };
});
```

## 📊 Analytics

### Case Statistics

```javascript
const stateManager = require('./pipelines/engine/StateManager');

const stats = stateManager.getStats();
console.log('Total cases:', stats.total);
console.log('Active cases:', stats.active);
console.log('By matter type:', stats.byMatterType);
console.log('By stage:', stats.byStage);
```

### Stage Duration Analytics

```javascript
const stageTransitionHandler = require('./pipelines/handlers/StageTransitionHandler');

const avgTime = stageTransitionHandler.calculateAverageTimeInStage(
  'personal_injury',
  'investigation'
);
console.log(`Average time in investigation: ${avgTime.average} days`);
```

## 🔒 Permissions

Permissions are defined per matter type and role:

```javascript
const { hasPermission } = require('./pipelines/registry/matterTypes');

// Check permission
if (hasPermission('personal_injury', 'paralegal', 'write')) {
  // Allow action
}
```

Roles:
- **lawyer**: Full access
- **paralegal**: Read/write (no delete)
- **client**: Read-only
- **admin**: Full access + management

## 🛠️ Extending the System

### Add New Matter Type

Edit `src/pipelines/registry/matterTypes.js`:

```javascript
const matterTypes = {
  // ... existing types

  immigration: {
    name: "Immigration",
    stages: ["intake", "filing", "biometrics", "interview", "decision"],
    documents: ["visa_application", "passport", "supporting_docs"],
    notifications: ["interview_scheduled", "decision_received"],
    permissions: {
      lawyer: ["read", "write", "approve", "delete"],
      paralegal: ["read", "write"],
      client: ["read", "upload_documents"]
    },
    realtime_events: ["stage_change", "document_upload", "interview_scheduled"]
  }
};
```

### Add New Stage Definition

Edit `src/pipelines/registry/stageDefinitions.js`:

```javascript
const stageDefinitions = {
  // ... existing stages

  biometrics: {
    name: "Biometrics",
    description: "Biometrics appointment and processing",
    color: "#8B5CF6",
    icon: "fingerprint",
    requiredFields: ["appointment_date", "appointment_location"],
    actions: ["schedule_appointment", "reschedule", "confirm_completion"],
    nextStages: ["interview", "decision"],
    canSkip: false
  }
};
```

## 🧪 Testing

### Manual Testing

```bash
# Run examples
node src/examples/basicUsage.js

# Start server and test API
node src/api/server.js

# Test endpoints
curl http://localhost:3000/api/cases
curl http://localhost:3000/api/matter-types
```

### Integration Testing

Create test cases covering:
- Case creation
- Stage transitions
- Document uploads
- Event publishing
- Notification sending
- Permission checks

## 📝 Best Practices

1. **Always validate transitions** before allowing them
2. **Subscribe to events** for real-time updates
3. **Use automations** for repetitive tasks
4. **Define custom validation rules** for business logic
5. **Log all state changes** for audit trails
6. **Set appropriate permissions** for security
7. **Use SSE** for real-time client updates
8. **Cache pipeline data** to reduce API calls

## 🐛 Troubleshooting

### Case Won't Transition

Check:
1. Required fields are filled: `stageDefinition.requiredFields`
2. Transition is valid: `isValidTransition(currentStage, targetStage)`
3. Custom validation rules pass
4. User has permission

### Events Not Firing

Check:
1. EventBus subscriptions are active
2. Events are being published correctly
3. No errors in event handlers
4. Event names match exactly

### Notifications Not Sending

Check:
1. User is subscribed to case
2. Notification channel is registered
3. Template exists
4. No errors in channel handler

## 📄 License

This case management system is part of the iac-vprofile project.

## 🤝 Contributing

To contribute:
1. Add new matter types to the registry
2. Create reusable stage definitions
3. Implement custom automations
4. Extend notification templates
5. Build additional React components

## 📧 Support

For questions or issues, please refer to the examples in `src/examples/` or review the inline documentation in each module.

---

**Built with ❤️ for modern case management**
