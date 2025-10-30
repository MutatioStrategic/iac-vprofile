/**
 * Core Pipeline Type Definitions
 * Type-safe pipeline configuration and execution types
 */

import type { UserRole } from './auth.types';

/**
 * Stage definition in pipeline
 */
export interface StageDefinition {
  key: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  estimatedDuration?: {
    value: number;
    unit: 'hours' | 'days' | 'weeks';
  };
  metadata?: Record<string, unknown>;
}

/**
 * Condition for transition evaluation
 */
export interface TransitionCondition {
  type: 'field_required' | 'field_equals' | 'role_required' | 'custom';
  field?: string;
  value?: unknown;
  roles?: UserRole[];
  evaluate?: (caseDoc: CaseDocument, userRole: UserRole) => boolean;
  message?: string;
}

/**
 * Transition rule between stages
 */
export interface TransitionRule {
  from: string;
  to: string;
  label?: string;
  requiresApproval?: boolean;
  requiredFields?: string[];
  conditions?: TransitionCondition[];
  metadata?: Record<string, unknown>;
}

/**
 * Field type enum
 */
export type FieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'datetime'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'email'
  | 'phone'
  | 'currency'
  | 'file'
  | 'textarea'
  | 'json';

/**
 * Field validation rule
 */
export interface FieldValidation {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  options?: Array<{ value: string; label: string }>;
  custom?: (value: unknown) => boolean | string;
}

/**
 * Field definition
 */
export interface FieldDefinition {
  key: string;
  label: string;
  type: FieldType;
  description?: string;
  placeholder?: string;
  defaultValue?: unknown;
  validation?: FieldValidation;
  readOnly?: boolean;
  stages: string[]; // Stages where this field is visible, '*' for all
  editableInStages?: string[]; // Stages where this field can be edited
  group?: string; // Field grouping for UI
  order?: number; // Display order
  metadata?: Record<string, unknown>;
}

/**
 * Role permission configuration
 */
export interface RolePermission {
  role: UserRole;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canAssign: boolean;
  canTransitionFrom?: string[]; // Stages from which this role can transition
  editableFields?: string[]; // Fields this role can edit
  visibleFields?: string[]; // Fields this role can view
  metadata?: Record<string, unknown>;
}

/**
 * Complete pipeline configuration (declarative)
 */
export interface PipelineConfig {
  key: string;
  name: string;
  version: string;
  description?: string;
  stages: StageDefinition[];
  transitions: TransitionRule[];
  fieldDefinitions: FieldDefinition[];
  rolePermissions: RolePermission[];
  automations?: AutomationConfig[];
  notifications?: NotificationConfig[];
  metadata?: Record<string, unknown>;
}

/**
 * Automation configuration
 */
export interface AutomationConfig {
  trigger: 'stage_enter' | 'stage_exit' | 'field_change' | 'custom';
  stage?: string;
  field?: string;
  handler: string; // Handler function name
  config?: Record<string, unknown>;
}

/**
 * Notification configuration
 */
export interface NotificationConfig {
  event: 'stage_change' | 'deadline_approaching' | 'assignment' | 'custom';
  recipients: ('assigned_lawyer' | 'client' | 'custom')[];
  template: string;
  channels: ('email' | 'sms' | 'in_app')[];
  config?: Record<string, unknown>;
}

/**
 * Case document from database
 */
export interface CaseDocument {
  id: string;
  matter_type: string;
  matterType: string; // Normalized
  pipeline_stage: string;
  pipelineStage: string; // Normalized
  pipeline_version: string;
  pipelineVersion: string; // Normalized
  status: 'active' | 'closed' | 'archived';
  assigned_lawyer?: string;
  assignedLawyer?: string; // Normalized
  client_id?: string;
  clientId?: string; // Normalized
  metadata: Record<string, unknown>;
  created_at: string;
  createdAt: string; // Normalized
  updated_at: string;
  updatedAt: string; // Normalized
  created_by?: string;
  createdBy?: string; // Normalized
  updated_by?: string;
  updatedBy?: string; // Normalized
}

/**
 * Case action payload
 */
export interface CaseAction {
  type: 'transition' | 'update_fields' | 'add_document' | 'add_note' | 'custom';
  payload: {
    targetStage?: string;
    updates?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    [key: string]: unknown;
  };
  reason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Action execution result
 */
export interface ActionResult {
  success: boolean;
  caseId?: string;
  newStage?: string;
  historyId?: string;
  timestamp?: string;
  error?: string;
  code?: string;
  details?: unknown;
}

/**
 * Allowed transition (computed)
 */
export interface AllowedTransition {
  to: string;
  label: string;
  requiresApproval: boolean;
  requiredFields: string[];
  conditions: TransitionCondition[];
  estimatedDuration?: {
    value: number;
    unit: 'hours' | 'days' | 'weeks';
  };
}

/**
 * Display field (for UI rendering)
 */
export interface DisplayField extends FieldDefinition {
  value: unknown;
  isEditable: boolean;
}

/**
 * Timeline stage (for progress visualization)
 */
export interface TimelineStage extends StageDefinition {
  status: 'completed' | 'active' | 'pending';
  canTransitionTo: boolean;
}

/**
 * View model for frontend consumption
 */
export interface ViewModel {
  caseId: string;
  matterType: string;
  currentStage: {
    key: string;
    name: string;
    description?: string;
    color?: string;
    icon?: string;
  };
  progress: number; // Percentage 0-100
  allowedTransitions: AllowedTransition[];
  editableFields: FieldDefinition[];
  displayFields: DisplayField[];
  allowedActions: string[];
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
    canApprove: boolean;
    canAssign: boolean;
  };
  timeline: {
    stages: TimelineStage[];
  };
}

/**
 * Case history entry
 */
export interface CaseHistoryEntry {
  id: string;
  case_id: string;
  caseId: string; // Normalized
  action_type: string;
  actionType: string; // Normalized
  user_id: string;
  userId: string; // Normalized
  from_stage?: string;
  fromStage?: string; // Normalized
  to_stage?: string;
  toStage?: string; // Normalized
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  timestamp: string;
  created_at: string;
  createdAt: string; // Normalized
}

/**
 * Pipeline registry entry
 */
export interface PipelineRegistryEntry {
  key: string;
  name: string;
  version: string;
  config: PipelineConfig;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
