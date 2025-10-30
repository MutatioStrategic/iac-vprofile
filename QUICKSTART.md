# Quick Start Guide

Get up and running with the Case Management Pipeline System in 5 minutes.

## Installation

```bash
# Install dependencies
npm install
```

## Option 1: Run Examples (Fastest Way)

```bash
# Run the basic usage examples
npm run example
```

This will demonstrate:
- ✅ Creating a case
- ✅ Transitioning through stages
- ✅ Adding documents and deadlines
- ✅ Event subscriptions
- ✅ Pipeline status
- ✅ Statistics

## Option 2: Start API Server

```bash
# Start the REST API server
npm start
```

Server starts on `http://localhost:3000`

### Test the API

```bash
# Health check
curl http://localhost:3000/health

# Get all matter types
curl http://localhost:3000/api/matter-types

# Create a case
curl -X POST http://localhost:3000/api/cases \
  -H "Content-Type: application/json" \
  -d '{
    "matterType": "personal_injury",
    "client": {
      "name": "John Doe",
      "email": "john@example.com"
    },
    "assignedTo": "attorney_smith",
    "data": {
      "client_name": "John Doe",
      "contact_info": "john@example.com",
      "case_description": "Motor vehicle accident"
    }
  }'

# Get all cases
curl http://localhost:3000/api/cases

# Get specific case (replace CASE-ID with actual ID from above)
curl http://localhost:3000/api/cases/CASE-ID

# Get pipeline status
curl http://localhost:3000/api/cases/CASE-ID/pipeline
```

## Option 3: Use in Your Code

```javascript
const cms = require('./src');

async function main() {
  // Initialize
  await cms.initialize();

  // Create a case
  const newCase = await cms.createCase({
    matterType: 'personal_injury',
    client: {
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '555-0123'
    },
    assignedTo: 'attorney_brown',
    data: {
      client_name: 'Jane Smith',
      contact_info: 'jane@example.com',
      case_description: 'Slip and fall at grocery store',
      incident_date: '2024-01-20'
    }
  });

  console.log('Case created:', newCase.id);

  // Subscribe to events
  cms.subscribe('stage_change', (event) => {
    console.log('Stage changed:', event.data);
  });

  // Prepare for transition
  cms.stateManager.updateCase(newCase.id, {
    data: {
      ...newCase.data,
      investigator_assigned: 'investigator_wilson'
    }
  });

  // Transition to next stage
  await cms.transitionStage(
    newCase.id,
    'investigation',
    { notes: 'Beginning investigation phase' }
  );

  // Get pipeline status
  const status = cms.getPipelineStatus(newCase.id);
  console.log('Pipeline progress:', status.progress + '%');

  // Get statistics
  const stats = cms.getStats();
  console.log('Total cases:', stats.total);
}

main();
```

## Option 4: React Integration

```jsx
import React, { useState, useEffect } from 'react';
import PipelineView from './src/components/pipeline/PipelineView';
import './src/components/pipeline/Pipeline.css';

function App() {
  const [pipelineData, setPipelineData] = useState(null);
  const caseId = 'CASE-123'; // Your case ID

  useEffect(() => {
    // Fetch pipeline data
    fetch(`http://localhost:3000/api/cases/${caseId}/pipeline`)
      .then(res => res.json())
      .then(data => setPipelineData(data.pipeline));
  }, []);

  const handleStageTransition = async (caseId, targetStage) => {
    await fetch(`http://localhost:3000/api/cases/${caseId}/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetStage })
    });
    // Refresh pipeline data
  };

  const handleActionExecute = async (caseId, actionName, actionData) => {
    await fetch(`http://localhost:3000/api/cases/${caseId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionName, actionData })
    });
  };

  if (!pipelineData) return <div>Loading...</div>;

  return (
    <PipelineView
      caseId={caseId}
      pipelineData={pipelineData}
      onStageTransition={handleStageTransition}
      onActionExecute={handleActionExecute}
    />
  );
}

export default App;
```

## Available Matter Types

Out of the box, the system includes:

1. **personal_injury** - Motor vehicle accidents, slip and fall
2. **family_law** - Divorce, custody, child support
3. **criminal_defense** - Criminal charges, DUI/DWI
4. **real_estate** - Property transactions, closings
5. **corporate** - Entity formation, contracts

## Key API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/cases` | GET | Get all cases |
| `/api/cases` | POST | Create new case |
| `/api/cases/:id` | GET | Get specific case |
| `/api/cases/:id` | PATCH | Update case |
| `/api/cases/:id/transition` | POST | Transition stage |
| `/api/cases/:id/pipeline` | GET | Get pipeline status |
| `/api/cases/:id/documents` | POST | Add document |
| `/api/cases/:id/deadlines` | POST | Add deadline |
| `/api/matter-types` | GET | Get all matter types |
| `/api/stats` | GET | Get statistics |

## Next Steps

1. **Read the full documentation**: [README-CASE-MANAGEMENT.md](./README-CASE-MANAGEMENT.md)
2. **Explore examples**: Check `src/examples/` folder
3. **Customize matter types**: Edit `src/pipelines/registry/matterTypes.js`
4. **Add automations**: See examples in documentation
5. **Build your UI**: Use the React components in `src/components/pipeline/`

## Common Tasks

### Create a custom matter type

Edit `src/pipelines/registry/matterTypes.js`:

```javascript
const matterTypes = {
  // Add your custom type
  immigration: {
    name: "Immigration",
    stages: ["intake", "filing", "biometrics", "interview", "decision"],
    documents: ["visa_application", "passport"],
    // ... rest of configuration
  }
};
```

### Add a custom automation

```javascript
const cms = require('./src');

cms.executor.registerAutomation('case_created', async (caseId, data) => {
  console.log('New case created:', caseId);
  // Send welcome email, assign staff, etc.
});
```

### Subscribe to events

```javascript
cms.eventBus.subscribe('stage_change', (event) => {
  console.log('Stage changed:', event.data);
});

cms.eventBus.subscribe('deadline_approaching', (event) => {
  console.log('Deadline approaching:', event.data);
});
```

## Troubleshooting

### Port already in use
```bash
# Use a different port
PORT=3001 npm start
```

### Module not found
```bash
# Reinstall dependencies
npm install
```

### Can't transition stage
Check that required fields are filled:
```javascript
const transitions = cms.transitionHandler.getAvailableTransitions(caseId);
console.log(transitions); // Shows why transitions are blocked
```

## Getting Help

- Check the [full documentation](./README-CASE-MANAGEMENT.md)
- Review [examples](./src/examples/)
- Look at inline code comments

---

**Ready to build something awesome? Let's go! 🚀**
