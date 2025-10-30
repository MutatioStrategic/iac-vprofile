/**
 * Stage Card Component
 * Displays individual stage information
 */

import React, { useState } from 'react';

const StageCard = ({
  stage,
  definition,
  status,
  isActive,
  isSelected,
  canTransition,
  onClick,
  onTransition,
  onActionExecute,
  isLoading
}) => {
  const [showActions, setShowActions] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'active':
        return '●';
      case 'pending':
        return '○';
      default:
        return '○';
    }
  };

  const getStatusClass = () => {
    if (isActive) return 'active';
    return status;
  };

  const handleActionClick = (action) => {
    setSelectedAction(action);
  };

  const handleActionExecute = () => {
    if (selectedAction) {
      onActionExecute(selectedAction, {});
      setSelectedAction(null);
    }
  };

  const handleTransitionClick = () => {
    if (canTransition && !isLoading) {
      onTransition(stage);
    }
  };

  return (
    <div
      className={`stage-card ${getStatusClass()} ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      style={{ borderColor: definition?.color }}
    >
      {/* Stage Header */}
      <div className="stage-header">
        <div className="stage-status-icon">{getStatusIcon()}</div>
        <div className="stage-title">
          <h4>{definition?.name || stage}</h4>
          {definition?.estimatedDuration && (
            <span className="stage-duration">
              ~{definition.estimatedDuration.days}{' '}
              {definition.estimatedDuration.unit === 'business_days'
                ? 'business days'
                : 'days'}
            </span>
          )}
        </div>
        {definition?.icon && (
          <div className="stage-icon">{definition.icon}</div>
        )}
      </div>

      {/* Stage Description */}
      {definition?.description && (
        <div className="stage-description">{definition.description}</div>
      )}

      {/* Stage Details (shown when selected) */}
      {isSelected && (
        <>
          {/* Required Fields */}
          {definition?.requiredFields && definition.requiredFields.length > 0 && (
            <div className="stage-section">
              <h5>Required Fields</h5>
              <ul className="field-list">
                {definition.requiredFields.map((field) => (
                  <li key={field}>
                    <span className="field-name">{field.replace(/_/g, ' ')}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Optional Fields */}
          {definition?.optionalFields && definition.optionalFields.length > 0 && (
            <div className="stage-section">
              <h5>Optional Fields</h5>
              <ul className="field-list optional">
                {definition.optionalFields.map((field) => (
                  <li key={field}>
                    <span className="field-name">{field.replace(/_/g, ' ')}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Available Actions */}
          {definition?.actions && definition.actions.length > 0 && isActive && (
            <div className="stage-section">
              <div className="section-header">
                <h5>Available Actions</h5>
                <button
                  className="toggle-actions-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowActions(!showActions);
                  }}
                >
                  {showActions ? '▼' : '▶'}
                </button>
              </div>

              {showActions && (
                <div className="actions-list">
                  {definition.actions.map((action) => (
                    <button
                      key={action}
                      className={`action-btn ${
                        selectedAction === action ? 'selected' : ''
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleActionClick(action);
                      }}
                      disabled={isLoading}
                    >
                      {action.replace(/_/g, ' ')}
                    </button>
                  ))}

                  {selectedAction && (
                    <button
                      className="execute-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleActionExecute();
                      }}
                      disabled={isLoading}
                    >
                      Execute: {selectedAction.replace(/_/g, ' ')}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Next Stages */}
          {definition?.nextStages && definition.nextStages.length > 0 && (
            <div className="stage-section">
              <h5>Possible Next Stages</h5>
              <ul className="next-stages-list">
                {definition.nextStages.map((nextStage) => (
                  <li key={nextStage}>
                    <span className="next-stage-name">
                      {nextStage.replace(/_/g, ' ')}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Transition Button */}
          {canTransition && (
            <div className="stage-actions">
              <button
                className="transition-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTransitionClick();
                }}
                disabled={isLoading}
                style={{ backgroundColor: definition?.color }}
              >
                {isLoading ? 'Transitioning...' : `Transition to ${stage}`}
              </button>
            </div>
          )}
        </>
      )}

      {/* Active Indicator */}
      {isActive && (
        <div className="active-indicator" style={{ backgroundColor: definition?.color }}>
          <span>Current Stage</span>
        </div>
      )}
    </div>
  );
};

export default StageCard;
