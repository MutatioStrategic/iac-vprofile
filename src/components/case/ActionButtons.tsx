/**
 * Case Action Buttons
 * Buttons for stage transitions and case actions
 */

'use client';

import React, { useState } from 'react';
import type { AllowedTransition } from '@/types/pipeline.types';
import { TransitionModal } from './TransitionModal';

interface ActionButtonsProps {
  allowedTransitions: AllowedTransition[];
  allowedActions: string[];
  onTransition: (targetStage: string, metadata?: Record<string, unknown>) => Promise<void>;
  onAction: (actionType: string, payload: Record<string, unknown>) => Promise<void>;
  disabled?: boolean;
}

export function ActionButtons({
  allowedTransitions,
  allowedActions,
  onTransition,
  onAction,
  disabled
}: ActionButtonsProps) {
  const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false);
  const [selectedTransition, setSelectedTransition] = useState<AllowedTransition | null>(null);

  const handleTransitionClick = (transition: AllowedTransition) => {
    setSelectedTransition(transition);
    setIsTransitionModalOpen(true);
  };

  const handleTransitionConfirm = async (metadata?: Record<string, unknown>) => {
    if (!selectedTransition) return;

    try {
      await onTransition(selectedTransition.to, metadata);
      setIsTransitionModalOpen(false);
      setSelectedTransition(null);
    } catch (error) {
      console.error('Transition failed:', error);
      // Error will be shown by parent component
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {/* Stage Transitions */}
        {allowedTransitions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-500 self-center mr-2">
              Next stages:
            </span>
            {allowedTransitions.map((transition) => (
              <button
                key={transition.to}
                onClick={() => handleTransitionClick(transition)}
                disabled={disabled}
                className={`
                  px-4 py-2 rounded-lg font-medium text-sm
                  transition-colors duration-200
                  ${transition.requiresApproval
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center gap-2
                `}
              >
                <span>{transition.label}</span>
                {transition.requiresApproval && (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Other Actions */}
        {allowedActions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {allowedActions.includes('add_document') && (
              <button
                onClick={() => {/* Handle add document */}}
                disabled={disabled}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm transition-colors"
              >
                📄 Add Document
              </button>
            )}
            {allowedActions.includes('add_note') && (
              <button
                onClick={() => {/* Handle add note */}}
                disabled={disabled}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm transition-colors"
              >
                📝 Add Note
              </button>
            )}
            {allowedActions.includes('assign_lawyer') && (
              <button
                onClick={() => {/* Handle assign lawyer */}}
                disabled={disabled}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm transition-colors"
              >
                👤 Assign Lawyer
              </button>
            )}
          </div>
        )}
      </div>

      {/* Transition Modal */}
      {selectedTransition && (
        <TransitionModal
          isOpen={isTransitionModalOpen}
          transition={selectedTransition}
          onConfirm={handleTransitionConfirm}
          onCancel={() => {
            setIsTransitionModalOpen(false);
            setSelectedTransition(null);
          }}
        />
      )}
    </>
  );
}
