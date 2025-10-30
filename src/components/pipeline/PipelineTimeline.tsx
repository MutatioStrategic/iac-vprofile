/**
 * Pipeline Timeline Component
 * Visual representation of pipeline stages with progress
 */

'use client';

import React from 'react';
import type { TimelineStage } from '@/types/pipeline.types';

interface PipelineTimelineProps {
  stages: TimelineStage[];
  currentStage: string;
  onStageClick?: (stage: string) => void;
}

export function PipelineTimeline({ stages, currentStage, onStageClick }: PipelineTimelineProps) {
  const currentIndex = stages.findIndex(s => s.key === currentStage);

  return (
    <div className="w-full">
      {/* Desktop view - horizontal */}
      <div className="hidden lg:block">
        <div className="relative">
          {/* Progress bar background */}
          <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200" />

          {/* Progress bar fill */}
          <div
            className="absolute top-5 left-0 h-1 bg-blue-500 transition-all duration-500"
            style={{
              width: `${(currentIndex / (stages.length - 1)) * 100}%`
            }}
          />

          {/* Stages */}
          <div className="relative flex justify-between">
            {stages.map((stage, index) => {
              const isCompleted = index < currentIndex;
              const isActive = index === currentIndex;
              const isPending = index > currentIndex;

              return (
                <div
                  key={stage.key}
                  className="flex flex-col items-center"
                  style={{ flex: 1 }}
                >
                  {/* Stage dot */}
                  <button
                    onClick={() => onStageClick?.(stage.key)}
                    disabled={!stage.canTransitionTo && !isCompleted && !isActive}
                    className={`
                      relative z-10 w-10 h-10 rounded-full border-4
                      flex items-center justify-center
                      transition-all duration-300
                      ${isCompleted ? 'bg-green-500 border-green-500' : ''}
                      ${isActive ? 'bg-blue-500 border-blue-500 ring-4 ring-blue-100' : ''}
                      ${isPending ? 'bg-white border-gray-300' : ''}
                      ${stage.canTransitionTo ? 'cursor-pointer hover:scale-110' : 'cursor-default'}
                      ${!stage.canTransitionTo && !isCompleted && !isActive ? 'opacity-50' : ''}
                    `}
                    style={isActive && stage.color ? { backgroundColor: stage.color, borderColor: stage.color } : {}}
                  >
                    {isCompleted ? (
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : isActive ? (
                      <div className="w-3 h-3 bg-white rounded-full" />
                    ) : (
                      <div className="w-2 h-2 bg-gray-300 rounded-full" />
                    )}
                  </button>

                  {/* Stage name */}
                  <div className="mt-3 text-center max-w-[120px]">
                    <p className={`
                      text-sm font-medium
                      ${isActive ? 'text-blue-600' : ''}
                      ${isCompleted ? 'text-gray-900' : ''}
                      ${isPending ? 'text-gray-400' : ''}
                    `}>
                      {stage.name}
                    </p>
                    {stage.estimatedDuration && isPending && (
                      <p className="text-xs text-gray-400 mt-1">
                        ~{stage.estimatedDuration.value} {stage.estimatedDuration.unit}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile view - vertical */}
      <div className="lg:hidden space-y-4">
        {stages.map((stage, index) => {
          const isCompleted = index < currentIndex;
          const isActive = index === currentIndex;
          const isPending = index > currentIndex;

          return (
            <div key={stage.key} className="relative flex items-start">
              {/* Connector line */}
              {index < stages.length - 1 && (
                <div
                  className={`
                    absolute left-5 top-10 bottom-0 w-1
                    ${isCompleted || isActive ? 'bg-blue-500' : 'bg-gray-200'}
                  `}
                />
              )}

              {/* Stage dot */}
              <button
                onClick={() => onStageClick?.(stage.key)}
                disabled={!stage.canTransitionTo && !isCompleted && !isActive}
                className={`
                  relative z-10 w-10 h-10 rounded-full border-4 flex-shrink-0
                  flex items-center justify-center
                  ${isCompleted ? 'bg-green-500 border-green-500' : ''}
                  ${isActive ? 'bg-blue-500 border-blue-500' : ''}
                  ${isPending ? 'bg-white border-gray-300' : ''}
                  ${stage.canTransitionTo ? 'cursor-pointer' : 'cursor-default'}
                `}
              >
                {isCompleted ? (
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : isActive ? (
                  <div className="w-3 h-3 bg-white rounded-full" />
                ) : (
                  <div className="w-2 h-2 bg-gray-300 rounded-full" />
                )}
              </button>

              {/* Stage info */}
              <div className="ml-4 flex-1 pb-4">
                <div
                  className={`
                    p-3 rounded-lg border-2
                    ${isActive ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}
                  `}
                >
                  <p className={`
                    font-medium
                    ${isActive ? 'text-blue-600' : ''}
                    ${isCompleted ? 'text-gray-900' : ''}
                    ${isPending ? 'text-gray-400' : ''}
                  `}>
                    {stage.name}
                  </p>
                  {stage.description && (
                    <p className="text-sm text-gray-500 mt-1">{stage.description}</p>
                  )}
                  {stage.estimatedDuration && isPending && (
                    <p className="text-xs text-gray-400 mt-2">
                      Estimated: {stage.estimatedDuration.value} {stage.estimatedDuration.unit}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
