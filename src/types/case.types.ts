/**
 * Case-specific type definitions
 */

import type { CaseDocument, CaseHistoryEntry } from './pipeline.types';

/**
 * Case list item (summary view)
 */
export interface CaseListItem {
  id: string;
  matterType: string;
  pipelineStage: string;
  status: 'active' | 'closed' | 'archived';
  clientName?: string;
  assignedLawyer?: string;
  createdAt: string;
  updatedAt: string;
  metadata: {
    title?: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high';
    [key: string]: unknown;
  };
}

/**
 * Case detail (full view)
 */
export interface CaseDetail extends CaseDocument {
  history?: CaseHistoryEntry[];
  documents?: CaseDocument[];
  notes?: CaseNote[];
  deadlines?: CaseDeadline[];
}

/**
 * Case note
 */
export interface CaseNote {
  id: string;
  caseId: string;
  userId: string;
  content: string;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

/**
 * Case deadline
 */
export interface CaseDeadline {
  id: string;
  caseId: string;
  title: string;
  description?: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'completed' | 'overdue';
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

/**
 * Case document
 */
export interface CaseDocumentFile {
  id: string;
  caseId: string;
  name: string;
  type: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: string;
  metadata?: Record<string, unknown>;
}

/**
 * Case creation input
 */
export interface CreateCaseInput {
  matterType: string;
  clientId?: string;
  assignedLawyer?: string;
  metadata: Record<string, unknown>;
}

/**
 * Case update input
 */
export interface UpdateCaseInput {
  assignedLawyer?: string;
  status?: 'active' | 'closed' | 'archived';
  metadata?: Record<string, unknown>;
}

/**
 * Case filter options
 */
export interface CaseFilter {
  matterType?: string;
  pipelineStage?: string;
  status?: 'active' | 'closed' | 'archived';
  assignedLawyer?: string;
  clientId?: string;
  createdAfter?: string;
  createdBefore?: string;
  search?: string;
}

/**
 * Case statistics
 */
export interface CaseStatistics {
  total: number;
  active: number;
  closed: number;
  archived: number;
  byMatterType: Record<string, number>;
  byStage: Record<string, number>;
  byAssignee: Record<string, number>;
}
