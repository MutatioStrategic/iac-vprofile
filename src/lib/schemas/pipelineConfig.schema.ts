/**
 * Zod Schemas for Pipeline Configuration Validation
 * Runtime validation for pipeline configs and case actions
 */

import { z } from 'zod';

// ===== FIELD DEFINITIONS =====

export const fieldTypeSchema = z.enum([
  'text',
  'number',
  'date',
  'datetime',
  'boolean',
  'select',
  'multiselect',
  'email',
  'phone',
  'currency',
  'file',
  'textarea',
  'json'
]);

export const fieldValidationSchema = z.object({
  required: z.boolean().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
  options: z.array(
    z.object({
      value: z.string(),
      label: z.string()
    })
  ).optional()
}).passthrough();

export const fieldDefinitionSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: fieldTypeSchema,
  description: z.string().optional(),
  placeholder: z.string().optional(),
  defaultValue: z.unknown().optional(),
  validation: fieldValidationSchema.optional(),
  readOnly: z.boolean().optional(),
  stages: z.array(z.string()),
  editableInStages: z.array(z.string()).optional(),
  group: z.string().optional(),
  order: z.number().optional(),
  metadata: z.record(z.unknown()).optional()
});

// ===== STAGE DEFINITIONS =====

export const stageDefinitionSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  estimatedDuration: z.object({
    value: z.number().positive(),
    unit: z.enum(['hours', 'days', 'weeks'])
  }).optional(),
  metadata: z.record(z.unknown()).optional()
});

// ===== TRANSITIONS =====

export const transitionConditionSchema = z.object({
  type: z.enum(['field_required', 'field_equals', 'role_required', 'custom']),
  field: z.string().optional(),
  value: z.unknown().optional(),
  roles: z.array(z.string()).optional(),
  message: z.string().optional()
});

export const transitionRuleSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  label: z.string().optional(),
  requiresApproval: z.boolean().optional(),
  requiredFields: z.array(z.string()).optional(),
  conditions: z.array(transitionConditionSchema).optional(),
  metadata: z.record(z.unknown()).optional()
});

// ===== ROLE PERMISSIONS =====

export const userRoleSchema = z.enum([
  'admin',
  'lawyer',
  'paralegal',
  'client',
  'accountant',
  'investigator',
  'mediator'
]);

export const rolePermissionSchema = z.object({
  role: userRoleSchema,
  canEdit: z.boolean(),
  canDelete: z.boolean(),
  canApprove: z.boolean(),
  canAssign: z.boolean(),
  canTransitionFrom: z.array(z.string()).optional(),
  editableFields: z.array(z.string()).optional(),
  visibleFields: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional()
});

// ===== AUTOMATIONS & NOTIFICATIONS =====

export const automationConfigSchema = z.object({
  trigger: z.enum(['stage_enter', 'stage_exit', 'field_change', 'custom']),
  stage: z.string().optional(),
  field: z.string().optional(),
  handler: z.string().min(1),
  config: z.record(z.unknown()).optional()
});

export const notificationConfigSchema = z.object({
  event: z.enum(['stage_change', 'deadline_approaching', 'assignment', 'custom']),
  recipients: z.array(z.enum(['assigned_lawyer', 'client', 'custom'])),
  template: z.string().min(1),
  channels: z.array(z.enum(['email', 'sms', 'in_app'])),
  config: z.record(z.unknown()).optional()
});

// ===== COMPLETE PIPELINE CONFIG =====

export const pipelineConfigSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/), // Semver format
  description: z.string().optional(),
  stages: z.array(stageDefinitionSchema).min(1),
  transitions: z.array(transitionRuleSchema).min(1),
  fieldDefinitions: z.array(fieldDefinitionSchema),
  rolePermissions: z.array(rolePermissionSchema).min(1),
  automations: z.array(automationConfigSchema).optional(),
  notifications: z.array(notificationConfigSchema).optional(),
  metadata: z.record(z.unknown()).optional()
}).refine((config) => {
  // Validate: all transition 'from' stages exist
  const stageKeys = new Set(config.stages.map(s => s.key));
  const invalidFromStages = config.transitions.filter(t => !stageKeys.has(t.from));
  return invalidFromStages.length === 0;
}, {
  message: 'All transition "from" stages must exist in stages array'
}).refine((config) => {
  // Validate: all transition 'to' stages exist
  const stageKeys = new Set(config.stages.map(s => s.key));
  const invalidToStages = config.transitions.filter(t => !stageKeys.has(t.to));
  return invalidToStages.length === 0;
}, {
  message: 'All transition "to" stages must exist in stages array'
}).refine((config) => {
  // Validate: all requiredFields in transitions exist in fieldDefinitions
  const fieldKeys = new Set(config.fieldDefinitions.map(f => f.key));
  for (const transition of config.transitions) {
    if (transition.requiredFields) {
      const invalidFields = transition.requiredFields.filter(f => !fieldKeys.has(f));
      if (invalidFields.length > 0) {
        return false;
      }
    }
  }
  return true;
}, {
  message: 'All requiredFields in transitions must exist in fieldDefinitions'
}).refine((config) => {
  // Validate: all stages in field definitions exist (except '*')
  const stageKeys = new Set(config.stages.map(s => s.key));
  for (const field of config.fieldDefinitions) {
    const invalidStages = field.stages.filter(s => s !== '*' && !stageKeys.has(s));
    if (invalidStages.length > 0) {
      return false;
    }
  }
  return true;
}, {
  message: 'All stages in field definitions must exist in stages array'
});

// ===== CASE DOCUMENT =====

export const caseDocumentSchema = z.object({
  id: z.string().uuid(),
  matter_type: z.string(),
  matterType: z.string(),
  pipeline_stage: z.string(),
  pipelineStage: z.string(),
  pipeline_version: z.string(),
  pipelineVersion: z.string(),
  status: z.enum(['active', 'closed', 'archived']),
  assigned_lawyer: z.string().optional(),
  assignedLawyer: z.string().optional(),
  client_id: z.string().optional(),
  clientId: z.string().optional(),
  metadata: z.record(z.unknown()),
  created_at: z.string(),
  createdAt: z.string(),
  updated_at: z.string(),
  updatedAt: z.string(),
  created_by: z.string().optional(),
  createdBy: z.string().optional(),
  updated_by: z.string().optional(),
  updatedBy: z.string().optional()
});

// ===== CASE ACTION =====

export const caseActionSchema = z.object({
  type: z.enum(['transition', 'update_fields', 'add_document', 'add_note', 'custom']),
  payload: z.object({
    targetStage: z.string().optional(),
    updates: z.record(z.unknown()).optional(),
    metadata: z.record(z.unknown()).optional()
  }).passthrough(),
  reason: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

// ===== TYPE EXPORTS =====

export type FieldType = z.infer<typeof fieldTypeSchema>;
export type FieldValidation = z.infer<typeof fieldValidationSchema>;
export type FieldDefinition = z.infer<typeof fieldDefinitionSchema>;
export type StageDefinition = z.infer<typeof stageDefinitionSchema>;
export type TransitionCondition = z.infer<typeof transitionConditionSchema>;
export type TransitionRule = z.infer<typeof transitionRuleSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;
export type RolePermission = z.infer<typeof rolePermissionSchema>;
export type AutomationConfig = z.infer<typeof automationConfigSchema>;
export type NotificationConfig = z.infer<typeof notificationConfigSchema>;
export type PipelineConfig = z.infer<typeof pipelineConfigSchema>;
export type CaseDocument = z.infer<typeof caseDocumentSchema>;
export type CaseAction = z.infer<typeof caseActionSchema>;

// ===== VALIDATION HELPERS =====

/**
 * Validate pipeline configuration
 * @throws ZodError if invalid
 */
export function validatePipelineConfig(config: unknown): PipelineConfig {
  return pipelineConfigSchema.parse(config);
}

/**
 * Safe validation with error handling
 */
export function safeParsePipelineConfig(config: unknown): {
  success: boolean;
  data?: PipelineConfig;
  errors?: z.ZodIssue[];
} {
  const result = pipelineConfigSchema.safeParse(config);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error.issues };
}

/**
 * Validate case action
 * @throws ZodError if invalid
 */
export function validateCaseAction(action: unknown): CaseAction {
  return caseActionSchema.parse(action);
}

/**
 * Create field-specific validator from field definition
 */
export function createFieldValidator(field: FieldDefinition) {
  let schema: z.ZodTypeAny;

  // Base type validation
  switch (field.type) {
    case 'text':
    case 'textarea':
    case 'email':
    case 'phone':
      schema = z.string();
      if (field.validation?.pattern) {
        schema = schema.regex(new RegExp(field.validation.pattern));
      }
      break;

    case 'number':
    case 'currency':
      schema = z.number();
      if (field.validation?.min !== undefined) {
        schema = (schema as z.ZodNumber).min(field.validation.min);
      }
      if (field.validation?.max !== undefined) {
        schema = (schema as z.ZodNumber).max(field.validation.max);
      }
      break;

    case 'date':
    case 'datetime':
      schema = z.string().datetime();
      break;

    case 'boolean':
      schema = z.boolean();
      break;

    case 'select':
      if (field.validation?.options) {
        const values = field.validation.options.map(o => o.value);
        schema = z.enum(values as [string, ...string[]]);
      } else {
        schema = z.string();
      }
      break;

    case 'multiselect':
      if (field.validation?.options) {
        const values = field.validation.options.map(o => o.value);
        schema = z.array(z.enum(values as [string, ...string[]]));
      } else {
        schema = z.array(z.string());
      }
      break;

    case 'file':
      schema = z.string().url();
      break;

    case 'json':
      schema = z.record(z.unknown());
      break;

    default:
      schema = z.unknown();
  }

  // Apply required validation
  if (!field.validation?.required) {
    schema = schema.optional();
  }

  return schema;
}

/**
 * Create update validator from editable fields
 */
export function createUpdateValidator(editableFields: FieldDefinition[]) {
  const shape: Record<string, z.ZodTypeAny> = {};

  editableFields.forEach((field) => {
    shape[field.key] = createFieldValidator(field);
  });

  return z.object(shape).partial();
}
