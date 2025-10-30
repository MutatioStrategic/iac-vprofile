/**
 * State Manager for Case Pipeline
 * Manages case state, transitions, and persistence
 */

const eventBus = require('./EventBus');
const { isValidTransition } = require('../registry/stageDefinitions');

class StateManager {
  constructor() {
    this.cases = new Map();
    this.stateHistory = new Map();
  }

  /**
   * Initialize a new case
   * @param {Object} caseData - Case initialization data
   * @returns {Object} Initialized case
   */
  initializeCase(caseData) {
    const caseId = caseData.id || this._generateCaseId();

    const initialCase = {
      id: caseId,
      matterType: caseData.matterType,
      currentStage: caseData.initialStage || 'intake',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: caseData.metadata || {},
      data: caseData.data || {},
      assignedTo: caseData.assignedTo || null,
      client: caseData.client || {},
      documents: [],
      notes: [],
      deadlines: [],
      customFields: caseData.customFields || {}
    };

    this.cases.set(caseId, initialCase);
    this._addToHistory(caseId, {
      type: 'case_created',
      stage: initialCase.currentStage,
      timestamp: initialCase.createdAt,
      data: initialCase
    });

    eventBus.publish('case_created', {
      caseId,
      case: initialCase
    });

    return initialCase;
  }

  /**
   * Get case by ID
   * @param {string} caseId - Case ID
   * @returns {Object|null} Case object or null
   */
  getCase(caseId) {
    return this.cases.get(caseId) || null;
  }

  /**
   * Get all cases
   * @param {Object} filter - Filter criteria
   * @returns {Array<Object>} Array of cases
   */
  getAllCases(filter = {}) {
    let cases = Array.from(this.cases.values());

    if (filter.matterType) {
      cases = cases.filter(c => c.matterType === filter.matterType);
    }

    if (filter.status) {
      cases = cases.filter(c => c.status === filter.status);
    }

    if (filter.currentStage) {
      cases = cases.filter(c => c.currentStage === filter.currentStage);
    }

    if (filter.assignedTo) {
      cases = cases.filter(c => c.assignedTo === filter.assignedTo);
    }

    return cases;
  }

  /**
   * Update case data
   * @param {string} caseId - Case ID
   * @param {Object} updates - Updates to apply
   * @returns {Object} Updated case
   */
  updateCase(caseId, updates) {
    const existingCase = this.getCase(caseId);
    if (!existingCase) {
      throw new Error(`Case ${caseId} not found`);
    }

    const updatedCase = {
      ...existingCase,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.cases.set(caseId, updatedCase);

    this._addToHistory(caseId, {
      type: 'case_updated',
      stage: updatedCase.currentStage,
      timestamp: updatedCase.updatedAt,
      updates
    });

    eventBus.publish('case_updated', {
      caseId,
      case: updatedCase,
      updates
    });

    return updatedCase;
  }

  /**
   * Transition case to new stage
   * @param {string} caseId - Case ID
   * @param {string} newStage - New stage
   * @param {Object} metadata - Transition metadata
   * @returns {Object} Updated case
   */
  transitionStage(caseId, newStage, metadata = {}) {
    const existingCase = this.getCase(caseId);
    if (!existingCase) {
      throw new Error(`Case ${caseId} not found`);
    }

    const currentStage = existingCase.currentStage;

    // Validate transition
    if (!isValidTransition(currentStage, newStage)) {
      throw new Error(
        `Invalid transition from ${currentStage} to ${newStage}`
      );
    }

    const updatedCase = {
      ...existingCase,
      currentStage: newStage,
      previousStage: currentStage,
      updatedAt: new Date().toISOString()
    };

    this.cases.set(caseId, updatedCase);

    this._addToHistory(caseId, {
      type: 'stage_transition',
      fromStage: currentStage,
      toStage: newStage,
      timestamp: updatedCase.updatedAt,
      metadata
    });

    eventBus.publish('stage_change', {
      caseId,
      case: updatedCase,
      fromStage: currentStage,
      toStage: newStage,
      metadata
    });

    return updatedCase;
  }

  /**
   * Add document to case
   * @param {string} caseId - Case ID
   * @param {Object} document - Document data
   * @returns {Object} Updated case
   */
  addDocument(caseId, document) {
    const existingCase = this.getCase(caseId);
    if (!existingCase) {
      throw new Error(`Case ${caseId} not found`);
    }

    const doc = {
      id: this._generateDocumentId(),
      ...document,
      uploadedAt: new Date().toISOString()
    };

    const updatedCase = {
      ...existingCase,
      documents: [...existingCase.documents, doc],
      updatedAt: new Date().toISOString()
    };

    this.cases.set(caseId, updatedCase);

    this._addToHistory(caseId, {
      type: 'document_added',
      stage: updatedCase.currentStage,
      timestamp: updatedCase.updatedAt,
      document: doc
    });

    eventBus.publish('document_upload', {
      caseId,
      case: updatedCase,
      document: doc
    });

    return updatedCase;
  }

  /**
   * Add note to case
   * @param {string} caseId - Case ID
   * @param {Object} note - Note data
   * @returns {Object} Updated case
   */
  addNote(caseId, note) {
    const existingCase = this.getCase(caseId);
    if (!existingCase) {
      throw new Error(`Case ${caseId} not found`);
    }

    const noteWithMeta = {
      id: this._generateNoteId(),
      ...note,
      createdAt: new Date().toISOString()
    };

    const updatedCase = {
      ...existingCase,
      notes: [...existingCase.notes, noteWithMeta],
      updatedAt: new Date().toISOString()
    };

    this.cases.set(caseId, updatedCase);

    return updatedCase;
  }

  /**
   * Add deadline to case
   * @param {string} caseId - Case ID
   * @param {Object} deadline - Deadline data
   * @returns {Object} Updated case
   */
  addDeadline(caseId, deadline) {
    const existingCase = this.getCase(caseId);
    if (!existingCase) {
      throw new Error(`Case ${caseId} not found`);
    }

    const deadlineWithMeta = {
      id: this._generateDeadlineId(),
      ...deadline,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    const updatedCase = {
      ...existingCase,
      deadlines: [...existingCase.deadlines, deadlineWithMeta],
      updatedAt: new Date().toISOString()
    };

    this.cases.set(caseId, updatedCase);

    eventBus.publish('deadline_added', {
      caseId,
      case: updatedCase,
      deadline: deadlineWithMeta
    });

    return updatedCase;
  }

  /**
   * Get case history
   * @param {string} caseId - Case ID
   * @returns {Array<Object>} Case history
   */
  getCaseHistory(caseId) {
    return this.stateHistory.get(caseId) || [];
  }

  /**
   * Close case
   * @param {string} caseId - Case ID
   * @param {Object} closeData - Close data
   * @returns {Object} Closed case
   */
  closeCase(caseId, closeData = {}) {
    const existingCase = this.getCase(caseId);
    if (!existingCase) {
      throw new Error(`Case ${caseId} not found`);
    }

    const updatedCase = {
      ...existingCase,
      status: 'closed',
      currentStage: 'closed',
      closedAt: new Date().toISOString(),
      closeData,
      updatedAt: new Date().toISOString()
    };

    this.cases.set(caseId, updatedCase);

    this._addToHistory(caseId, {
      type: 'case_closed',
      stage: 'closed',
      timestamp: updatedCase.closedAt,
      data: closeData
    });

    eventBus.publish('case_closed', {
      caseId,
      case: updatedCase,
      closeData
    });

    return updatedCase;
  }

  /**
   * Reopen case
   * @param {string} caseId - Case ID
   * @returns {Object} Reopened case
   */
  reopenCase(caseId) {
    const existingCase = this.getCase(caseId);
    if (!existingCase) {
      throw new Error(`Case ${caseId} not found`);
    }

    if (existingCase.status !== 'closed') {
      throw new Error(`Case ${caseId} is not closed`);
    }

    const updatedCase = {
      ...existingCase,
      status: 'active',
      currentStage: existingCase.previousStage || 'intake',
      reopenedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.cases.set(caseId, updatedCase);

    this._addToHistory(caseId, {
      type: 'case_reopened',
      stage: updatedCase.currentStage,
      timestamp: updatedCase.reopenedAt
    });

    eventBus.publish('case_reopened', {
      caseId,
      case: updatedCase
    });

    return updatedCase;
  }

  /**
   * Get case statistics
   * @returns {Object} Case statistics
   */
  getStats() {
    const cases = Array.from(this.cases.values());

    return {
      total: cases.length,
      active: cases.filter(c => c.status === 'active').length,
      closed: cases.filter(c => c.status === 'closed').length,
      byMatterType: this._groupBy(cases, 'matterType'),
      byStage: this._groupBy(cases.filter(c => c.status === 'active'), 'currentStage'),
      byAssignee: this._groupBy(cases.filter(c => c.status === 'active'), 'assignedTo')
    };
  }

  /**
   * Add to history
   * @private
   */
  _addToHistory(caseId, entry) {
    if (!this.stateHistory.has(caseId)) {
      this.stateHistory.set(caseId, []);
    }
    this.stateHistory.get(caseId).push(entry);
  }

  /**
   * Generate case ID
   * @private
   */
  _generateCaseId() {
    return `CASE-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  /**
   * Generate document ID
   * @private
   */
  _generateDocumentId() {
    return `DOC-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  /**
   * Generate note ID
   * @private
   */
  _generateNoteId() {
    return `NOTE-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  /**
   * Generate deadline ID
   * @private
   */
  _generateDeadlineId() {
    return `DEADLINE-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  /**
   * Group by property
   * @private
   */
  _groupBy(items, property) {
    return items.reduce((acc, item) => {
      const key = item[property] || 'unassigned';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }
}

// Create singleton instance
const stateManager = new StateManager();

module.exports = stateManager;
module.exports.StateManager = StateManager;
