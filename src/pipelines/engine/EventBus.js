/**
 * Event Bus for Pipeline Events
 * Handles event publishing and subscription for real-time updates
 */

class EventBus {
  constructor() {
    this.listeners = new Map();
    this.eventHistory = [];
    this.maxHistorySize = 1000;
  }

  /**
   * Subscribe to an event
   * @param {string} eventName - Name of the event
   * @param {Function} callback - Function to call when event is published
   * @returns {Function} Unsubscribe function
   */
  subscribe(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }

    this.listeners.get(eventName).push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(eventName);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to multiple events at once
   * @param {Array<string>} eventNames - Array of event names
   * @param {Function} callback - Function to call when any event is published
   * @returns {Function} Unsubscribe function for all events
   */
  subscribeMultiple(eventNames, callback) {
    const unsubscribers = eventNames.map(eventName =>
      this.subscribe(eventName, callback)
    );

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }

  /**
   * Publish an event
   * @param {string} eventName - Name of the event
   * @param {Object} data - Event data
   */
  publish(eventName, data) {
    const event = {
      name: eventName,
      data,
      timestamp: new Date().toISOString(),
      id: this._generateEventId()
    };

    // Add to history
    this._addToHistory(event);

    // Call all listeners
    if (this.listeners.has(eventName)) {
      this.listeners.get(eventName).forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error(`Error in event listener for ${eventName}:`, error);
        }
      });
    }

    // Also publish to wildcard listeners
    if (this.listeners.has('*')) {
      this.listeners.get('*').forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('Error in wildcard event listener:', error);
        }
      });
    }
  }

  /**
   * Publish multiple events in sequence
   * @param {Array<Object>} events - Array of {name, data} objects
   */
  publishBatch(events) {
    events.forEach(({ name, data }) => {
      this.publish(name, data);
    });
  }

  /**
   * Get all listeners for an event
   * @param {string} eventName - Name of the event
   * @returns {Array<Function>} Array of listener functions
   */
  getListeners(eventName) {
    return this.listeners.get(eventName) || [];
  }

  /**
   * Remove all listeners for an event
   * @param {string} eventName - Name of the event (optional)
   */
  clearListeners(eventName) {
    if (eventName) {
      this.listeners.delete(eventName);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get event history
   * @param {Object} options - Filter options
   * @returns {Array<Object>} Array of events
   */
  getHistory(options = {}) {
    let history = [...this.eventHistory];

    if (options.eventName) {
      history = history.filter(e => e.name === options.eventName);
    }

    if (options.since) {
      history = history.filter(e => new Date(e.timestamp) >= new Date(options.since));
    }

    if (options.limit) {
      history = history.slice(-options.limit);
    }

    return history;
  }

  /**
   * Clear event history
   */
  clearHistory() {
    this.eventHistory = [];
  }

  /**
   * Get event statistics
   * @returns {Object} Event statistics
   */
  getStats() {
    const stats = {
      totalEvents: this.eventHistory.length,
      totalListeners: 0,
      eventCounts: {},
      listenerCounts: {}
    };

    // Count listeners
    this.listeners.forEach((callbacks, eventName) => {
      stats.totalListeners += callbacks.length;
      stats.listenerCounts[eventName] = callbacks.length;
    });

    // Count events by type
    this.eventHistory.forEach(event => {
      if (!stats.eventCounts[event.name]) {
        stats.eventCounts[event.name] = 0;
      }
      stats.eventCounts[event.name]++;
    });

    return stats;
  }

  /**
   * Wait for a specific event
   * @param {string} eventName - Name of the event
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<Object>} Promise that resolves with event data
   */
  waitFor(eventName, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        unsubscribe();
        reject(new Error(`Timeout waiting for event: ${eventName}`));
      }, timeout);

      const unsubscribe = this.subscribe(eventName, (event) => {
        clearTimeout(timer);
        unsubscribe();
        resolve(event);
      });
    });
  }

  /**
   * Add event to history
   * @private
   */
  _addToHistory(event) {
    this.eventHistory.push(event);

    // Maintain max history size
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Generate unique event ID
   * @private
   */
  _generateEventId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Create singleton instance
const eventBus = new EventBus();

module.exports = eventBus;
module.exports.EventBus = EventBus;
