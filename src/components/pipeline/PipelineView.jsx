/**
 * Pipeline View Component
 * Generic pipeline visualization component
 */

import React, { useState, useEffect } from 'react';
import StageCard from './StageCard';
import CaseTimeline from './CaseTimeline';

const PipelineView = ({ caseId, pipelineData, onStageTransition, onActionExecute }) => {
  const [selectedStage, setSelectedStage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (pipelineData?.currentStage) {
      setSelectedStage(pipelineData.currentStage);
    }
  }, [pipelineData]);

  const handleStageClick = (stage) => {
    setSelectedStage(stage);
  };

  const handleTransition = async (targetStage) => {
    setIsLoading(true);
    setError(null);

    try {
      await onStageTransition(caseId, targetStage);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (actionName, actionData) => {
    setIsLoading(true);
    setError(null);

    try {
      await onActionExecute(caseId, actionName, actionData);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!pipelineData) {
    return (
      <div className="pipeline-view loading">
        <div className="spinner">Loading pipeline...</div>
      </div>
    );
  }

  const { stages = [], currentStage, progress, matterType } = pipelineData;

  return (
    <div className="pipeline-view">
      {/* Header */}
      <div className="pipeline-header">
        <h2>Case Pipeline: {matterType}</h2>
        <div className="pipeline-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="progress-text">{Math.round(progress)}% Complete</span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="pipeline-error">
          <span className="error-icon">⚠️</span>
          <span className="error-message">{error}</span>
          <button
            className="error-dismiss"
            onClick={() => setError(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* Stage Cards */}
      <div className="pipeline-stages">
        {stages.map((stageData, index) => (
          <React.Fragment key={stageData.stage}>
            <StageCard
              stage={stageData.stage}
              definition={stageData.definition}
              status={stageData.status}
              isActive={stageData.stage === currentStage}
              isSelected={stageData.stage === selectedStage}
              canTransition={stageData.canTransition}
              onClick={() => handleStageClick(stageData.stage)}
              onTransition={handleTransition}
              onActionExecute={handleAction}
              isLoading={isLoading}
            />

            {/* Stage Connector */}
            {index < stages.length - 1 && (
              <div
                className={`stage-connector ${
                  stageData.status === 'completed' ? 'completed' : 'pending'
                }`}
              >
                <svg width="40" height="40" viewBox="0 0 40 40">
                  <path
                    d="M 0 20 L 40 20"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                  />
                  <path
                    d="M 30 15 L 40 20 L 30 25"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                  />
                </svg>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Timeline */}
      <div className="pipeline-timeline">
        <h3>Case Timeline</h3>
        <CaseTimeline caseId={caseId} history={pipelineData.history} />
      </div>
    </div>
  );
};

export default PipelineView;
