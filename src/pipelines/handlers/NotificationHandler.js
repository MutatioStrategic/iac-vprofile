/**
 * Notification Handler
 * Manages notifications and alerts for case events
 */

const eventBus = require('../engine/EventBus');
const stateManager = require('../engine/StateManager');
const { getMatterType } = require('../registry/matterTypes');

class NotificationHandler {
  constructor() {
    this.notificationQueue = [];
    this.notificationTemplates = new Map();
    this.notificationChannels = new Map();
    this.subscribers = new Map();
    this.setupDefaultTemplates();
    this.setupEventListeners();
  }

  /**
   * Send notification
   * @param {Object} notification - Notification data
   * @returns {Object} Notification result
   */
  async sendNotification(notification) {
    const {
      caseId,
      type,
      recipients,
      data = {},
      channels = ['email'],
      priority = 'normal'
    } = notification;

    // Get template
    const template = this.getTemplate(type);
    if (!template) {
      throw new Error(`Notification template '${type}' not found`);
    }

    // Prepare notification
    const preparedNotification = {
      id: this._generateNotificationId(),
      caseId,
      type,
      recipients,
      subject: this._renderTemplate(template.subject, data),
      body: this._renderTemplate(template.body, data),
      channels,
      priority,
      status: 'pending',
      createdAt: new Date().toISOString(),
      data
    };

    // Add to queue
    this.notificationQueue.push(preparedNotification);

    // Send through channels
    for (const channel of channels) {
      await this.sendThroughChannel(channel, preparedNotification);
    }

    // Publish event
    eventBus.publish('notification_sent', {
      notification: preparedNotification
    });

    return preparedNotification;
  }

  /**
   * Send through specific channel
   * @private
   */
  async sendThroughChannel(channel, notification) {
    if (!this.notificationChannels.has(channel)) {
      console.warn(`Notification channel '${channel}' not configured`);
      return;
    }

    const channelHandler = this.notificationChannels.get(channel);

    try {
      await channelHandler(notification);
      notification.status = 'sent';
    } catch (error) {
      console.error(`Error sending notification through ${channel}:`, error);
      notification.status = 'failed';
      notification.error = error.message;
    }
  }

  /**
   * Register notification template
   * @param {string} type - Template type
   * @param {Object} template - Template definition
   */
  registerTemplate(type, template) {
    this.notificationTemplates.set(type, template);
  }

  /**
   * Register notification channel
   * @param {string} channel - Channel name
   * @param {Function} handler - Channel handler function
   */
  registerChannel(channel, handler) {
    this.notificationChannels.set(channel, handler);
  }

  /**
   * Get notification template
   * @param {string} type - Template type
   * @returns {Object} Template
   */
  getTemplate(type) {
    return this.notificationTemplates.get(type);
  }

  /**
   * Subscribe user to case notifications
   * @param {string} userId - User ID
   * @param {string} caseId - Case ID
   * @param {Array<string>} eventTypes - Event types to subscribe to
   */
  subscribe(userId, caseId, eventTypes = []) {
    const subscriptionKey = `${userId}_${caseId}`;

    this.subscribers.set(subscriptionKey, {
      userId,
      caseId,
      eventTypes: eventTypes.length > 0 ? eventTypes : ['*'],
      createdAt: new Date().toISOString()
    });
  }

  /**
   * Unsubscribe user from case notifications
   * @param {string} userId - User ID
   * @param {string} caseId - Case ID
   */
  unsubscribe(userId, caseId) {
    const subscriptionKey = `${userId}_${caseId}`;
    this.subscribers.delete(subscriptionKey);
  }

  /**
   * Get subscribers for case and event type
   * @param {string} caseId - Case ID
   * @param {string} eventType - Event type
   * @returns {Array<Object>} Subscribers
   */
  getSubscribers(caseId, eventType) {
    const subscribers = [];

    this.subscribers.forEach((subscription, key) => {
      if (subscription.caseId === caseId) {
        if (
          subscription.eventTypes.includes('*') ||
          subscription.eventTypes.includes(eventType)
        ) {
          subscribers.push(subscription);
        }
      }
    });

    return subscribers;
  }

  /**
   * Send notification to case subscribers
   * @param {string} caseId - Case ID
   * @param {string} eventType - Event type
   * @param {Object} data - Event data
   */
  async notifySubscribers(caseId, eventType, data) {
    const subscribers = this.getSubscribers(caseId, eventType);

    for (const subscription of subscribers) {
      await this.sendNotification({
        caseId,
        type: eventType,
        recipients: [subscription.userId],
        data,
        channels: ['email', 'in_app'],
        priority: this._getPriority(eventType)
      });
    }
  }

  /**
   * Get notification history for case
   * @param {string} caseId - Case ID
   * @returns {Array<Object>} Notification history
   */
  getNotificationHistory(caseId) {
    return this.notificationQueue.filter(n => n.caseId === caseId);
  }

  /**
   * Get pending notifications
   * @returns {Array<Object>} Pending notifications
   */
  getPendingNotifications() {
    return this.notificationQueue.filter(n => n.status === 'pending');
  }

  /**
   * Setup default notification templates
   * @private
   */
  setupDefaultTemplates() {
    // Stage change notification
    this.registerTemplate('stage_change', {
      subject: 'Case {{caseId}} - Stage Updated',
      body: `
        Your case ({{caseId}}) has progressed to a new stage.

        Previous Stage: {{fromStage}}
        Current Stage: {{toStage}}

        {{#if metadata.notes}}
        Notes: {{metadata.notes}}
        {{/if}}

        Please log in to view the latest updates.
      `
    });

    // Document uploaded notification
    this.registerTemplate('document_upload', {
      subject: 'Case {{caseId}} - New Document Uploaded',
      body: `
        A new document has been uploaded to your case ({{caseId}}).

        Document: {{document.name}}
        Type: {{document.type}}
        Uploaded By: {{document.uploadedBy}}
        Uploaded At: {{document.uploadedAt}}

        Please log in to review the document.
      `
    });

    // Deadline reminder notification
    this.registerTemplate('deadline_reminder', {
      subject: 'Case {{caseId}} - Deadline Reminder',
      body: `
        This is a reminder about an upcoming deadline for your case ({{caseId}}).

        Deadline: {{deadline.title}}
        Due Date: {{deadline.dueDate}}
        Days Remaining: {{daysRemaining}}

        {{#if deadline.description}}
        Description: {{deadline.description}}
        {{/if}}

        Please take appropriate action before the deadline.
      `
    });

    // Deadline approaching notification
    this.registerTemplate('deadline_approaching', {
      subject: 'Case {{caseId}} - Deadline Approaching',
      body: `
        URGENT: A deadline is approaching for your case ({{caseId}}).

        Deadline: {{deadline.title}}
        Due Date: {{deadline.dueDate}}
        Days Remaining: {{daysRemaining}}

        Immediate action may be required.
      `
    });

    // Deadline overdue notification
    this.registerTemplate('deadline_overdue', {
      subject: 'Case {{caseId}} - OVERDUE DEADLINE',
      body: `
        URGENT: A deadline has passed for your case ({{caseId}}).

        Deadline: {{deadline.title}}
        Due Date: {{deadline.dueDate}}
        Days Overdue: {{daysOverdue}}

        Please contact your attorney immediately.
      `
    });

    // Case created notification
    this.registerTemplate('case_created', {
      subject: 'New Case Created - {{caseId}}',
      body: `
        A new case has been created.

        Case ID: {{caseId}}
        Matter Type: {{case.matterType}}
        Client: {{case.client.name}}
        Assigned To: {{case.assignedTo}}

        The case is currently in the {{case.currentStage}} stage.
      `
    });

    // Case closed notification
    this.registerTemplate('case_closed', {
      subject: 'Case Closed - {{caseId}}',
      body: `
        Your case ({{caseId}}) has been closed.

        Outcome: {{closeData.outcome}}
        Closed Date: {{case.closedAt}}

        {{#if closeData.notes}}
        Notes: {{closeData.notes}}
        {{/if}}

        Thank you for choosing our services.
      `
    });

    // Settlement offer notification
    this.registerTemplate('settlement_offer', {
      subject: 'Case {{caseId}} - Settlement Offer Received',
      body: `
        A settlement offer has been received for your case ({{caseId}}).

        Offer Amount: {{offer.amount}}
        Terms: {{offer.terms}}
        Response Required By: {{offer.responseDeadline}}

        Please contact your attorney to discuss this offer.
      `
    });

    // Court date scheduled notification
    this.registerTemplate('court_date_scheduled', {
      subject: 'Case {{caseId}} - Court Date Scheduled',
      body: `
        A court date has been scheduled for your case ({{caseId}}).

        Date: {{courtDate.date}}
        Time: {{courtDate.time}}
        Location: {{courtDate.location}}
        Type: {{courtDate.type}}

        {{#if courtDate.notes}}
        Notes: {{courtDate.notes}}
        {{/if}}

        Please mark your calendar and contact your attorney if you have questions.
      `
    });
  }

  /**
   * Setup event listeners
   * @private
   */
  setupEventListeners() {
    // Listen for stage changes
    eventBus.subscribe('stage_change', async (event) => {
      await this.notifySubscribers(
        event.data.caseId,
        'stage_change',
        event.data
      );
    });

    // Listen for document uploads
    eventBus.subscribe('document_upload', async (event) => {
      await this.notifySubscribers(
        event.data.caseId,
        'document_upload',
        event.data
      );
    });

    // Listen for deadline approaching
    eventBus.subscribe('deadline_approaching', async (event) => {
      await this.notifySubscribers(
        event.data.caseId,
        'deadline_approaching',
        event.data
      );
    });

    // Listen for deadline overdue
    eventBus.subscribe('deadline_overdue', async (event) => {
      await this.notifySubscribers(
        event.data.caseId,
        'deadline_overdue',
        event.data
      );
    });

    // Listen for case created
    eventBus.subscribe('case_created', async (event) => {
      const caseData = event.data.case;

      // Notify assigned attorney
      if (caseData.assignedTo) {
        await this.sendNotification({
          caseId: caseData.id,
          type: 'case_created',
          recipients: [caseData.assignedTo],
          data: event.data,
          channels: ['email', 'in_app']
        });
      }
    });

    // Listen for case closed
    eventBus.subscribe('case_closed', async (event) => {
      await this.notifySubscribers(
        event.data.caseId,
        'case_closed',
        event.data
      );
    });
  }

  /**
   * Render template with data
   * @private
   */
  _renderTemplate(template, data) {
    let rendered = template;

    // Simple template rendering (in production, use a proper template engine)
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, data[key]);
    });

    // Handle nested properties (e.g., {{case.currentStage}})
    const nestedRegex = /{{([^}]+)}}/g;
    rendered = rendered.replace(nestedRegex, (match, path) => {
      const value = path.split('.').reduce((obj, prop) => obj?.[prop], data);
      return value !== undefined ? value : match;
    });

    return rendered;
  }

  /**
   * Get priority for event type
   * @private
   */
  _getPriority(eventType) {
    const highPriority = [
      'deadline_overdue',
      'deadline_approaching',
      'court_date_scheduled'
    ];

    return highPriority.includes(eventType) ? 'high' : 'normal';
  }

  /**
   * Generate notification ID
   * @private
   */
  _generateNotificationId() {
    return `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }
}

// Create singleton instance
const notificationHandler = new NotificationHandler();

// Register default channels
notificationHandler.registerChannel('email', async (notification) => {
  // In production, integrate with email service (SendGrid, AWS SES, etc.)
  console.log('📧 Email notification:', {
    to: notification.recipients,
    subject: notification.subject,
    body: notification.body
  });
});

notificationHandler.registerChannel('in_app', async (notification) => {
  // In production, store in database and/or send through WebSocket
  console.log('🔔 In-app notification:', {
    recipients: notification.recipients,
    message: notification.subject
  });
});

notificationHandler.registerChannel('sms', async (notification) => {
  // In production, integrate with SMS service (Twilio, etc.)
  console.log('📱 SMS notification:', {
    to: notification.recipients,
    message: notification.subject
  });
});

module.exports = notificationHandler;
module.exports.NotificationHandler = NotificationHandler;
