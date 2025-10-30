/**
 * React Example Usage
 * Demonstrates how to use the pipeline components in a React application
 */

import React, { useState, useEffect } from 'react';
import PipelineView from '../components/pipeline/PipelineView';
import '../components/pipeline/Pipeline.css';

const CaseManagementApp = () => {
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [pipelineData, setPipelineData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // API base URL
  const API_BASE = 'http://localhost:3000/api';

  // Fetch all cases on mount
  useEffect(() => {
    fetchCases();
  }, []);

  // Fetch pipeline data when case is selected
  useEffect(() => {
    if (selectedCase) {
      fetchPipelineData(selectedCase);
    }
  }, [selectedCase]);

  // Fetch all cases
  const fetchCases = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/cases`);
      const data = await response.json();

      if (data.success) {
        setCases(data.cases);
        if (data.cases.length > 0 && !selectedCase) {
          setSelectedCase(data.cases[0].id);
        }
      }
    } catch (err) {
      setError('Failed to fetch cases');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch pipeline data for a case
  const fetchPipelineData = async (caseId) => {
    try {
      const response = await fetch(`${API_BASE}/cases/${caseId}/pipeline`);
      const data = await response.json();

      if (data.success) {
        setPipelineData(data.pipeline);
      }
    } catch (err) {
      setError('Failed to fetch pipeline data');
      console.error(err);
    }
  };

  // Handle stage transition
  const handleStageTransition = async (caseId, targetStage) => {
    try {
      const response = await fetch(`${API_BASE}/cases/${caseId}/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetStage,
          metadata: {
            notes: `Transitioned to ${targetStage}`,
            timestamp: new Date().toISOString()
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        // Refresh pipeline data
        await fetchPipelineData(caseId);

        // Show success message
        alert(`Successfully transitioned to ${targetStage}`);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      alert(`Failed to transition: ${err.message}`);
      console.error(err);
    }
  };

  // Handle action execution
  const handleActionExecute = async (caseId, actionName, actionData) => {
    try {
      const response = await fetch(`${API_BASE}/cases/${caseId}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          actionName,
          actionData
        })
      });

      const data = await response.json();

      if (data.success) {
        // Refresh pipeline data
        await fetchPipelineData(caseId);

        // Show success message
        alert(`Successfully executed action: ${actionName}`);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      alert(`Failed to execute action: ${err.message}`);
      console.error(err);
    }
  };

  // Create new case
  const handleCreateCase = async (matterType) => {
    try {
      const response = await fetch(`${API_BASE}/cases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          matterType,
          client: {
            name: 'New Client',
            email: 'client@example.com',
            phone: '555-0000'
          },
          assignedTo: 'current_user',
          data: {
            client_name: 'New Client',
            contact_info: 'client@example.com',
            case_description: 'New case description'
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        // Refresh cases
        await fetchCases();

        // Select the new case
        setSelectedCase(data.case.id);

        alert('Case created successfully!');
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      alert(`Failed to create case: ${err.message}`);
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="case-management-app">
      {/* Sidebar */}
      <aside className="app-sidebar">
        <div className="sidebar-header">
          <h2>Cases</h2>
          <button
            className="btn-new-case"
            onClick={() => {
              const matterType = prompt(
                'Enter matter type (personal_injury, family_law, criminal_defense, real_estate, corporate):'
              );
              if (matterType) {
                handleCreateCase(matterType);
              }
            }}
          >
            + New Case
          </button>
        </div>

        <div className="case-list">
          {cases.map((caseItem) => (
            <div
              key={caseItem.id}
              className={`case-item ${
                selectedCase === caseItem.id ? 'selected' : ''
              }`}
              onClick={() => setSelectedCase(caseItem.id)}
            >
              <div className="case-item-header">
                <span className="case-id">{caseItem.id}</span>
                <span
                  className={`case-status ${caseItem.status}`}
                >
                  {caseItem.status}
                </span>
              </div>
              <div className="case-item-body">
                <div className="case-client">{caseItem.client.name}</div>
                <div className="case-type">{caseItem.matterType}</div>
                <div className="case-stage">{caseItem.currentStage}</div>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main className="app-main">
        {selectedCase && pipelineData ? (
          <>
            <div className="main-header">
              <h1>Case: {selectedCase}</h1>
              <div className="case-actions">
                <button
                  className="btn-refresh"
                  onClick={() => fetchPipelineData(selectedCase)}
                >
                  🔄 Refresh
                </button>
              </div>
            </div>

            <PipelineView
              caseId={selectedCase}
              pipelineData={pipelineData}
              onStageTransition={handleStageTransition}
              onActionExecute={handleActionExecute}
            />
          </>
        ) : (
          <div className="empty-state">
            <h2>No Case Selected</h2>
            <p>Select a case from the sidebar or create a new one</p>
          </div>
        )}
      </main>
    </div>
  );
};

// Additional CSS for the app
const appStyles = `
.case-management-app {
  display: flex;
  height: 100vh;
  background: #F9FAFB;
}

.app-sidebar {
  width: 320px;
  background: white;
  border-right: 1px solid #E5E7EB;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 1.5rem;
  border-bottom: 1px solid #E5E7EB;
}

.sidebar-header h2 {
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
  color: #1F2937;
}

.btn-new-case {
  width: 100%;
  padding: 0.75rem;
  background: #3B82F6;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-new-case:hover {
  background: #2563EB;
}

.case-list {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.case-item {
  padding: 1rem;
  background: #F9FAFB;
  border: 1px solid #E5E7EB;
  border-radius: 0.5rem;
  margin-bottom: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.case-item:hover {
  background: #F3F4F6;
  border-color: #D1D5DB;
}

.case-item.selected {
  background: #EEF2FF;
  border-color: #6366F1;
}

.case-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.case-id {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6B7280;
}

.case-status {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.case-status.active {
  background: #D1FAE5;
  color: #065F46;
}

.case-status.closed {
  background: #E5E7EB;
  color: #6B7280;
}

.case-item-body {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.case-client {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1F2937;
}

.case-type,
.case-stage {
  font-size: 0.75rem;
  color: #6B7280;
  text-transform: capitalize;
}

.app-main {
  flex: 1;
  overflow-y: auto;
}

.main-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  background: white;
  border-bottom: 1px solid #E5E7EB;
}

.main-header h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #1F2937;
}

.case-actions {
  display: flex;
  gap: 0.75rem;
}

.btn-refresh {
  padding: 0.625rem 1rem;
  background: white;
  border: 1px solid #D1D5DB;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-refresh:hover {
  background: #F9FAFB;
  border-color: #9CA3AF;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #9CA3AF;
}

.empty-state h2 {
  font-size: 1.5rem;
  margin: 0 0 0.5rem 0;
}

.empty-state p {
  font-size: 1rem;
  margin: 0;
}

.app-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
}
`;

export default CaseManagementApp;
export { appStyles };
