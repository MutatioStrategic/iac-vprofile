/**
 * Case Timeline Component
 * Displays case history in a timeline format
 */

import React, { useState } from 'react';

const CaseTimeline = ({ caseId, history = [] }) => {
  const [filter, setFilter] = useState('all');
  const [expandedItems, setExpandedItems] = useState(new Set());

  const getEventIcon = (eventType) => {
    const icons = {
      case_created: '🎯',
      stage_transition: '➡️',
      document_added: '📄',
      case_updated: '✏️',
      case_closed: '✅',
      case_reopened: '🔄',
      default: '•'
    };

    return icons[eventType] || icons.default;
  };

  const getEventColor = (eventType) => {
    const colors = {
      case_created: '#3B82F6',
      stage_transition: '#10B981',
      document_added: '#F59E0B',
      case_updated: '#6366F1',
      case_closed: '#6B7280',
      case_reopened: '#EF4444',
      default: '#9CA3AF'
    };

    return colors[eventType] || colors.default;
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatEventTitle = (event) => {
    switch (event.type) {
      case 'case_created':
        return 'Case Created';
      case 'stage_transition':
        return `Stage: ${event.fromStage} → ${event.toStage}`;
      case 'document_added':
        return `Document Added: ${event.document?.type || 'Unknown'}`;
      case 'case_updated':
        return 'Case Updated';
      case 'case_closed':
        return 'Case Closed';
      case 'case_reopened':
        return 'Case Reopened';
      default:
        return event.type.replace(/_/g, ' ');
    }
  };

  const formatEventDetails = (event) => {
    switch (event.type) {
      case 'stage_transition':
        return event.metadata?.notes || 'No additional notes';
      case 'document_added':
        return `File: ${event.document?.name || 'Unknown'}`;
      case 'case_updated':
        return Object.keys(event.updates || {})
          .map((key) => `${key}: ${event.updates[key]}`)
          .join(', ');
      default:
        return JSON.stringify(event.data || {}, null, 2);
    }
  };

  const toggleExpanded = (index) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const filteredHistory = filter === 'all'
    ? history
    : history.filter((event) => event.type === filter);

  const eventTypes = [...new Set(history.map((e) => e.type))];

  return (
    <div className="case-timeline">
      {/* Filter */}
      <div className="timeline-filter">
        <label htmlFor="event-filter">Filter by:</label>
        <select
          id="event-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All Events</option>
          {eventTypes.map((type) => (
            <option key={type} value={type}>
              {type.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* Timeline Items */}
      <div className="timeline-items">
        {filteredHistory.length === 0 ? (
          <div className="timeline-empty">
            <p>No timeline events yet</p>
          </div>
        ) : (
          filteredHistory.map((event, index) => (
            <div
              key={index}
              className={`timeline-item ${expandedItems.has(index) ? 'expanded' : ''}`}
              style={{ borderLeftColor: getEventColor(event.type) }}
            >
              {/* Timeline Icon */}
              <div
                className="timeline-icon"
                style={{ backgroundColor: getEventColor(event.type) }}
              >
                {getEventIcon(event.type)}
              </div>

              {/* Timeline Content */}
              <div className="timeline-content">
                <div className="timeline-header">
                  <h4 className="timeline-title">{formatEventTitle(event)}</h4>
                  <span className="timeline-date">{formatDate(event.timestamp)}</span>
                </div>

                <div className="timeline-stage">
                  Stage: {event.stage}
                </div>

                {/* Expandable Details */}
                {expandedItems.has(index) && (
                  <div className="timeline-details">
                    <pre>{formatEventDetails(event)}</pre>
                  </div>
                )}

                <button
                  className="timeline-expand-btn"
                  onClick={() => toggleExpanded(index)}
                >
                  {expandedItems.has(index) ? 'Show Less' : 'Show More'}
                </button>
              </div>

              {/* Timeline Connector */}
              {index < filteredHistory.length - 1 && (
                <div className="timeline-connector" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CaseTimeline;
