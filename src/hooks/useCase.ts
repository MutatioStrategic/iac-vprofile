/**
 * useCase Hook
 * Fetch and manage individual case data with SWR
 */

import useSWR, { mutate } from 'swr';
import type { CaseDocument, ViewModel, CaseHistoryEntry } from '@/types/pipeline.types';

interface CaseResponse {
  case: CaseDocument;
  viewModel: ViewModel;
  pipelineConfig: {
    key: string;
    name: string;
    version: string;
  };
  history: CaseHistoryEntry[];
}

/**
 * Fetcher function for case data
 */
async function fetchCase(url: string): Promise<CaseResponse> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch case');
  }

  return response.json();
}

/**
 * Hook to fetch case data
 */
export function useCaseData(caseId: string | null) {
  const { data, error, isLoading, mutate: refresh } = useSWR<CaseResponse>(
    caseId ? `/api/cases/${caseId}` : null,
    fetchCase,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000
    }
  );

  return {
    caseDoc: data?.case,
    viewModel: data?.viewModel,
    pipelineConfig: data?.pipelineConfig,
    history: data?.history || [],
    isLoading,
    error,
    refresh
  };
}

/**
 * Hook to fetch multiple cases
 */
export function useCases(filter?: {
  matterType?: string;
  status?: string;
  assignedLawyer?: string;
}) {
  const queryParams = new URLSearchParams();
  if (filter?.matterType) queryParams.set('matterType', filter.matterType);
  if (filter?.status) queryParams.set('status', filter.status);
  if (filter?.assignedLawyer) queryParams.set('assignedLawyer', filter.assignedLawyer);

  const url = `/api/cases${queryParams.toString() ? `?${queryParams}` : ''}`;

  const { data, error, isLoading } = useSWR<{ cases: CaseDocument[]; count: number }>(
    url,
    fetchCase,
    {
      revalidateOnFocus: true
    }
  );

  return {
    cases: data?.cases || [],
    count: data?.count || 0,
    isLoading,
    error
  };
}

/**
 * Hook to execute case actions with optimistic updates
 */
export function useCaseActions(caseId: string) {
  /**
   * Execute a case action
   */
  const executeAction = async (
    action: {
      type: string;
      payload: Record<string, unknown>;
      reason?: string;
    },
    options?: {
      optimisticData?: Partial<CaseDocument>;
    }
  ) => {
    const url = `/api/cases/${caseId}/actions`;

    try {
      // Optimistic update
      if (options?.optimisticData) {
        await mutate(
          `/api/cases/${caseId}`,
          (currentData: CaseResponse | undefined) => {
            if (!currentData) return currentData;
            return {
              ...currentData,
              case: {
                ...currentData.case,
                ...options.optimisticData
              }
            };
          },
          { revalidate: false }
        );
      }

      // Execute action
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ action })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to execute action');
      }

      const result = await response.json();

      // Revalidate case data
      await mutate(`/api/cases/${caseId}`);

      return result;
    } catch (error) {
      // Revert optimistic update on error
      await mutate(`/api/cases/${caseId}`);
      throw error;
    }
  };

  /**
   * Transition to new stage
   */
  const transitionStage = async (
    targetStage: string,
    metadata?: Record<string, unknown>
  ) => {
    return executeAction(
      {
        type: 'transition',
        payload: { targetStage, metadata }
      },
      {
        optimisticData: {
          pipeline_stage: targetStage,
          pipelineStage: targetStage
        }
      }
    );
  };

  /**
   * Update case fields
   */
  const updateFields = async (updates: Record<string, unknown>) => {
    return executeAction({
      type: 'update_fields',
      payload: { updates }
    });
  };

  /**
   * Add document
   */
  const addDocument = async (document: {
    name: string;
    type: string;
    url: string;
    size?: number;
    mimeType?: string;
  }) => {
    return executeAction({
      type: 'add_document',
      payload: { document }
    });
  };

  /**
   * Add note
   */
  const addNote = async (note: {
    content: string;
    isPrivate?: boolean;
  }) => {
    return executeAction({
      type: 'add_note',
      payload: { note }
    });
  };

  return {
    executeAction,
    transitionStage,
    updateFields,
    addDocument,
    addNote
  };
}

/**
 * Hook to fetch case history
 */
export function useCaseHistory(caseId: string | null) {
  const { data, error, isLoading } = useSWR<{ history: CaseHistoryEntry[] }>(
    caseId ? `/api/cases/${caseId}/history` : null,
    fetchCase
  );

  return {
    history: data?.history || [],
    isLoading,
    error
  };
}
