/**
 * Case Detail Page
 * Main case management interface with Next.js App Router
 */

'use client';

import React, { useState } from 'react';
import { useCaseData, useCaseActions } from '@/hooks/useCase';
import { CaseProvider } from '@/contexts/CaseContext';
import { PipelineTimeline } from '@/components/pipeline/PipelineTimeline';
import { ActionButtons } from '@/components/case/ActionButtons';
import { FieldRenderer, FieldDisplay } from '@/components/fields/FieldRenderer';
import type { DisplayField } from '@/types/pipeline.types';

interface CaseDetailPageProps {
  params: {
    caseId: string;
  };
}

export default function CaseDetailPage({ params }: CaseDetailPageProps) {
  const { caseId } = params;
  const {
    caseDoc,
    viewModel,
    pipelineConfig,
    history,
    isLoading,
    error,
    refresh
  } = useCaseData(caseId);

  const { transitionStage, updateFields } = useCaseActions(caseId);

  const [isEditing, setIsEditing] = useState(false);
  const [editedFields, setEditedFields] = useState<Record<string, unknown>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-blue-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-600">Loading case...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !caseDoc || !viewModel) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Case</h1>
          <p className="text-gray-600 mb-4">{error?.message || 'Case not found'}</p>
          <button
            onClick={() => window.location.href = '/cases'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Cases
          </button>
        </div>
      </div>
    );
  }

  const handleTransition = async (targetStage: string, metadata?: Record<string, unknown>) => {
    try {
      await transitionStage(targetStage, metadata);
      refresh();
    } catch (err) {
      console.error('Transition failed:', err);
      throw err;
    }
  };

  const handleSaveFields = async () => {
    if (Object.keys(editedFields).length === 0) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      await updateFields(editedFields);
      setIsEditing(false);
      setEditedFields({});
      refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save fields');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFieldChange = (fieldKey: string, value: unknown) => {
    setEditedFields(prev => ({
      ...prev,
      [fieldKey]: value
    }));
  };

  // Group fields by group
  const fieldsByGroup = viewModel.displayFields.reduce((acc, field) => {
    const group = field.group || 'general';
    if (!acc[group]) acc[group] = [];
    acc[group].push(field);
    return acc;
  }, {} as Record<string, DisplayField[]>);

  return (
    <CaseProvider
      value={{
        caseDoc,
        viewModel,
        pipelineConfig: pipelineConfig!,
        history,
        isLoading,
        error: error || null,
        refresh
      }}
    >
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Case: {caseId}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {pipelineConfig?.name} • {viewModel.currentStage.name}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">
                  Progress: {Math.round(viewModel.progress)}%
                </span>
                <button
                  onClick={refresh}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Pipeline Timeline */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Pipeline Progress</h2>
            <PipelineTimeline
              stages={viewModel.timeline.stages}
              currentStage={viewModel.currentStage.key}
              onStageClick={(stage) => console.log('Stage clicked:', stage)}
            />
          </div>

          {/* Action Buttons */}
          {viewModel.permissions.canEdit && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
              <ActionButtons
                allowedTransitions={viewModel.allowedTransitions}
                allowedActions={viewModel.allowedActions}
                onTransition={handleTransition}
                onAction={async () => {}}
              />
            </div>
          )}

          {/* Case Fields */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Case Information</h2>
              {viewModel.permissions.canEdit && (
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setEditedFields({});
                          setSaveError(null);
                        }}
                        disabled={isSaving}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveFields}
                        disabled={isSaving}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        {isSaving ? (
                          <>
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Saving...
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Edit Fields
                    </button>
                  )}
                </div>
              )}
            </div>

            {saveError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{saveError}</p>
              </div>
            )}

            {/* Fields by Group */}
            <div className="space-y-8">
              {Object.entries(fieldsByGroup).map(([group, fields]) => (
                <div key={group}>
                  <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide mb-4">
                    {group.replace(/_/g, ' ')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {fields.map((field) => (
                      <div key={field.key}>
                        {isEditing && field.isEditable ? (
                          <FieldRenderer
                            field={field}
                            value={editedFields[field.key] ?? field.value}
                            onChange={(value) => handleFieldChange(field.key, value)}
                          />
                        ) : (
                          <FieldDisplay field={field} value={field.value} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Case History */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Case History</h2>
            <div className="space-y-4">
              {history.length === 0 ? (
                <p className="text-gray-500 text-sm">No history entries yet</p>
              ) : (
                history.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {entry.actionType.replace(/_/g, ' ')}
                      </p>
                      {entry.fromStage && entry.toStage && (
                        <p className="text-sm text-gray-500 mt-1">
                          {entry.fromStage} → {entry.toStage}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(entry.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </CaseProvider>
  );
}
