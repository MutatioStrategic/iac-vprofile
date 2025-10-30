/**
 * Case Context Provider
 * Provides case data and actions to components
 */

'use client';

import React, { createContext, useContext } from 'react';
import type { CaseDocument, ViewModel, CaseHistoryEntry } from '@/types/pipeline.types';
import type { PipelineConfig } from '@/types/pipeline.types';

interface CaseContextValue {
  caseDoc: CaseDocument;
  viewModel: ViewModel;
  pipelineConfig: {
    key: string;
    name: string;
    version: string;
  };
  history: CaseHistoryEntry[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

const CaseContext = createContext<CaseContextValue | undefined>(undefined);

interface CaseProviderProps {
  children: React.ReactNode;
  value: CaseContextValue;
}

export function CaseProvider({ children, value }: CaseProviderProps) {
  return <CaseContext.Provider value={value}>{children}</CaseContext.Provider>;
}

/**
 * Hook to access case context
 */
export function useCase(): CaseContextValue {
  const context = useContext(CaseContext);
  if (context === undefined) {
    throw new Error('useCase must be used within CaseProvider');
  }
  return context;
}
