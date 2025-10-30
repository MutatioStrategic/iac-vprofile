/**
 * Case Management API
 * REST API interface for case management system
 */

const pipelineExecutor = require('../pipelines/engine/PipelineExecutor');
const stateManager = require('../pipelines/engine/StateManager');
const stageTransitionHandler = require('../pipelines/handlers/StageTransitionHandler');
const notificationHandler = require('../pipelines/handlers/NotificationHandler');
const eventBus = require('../pipelines/engine/EventBus');
const { getAllMatterTypes, getMatterType } = require('../pipelines/registry/matterTypes');
const { getAllStageDefinitions } = require('../pipelines/registry/stageDefinitions');

class CaseAPI {
  /**
   * Create a new case
   * POST /api/cases
   */
  async createCase(req, res) {
    try {
      const { matterType, client, assignedTo, data, customFields } = req.body;

      if (!matterType) {
        return res.status(400).json({
          error: 'Matter type is required'
        });
      }

      const newCase = await pipelineExecutor.createCase({
        matterType,
        client,
        assignedTo,
        data,
        customFields
      });

      res.status(201).json({
        success: true,
        case: newCase
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  }

  /**
   * Get case by ID
   * GET /api/cases/:caseId
   */
  async getCase(req, res) {
    try {
      const { caseId } = req.params;
      const caseData = stateManager.getCase(caseId);

      if (!caseData) {
        return res.status(404).json({
          error: 'Case not found'
        });
      }

      res.json({
        success: true,
        case: caseData
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  }

  /**
   * Get all cases
   * GET /api/cases
   */
  async getAllCases(req, res) {
    try {
      const { matterType, status, currentStage, assignedTo } = req.query;

      const filter = {};
      if (matterType) filter.matterType = matterType;
      if (status) filter.status = status;
      if (currentStage) filter.currentStage = currentStage;
      if (assignedTo) filter.assignedTo = assignedTo;

      const cases = stateManager.getAllCases(filter);

      res.json({
        success: true,
        cases,
        count: cases.length
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  }

  /**
   * Update case
   * PATCH /api/cases/:caseId
   */
  async updateCase(req, res) {
    try {
      const { caseId } = req.params;
      const updates = req.body;

      const updatedCase = stateManager.updateCase(caseId, updates);

      res.json({
        success: true,
        case: updatedCase
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  }

  /**
   * Transition case to new stage
   * POST /api/cases/:caseId/transition
   */
  async transitionStage(req, res) {
    try {
      const { caseId } = req.params;
      const { targetStage, metadata } = req.body;

      if (!targetStage) {
        return res.status(400).json({
          error: 'Target stage is required'
        });
      }

      const result = await stageTransitionHandler.executeTransition(
        caseId,
        targetStage,
        metadata
      );

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      res.status(400).json({
        error: error.message
      });
    }
  }

  /**
   * Get available transitions for case
   * GET /api/cases/:caseId/transitions
   */
  async getAvailableTransitions(req, res) {
    try {
      const { caseId } = req.params;
      const transitions = stageTransitionHandler.getAvailableTransitions(caseId);

      res.json({
        success: true,
        transitions
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  }

  /**
   * Execute action on case
   * POST /api/cases/:caseId/actions
   */
  async executeAction(req, res) {
    try {
      const { caseId } = req.params;
      const { actionName, actionData } = req.body;

      if (!actionName) {
        return res.status(400).json({
          error: 'Action name is required'
        });
      }

      const result = await pipelineExecutor.executeAction(
        caseId,
        actionName,
        actionData
      );

      res.json({
        success: true,
        result
      });
    } catch (error) {
      res.status(400).json({
        error: error.message
      });
    }
  }

  /**
   * Add document to case
   * POST /api/cases/:caseId/documents
   */
  async addDocument(req, res) {
    try {
      const { caseId } = req.params;
      const document = req.body;

      const updatedCase = await pipelineExecutor.addDocument(caseId, document);

      res.status(201).json({
        success: true,
        case: updatedCase
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  }

  /**
   * Add deadline to case
   * POST /api/cases/:caseId/deadlines
   */
  async addDeadline(req, res) {
    try {
      const { caseId } = req.params;
      const deadline = req.body;

      const updatedCase = await pipelineExecutor.addDeadline(caseId, deadline);

      res.status(201).json({
        success: true,
        case: updatedCase
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  }

  /**
   * Add note to case
   * POST /api/cases/:caseId/notes
   */
  async addNote(req, res) {
    try {
      const { caseId } = req.params;
      const note = req.body;

      const updatedCase = stateManager.addNote(caseId, note);

      res.status(201).json({
        success: true,
        case: updatedCase
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  }

  /**
   * Get case history
   * GET /api/cases/:caseId/history
   */
  async getCaseHistory(req, res) {
    try {
      const { caseId } = req.params;
      const history = stateManager.getCaseHistory(caseId);

      res.json({
        success: true,
        history
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  }

  /**
   * Get pipeline status for case
   * GET /api/cases/:caseId/pipeline
   */
  async getPipelineStatus(req, res) {
    try {
      const { caseId } = req.params;
      const pipelineStatus = pipelineExecutor.getPipelineStatus(caseId);

      res.json({
        success: true,
        pipeline: pipelineStatus
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  }

  /**
   * Close case
   * POST /api/cases/:caseId/close
   */
  async closeCase(req, res) {
    try {
      const { caseId } = req.params;
      const closeData = req.body;

      const closedCase = stateManager.closeCase(caseId, closeData);

      res.json({
        success: true,
        case: closedCase
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  }

  /**
   * Reopen case
   * POST /api/cases/:caseId/reopen
   */
  async reopenCase(req, res) {
    try {
      const { caseId } = req.params;

      const reopenedCase = stateManager.reopenCase(caseId);

      res.json({
        success: true,
        case: reopenedCase
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  }

  /**
   * Get case statistics
   * GET /api/stats
   */
  async getStats(req, res) {
    try {
      const stats = stateManager.getStats();

      res.json({
        success: true,
        stats
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  }

  /**
   * Get all matter types
   * GET /api/matter-types
   */
  async getMatterTypes(req, res) {
    try {
      const matterTypes = getAllMatterTypes();

      res.json({
        success: true,
        matterTypes
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  }

  /**
   * Get specific matter type
   * GET /api/matter-types/:typeKey
   */
  async getMatterType(req, res) {
    try {
      const { typeKey } = req.params;
      const matterType = getMatterType(typeKey);

      res.json({
        success: true,
        matterType: {
          key: typeKey,
          ...matterType
        }
      });
    } catch (error) {
      res.status(404).json({
        error: error.message
      });
    }
  }

  /**
   * Get all stage definitions
   * GET /api/stages
   */
  async getStageDefinitions(req, res) {
    try {
      const stages = getAllStageDefinitions();

      res.json({
        success: true,
        stages
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  }

  /**
   * Subscribe to case notifications
   * POST /api/cases/:caseId/subscribe
   */
  async subscribeToNotifications(req, res) {
    try {
      const { caseId } = req.params;
      const { userId, eventTypes } = req.body;

      if (!userId) {
        return res.status(400).json({
          error: 'User ID is required'
        });
      }

      notificationHandler.subscribe(userId, caseId, eventTypes);

      res.json({
        success: true,
        message: 'Subscribed to case notifications'
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  }

  /**
   * Unsubscribe from case notifications
   * POST /api/cases/:caseId/unsubscribe
   */
  async unsubscribeFromNotifications(req, res) {
    try {
      const { caseId } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          error: 'User ID is required'
        });
      }

      notificationHandler.unsubscribe(userId, caseId);

      res.json({
        success: true,
        message: 'Unsubscribed from case notifications'
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  }

  /**
   * Get event stream (SSE)
   * GET /api/events/:caseId
   */
  async getEventStream(req, res) {
    const { caseId } = req.params;

    // Set up SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });

    // Subscribe to all events for this case
    const unsubscribe = eventBus.subscribe('*', (event) => {
      if (event.data.caseId === caseId) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    });

    // Clean up on client disconnect
    req.on('close', () => {
      unsubscribe();
    });
  }
}

module.exports = new CaseAPI();
