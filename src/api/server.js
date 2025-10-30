/**
 * Express Server Setup
 * API server for case management system
 */

const express = require('express');
const cors = require('cors');
const caseAPI = require('./CaseAPI');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Case routes
app.post('/api/cases', (req, res) => caseAPI.createCase(req, res));
app.get('/api/cases', (req, res) => caseAPI.getAllCases(req, res));
app.get('/api/cases/:caseId', (req, res) => caseAPI.getCase(req, res));
app.patch('/api/cases/:caseId', (req, res) => caseAPI.updateCase(req, res));

// Stage transition routes
app.post('/api/cases/:caseId/transition', (req, res) => caseAPI.transitionStage(req, res));
app.get('/api/cases/:caseId/transitions', (req, res) => caseAPI.getAvailableTransitions(req, res));

// Action routes
app.post('/api/cases/:caseId/actions', (req, res) => caseAPI.executeAction(req, res));

// Document routes
app.post('/api/cases/:caseId/documents', (req, res) => caseAPI.addDocument(req, res));

// Deadline routes
app.post('/api/cases/:caseId/deadlines', (req, res) => caseAPI.addDeadline(req, res));

// Note routes
app.post('/api/cases/:caseId/notes', (req, res) => caseAPI.addNote(req, res));

// History routes
app.get('/api/cases/:caseId/history', (req, res) => caseAPI.getCaseHistory(req, res));

// Pipeline routes
app.get('/api/cases/:caseId/pipeline', (req, res) => caseAPI.getPipelineStatus(req, res));

// Case lifecycle routes
app.post('/api/cases/:caseId/close', (req, res) => caseAPI.closeCase(req, res));
app.post('/api/cases/:caseId/reopen', (req, res) => caseAPI.reopenCase(req, res));

// Statistics routes
app.get('/api/stats', (req, res) => caseAPI.getStats(req, res));

// Matter type routes
app.get('/api/matter-types', (req, res) => caseAPI.getMatterTypes(req, res));
app.get('/api/matter-types/:typeKey', (req, res) => caseAPI.getMatterType(req, res));

// Stage definition routes
app.get('/api/stages', (req, res) => caseAPI.getStageDefinitions(req, res));

// Notification routes
app.post('/api/cases/:caseId/subscribe', (req, res) => caseAPI.subscribeToNotifications(req, res));
app.post('/api/cases/:caseId/unsubscribe', (req, res) => caseAPI.unsubscribeFromNotifications(req, res));

// Event stream (SSE)
app.get('/api/events/:caseId', (req, res) => caseAPI.getEventStream(req, res));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Case Management API Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`API docs: http://localhost:${PORT}/api`);
  });
}

module.exports = app;
