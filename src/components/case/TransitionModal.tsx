/**
 * Stage Transition Modal
 * Modal for confirming stage transitions with metadata input
 */

'use client';

import React, { useState } from 'react';
import type { AllowedTransition } from '@/types/pipeline.types';

interface TransitionModalProps {
  isOpen: boolean;
  transition: AllowedTransition;
  onConfirm: (metadata?: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}

export function TransitionModal({ isOpen, transition, onConfirm, onCancel }: TransitionModalProps) {
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await onConfirm({
        notes,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to transition');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          {/* Header */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Confirm Stage Transition
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Transition to: <span className="font-medium">{transition.label}</span>
            </p>
          </div>

          {/* Warnings */}
          {transition.requiresApproval && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-amber-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="ml-3">
                  <p className="text-sm font-medium text-amber-800">
                    Approval Required
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    This transition requires managerial approval before it takes effect.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Required Fields Warning */}
          {transition.requiredFields && transition.requiredFields.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-800 mb-2">
                Required fields:
              </p>
              <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                {transition.requiredFields.map((field) => (
                  <li key={field}>{field.replace(/_/g, ' ')}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Conditions Warning */}
          {transition.conditions && transition.conditions.length > 0 && (
            <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-sm font-medium text-purple-800 mb-2">
                Conditions:
              </p>
              <ul className="text-sm text-purple-700 list-disc list-inside space-y-1">
                {transition.conditions.map((condition, index) => (
                  <li key={index}>
                    {condition.message || `${condition.type} check`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Notes */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transition Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter any notes about this transition..."
              />
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Confirm Transition</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
