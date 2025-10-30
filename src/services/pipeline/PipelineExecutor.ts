/**
 * PipelineExecutor - Core pipeline execution engine
 *
 * Responsibilities:
 * - Interpret pipelineConfig to compute allowed transitions
 * - Validate user actions against role permissions and field definitions
 * - Generate ViewModels for frontend consumption
 * - Execute atomic case updates with history tracking
 *
 * @module PipelineExecutor
 */

import type {
  PipelineConfig,
  CaseDocument,
  CaseAction,
  ActionResult,
  ViewModel,
  AllowedTransition,
  FieldDefinition,
  RolePermission,
  StageDefinition,
  TransitionRule
} from '@/types/pipeline.types';
import type { UserRole } from '@/types/auth.types';
import { generateUUIDv7 } from '@/lib/utils/uuidv7';
import { createSupabaseClient } from '@/services/supabase/client';

export class PipelineExecutor {
  constructor(private config: PipelineConfig) {
    this.validateConfig();
  }

  /**
   * Compute allowed transitions for current case state
   */
  getAllowedTransitions(
    caseDoc: CaseDocument,
    userRole: UserRole
  ): AllowedTransition[] {
    const currentStage = caseDoc.pipelineStage;
    const stageConfig = this.getStageConfig(currentStage);

    if (!stageConfig) {
      return [];
    }

    // Get all possible transitions from current stage
    const possibleTransitions = this.config.transitions.filter(
      (t) => t.from === currentStage
    );

    // Filter by role permissions
    const allowedTransitions = possibleTransitions.filter((transition) => {
      // Check if user role can perform this transition
      const rolePermission = this.getRolePermission(userRole);
      if (!rolePermission) return false;

      // Check stage-specific permissions
      const canTransition = rolePermission.canTransitionFrom?.includes(currentStage) ?? false;

      // Check transition-specific rules
      const transitionAllowed = this.evaluateTransitionRules(
        transition,
        caseDoc,
        userRole
      );

      return canTransition && transitionAllowed;
    });

    return allowedTransitions.map((t) => ({
      to: t.to,
      label: t.label || this.getStageConfig(t.to)?.name || t.to,
      requiresApproval: t.requiresApproval || false,
      requiredFields: t.requiredFields || [],
      conditions: t.conditions || [],
      estimatedDuration: this.getStageConfig(t.to)?.estimatedDuration
    }));
  }

  /**
   * Get editable fields for current stage and role
   */
  getEditableFields(
    caseDoc: CaseDocument,
    userRole: UserRole
  ): FieldDefinition[] {
    const currentStage = caseDoc.pipelineStage;
    const stageConfig = this.getStageConfig(currentStage);
    const rolePermission = this.getRolePermission(userRole);

    if (!stageConfig || !rolePermission) {
      return [];
    }

    // Get fields for current stage
    const stageFields = this.config.fieldDefinitions.filter(
      (field) =>
        field.stages.includes(currentStage) ||
        field.stages.includes('*') // Global fields
    );

    // Filter by role permissions
    return stageFields.filter((field) => {
      // Check if role can edit this field
      if (field.readOnly) return false;

      // Check role-specific edit permissions
      const canEdit = rolePermission.editableFields?.includes(field.key) ?? false;

      // Check if field is editable in current stage
      const editableInStage = !field.editableInStages ||
        field.editableInStages.includes(currentStage);

      return canEdit && editableInStage;
    });
  }

  /**
   * Compute ViewModel for frontend rendering
   */
  computeViewModel(
    caseDoc: CaseDocument,
    userRole: UserRole
  ): ViewModel {
    const currentStage = caseDoc.pipelineStage;
    const stageConfig = this.getStageConfig(currentStage);
    const allowedTransitions = this.getAllowedTransitions(caseDoc, userRole);
    const editableFields = this.getEditableFields(caseDoc, userRole);
    const rolePermission = this.getRolePermission(userRole);

    // Compute progress percentage
    const stageIndex = this.config.stages.findIndex((s) => s.key === currentStage);
    const totalStages = this.config.stages.length;
    const progress = totalStages > 0 ? ((stageIndex + 1) / totalStages) * 100 : 0;

    // Get all fields (including read-only) for display
    const allFields = this.config.fieldDefinitions.filter(
      (field) =>
        field.stages.includes(currentStage) ||
        field.stages.includes('*')
    );

    return {
      caseId: caseDoc.id,
      matterType: caseDoc.matterType,
      currentStage: {
        key: currentStage,
        name: stageConfig?.name || currentStage,
        description: stageConfig?.description,
        color: stageConfig?.color,
        icon: stageConfig?.icon
      },
      progress,
      allowedTransitions,
      editableFields,
      displayFields: allFields.map((field) => ({
        ...field,
        value: caseDoc.metadata[field.key],
        isEditable: editableFields.some((f) => f.key === field.key)
      })),
      allowedActions: this.getAllowedActions(caseDoc, userRole),
      permissions: {
        canEdit: rolePermission?.canEdit ?? false,
        canDelete: rolePermission?.canDelete ?? false,
        canApprove: rolePermission?.canApprove ?? false,
        canAssign: rolePermission?.canAssign ?? false
      },
      timeline: {
        stages: this.config.stages.map((stage, index) => ({
          ...stage,
          status: index < stageIndex ? 'completed' :
                  index === stageIndex ? 'active' :
                  'pending',
          canTransitionTo: allowedTransitions.some((t) => t.to === stage.key)
        }))
      }
    };
  }

  /**
   * Validate and execute a case action
   */
  async executeAction(
    caseId: string,
    action: CaseAction,
    userId: string,
    userRole: UserRole
  ): Promise<ActionResult> {
    const supabase = createSupabaseClient();

    // Start transaction
    const { data: caseDoc, error: fetchError } = await supabase
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .single();

    if (fetchError || !caseDoc) {
      return {
        success: false,
        error: 'Case not found',
        code: 'CASE_NOT_FOUND'
      };
    }

    // Validate action
    const validation = this.validateAction(caseDoc, action, userRole);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        code: 'VALIDATION_FAILED',
        details: validation.details
      };
    }

    try {
      // Execute action based on type
      let result: ActionResult;

      switch (action.type) {
        case 'transition':
          result = await this.executeTransition(caseDoc, action, userId, userRole);
          break;

        case 'update_fields':
          result = await this.executeFieldUpdate(caseDoc, action, userId, userRole);
          break;

        case 'add_document':
          result = await this.executeAddDocument(caseDoc, action, userId);
          break;

        case 'add_note':
          result = await this.executeAddNote(caseDoc, action, userId);
          break;

        default:
          return {
            success: false,
            error: 'Unknown action type',
            code: 'UNKNOWN_ACTION'
          };
      }

      return result;
    } catch (error) {
      console.error('Error executing action:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'EXECUTION_ERROR'
      };
    }
  }

  /**
   * Execute stage transition with transaction
   */
  private async executeTransition(
    caseDoc: CaseDocument,
    action: CaseAction,
    userId: string,
    userRole: UserRole
  ): Promise<ActionResult> {
    const supabase = createSupabaseClient();
    const targetStage = action.payload.targetStage as string;
    const metadata = action.payload.metadata || {};

    // Validate transition
    const allowedTransitions = this.getAllowedTransitions(caseDoc, userRole);
    const isAllowed = allowedTransitions.some((t) => t.to === targetStage);

    if (!isAllowed) {
      return {
        success: false,
        error: 'Transition not allowed',
        code: 'TRANSITION_NOT_ALLOWED'
      };
    }

    const now = new Date().toISOString();
    const historyId = generateUUIDv7();

    // Execute transaction
    const { data: updatedCase, error: updateError } = await supabase.rpc(
      'execute_case_transition',
      {
        p_case_id: caseDoc.id,
        p_from_stage: caseDoc.pipelineStage,
        p_to_stage: targetStage,
        p_user_id: userId,
        p_metadata: metadata,
        p_history_id: historyId,
        p_timestamp: now
      }
    );

    if (updateError) {
      return {
        success: false,
        error: updateError.message,
        code: 'TRANSACTION_FAILED'
      };
    }

    return {
      success: true,
      caseId: caseDoc.id,
      newStage: targetStage,
      historyId,
      timestamp: now
    };
  }

  /**
   * Execute field update
   */
  private async executeFieldUpdate(
    caseDoc: CaseDocument,
    action: CaseAction,
    userId: string,
    userRole: UserRole
  ): Promise<ActionResult> {
    const supabase = createSupabaseClient();
    const updates = action.payload.updates as Record<string, unknown>;

    // Validate each field
    const editableFields = this.getEditableFields(caseDoc, userRole);
    const invalidFields = Object.keys(updates).filter(
      (key) => !editableFields.some((f) => f.key === key)
    );

    if (invalidFields.length > 0) {
      return {
        success: false,
        error: 'Cannot edit these fields',
        code: 'INVALID_FIELDS',
        details: { invalidFields }
      };
    }

    // Merge updates into metadata
    const newMetadata = {
      ...caseDoc.metadata,
      ...updates
    };

    const now = new Date().toISOString();
    const historyId = generateUUIDv7();

    // Update case
    const { data: updatedCase, error: updateError } = await supabase
      .from('cases')
      .update({
        metadata: newMetadata,
        updated_at: now,
        updated_by: userId
      })
      .eq('id', caseDoc.id)
      .select()
      .single();

    if (updateError) {
      return {
        success: false,
        error: updateError.message,
        code: 'UPDATE_FAILED'
      };
    }

    // Insert history
    await supabase.from('case_history').insert({
      id: historyId,
      case_id: caseDoc.id,
      action_type: 'field_update',
      user_id: userId,
      changes: updates,
      timestamp: now
    });

    return {
      success: true,
      caseId: caseDoc.id,
      historyId,
      timestamp: now
    };
  }

  /**
   * Validate action against permissions and rules
   */
  private validateAction(
    caseDoc: CaseDocument,
    action: CaseAction,
    userRole: UserRole
  ): { valid: boolean; error?: string; details?: unknown } {
    const rolePermission = this.getRolePermission(userRole);

    if (!rolePermission) {
      return { valid: false, error: 'Invalid role' };
    }

    // Validate based on action type
    switch (action.type) {
      case 'transition':
        const targetStage = action.payload.targetStage;
        if (!targetStage) {
          return { valid: false, error: 'Target stage required' };
        }

        const allowedTransitions = this.getAllowedTransitions(caseDoc, userRole);
        if (!allowedTransitions.some((t) => t.to === targetStage)) {
          return { valid: false, error: 'Transition not allowed' };
        }
        break;

      case 'update_fields':
        if (!rolePermission.canEdit) {
          return { valid: false, error: 'No edit permission' };
        }
        break;

      case 'add_document':
      case 'add_note':
        // Additional validation can be added here
        break;

      default:
        return { valid: false, error: 'Unknown action type' };
    }

    return { valid: true };
  }

  /**
   * Get allowed actions for current case state
   */
  private getAllowedActions(
    caseDoc: CaseDocument,
    userRole: UserRole
  ): string[] {
    const rolePermission = this.getRolePermission(userRole);
    const actions: string[] = [];

    if (!rolePermission) return actions;

    // Add actions based on permissions
    if (rolePermission.canEdit) {
      actions.push('edit_fields');
    }

    if (this.getAllowedTransitions(caseDoc, userRole).length > 0) {
      actions.push('transition_stage');
    }

    if (rolePermission.canAssign) {
      actions.push('assign_lawyer');
    }

    if (rolePermission.canApprove) {
      actions.push('approve_settlement');
    }

    // Add document and note actions
    actions.push('add_document', 'add_note');

    return actions;
  }

  /**
   * Evaluate transition rules
   */
  private evaluateTransitionRules(
    transition: TransitionRule,
    caseDoc: CaseDocument,
    userRole: UserRole
  ): boolean {
    if (!transition.conditions || transition.conditions.length === 0) {
      return true;
    }

    // Evaluate all conditions
    return transition.conditions.every((condition) => {
      switch (condition.type) {
        case 'field_required':
          return !!caseDoc.metadata[condition.field];

        case 'field_equals':
          return caseDoc.metadata[condition.field] === condition.value;

        case 'role_required':
          return condition.roles?.includes(userRole) ?? false;

        case 'custom':
          // Custom condition evaluation
          return condition.evaluate?.(caseDoc, userRole) ?? true;

        default:
          return true;
      }
    });
  }

  /**
   * Get stage configuration
   */
  private getStageConfig(stageKey: string): StageDefinition | undefined {
    return this.config.stages.find((s) => s.key === stageKey);
  }

  /**
   * Get role permission configuration
   */
  private getRolePermission(role: UserRole): RolePermission | undefined {
    return this.config.rolePermissions.find((rp) => rp.role === role);
  }

  /**
   * Validate pipeline configuration
   */
  private validateConfig(): void {
    // Check all stages referenced in transitions exist
    this.config.transitions.forEach((t) => {
      if (!this.getStageConfig(t.from)) {
        throw new Error(`Transition references unknown stage: ${t.from}`);
      }
      if (!this.getStageConfig(t.to)) {
        throw new Error(`Transition references unknown stage: ${t.to}`);
      }
    });

    // Check for circular transitions (optional)
    // Check all fields referenced in transitions exist
    this.config.transitions.forEach((t) => {
      t.requiredFields?.forEach((fieldKey) => {
        if (!this.config.fieldDefinitions.find((f) => f.key === fieldKey)) {
          throw new Error(
            `Transition requires unknown field: ${fieldKey}`
          );
        }
      });
    });

    // Validate role permissions
    this.config.rolePermissions.forEach((rp) => {
      rp.canTransitionFrom?.forEach((stageKey) => {
        if (!this.getStageConfig(stageKey)) {
          throw new Error(
            `Role permission references unknown stage: ${stageKey}`
          );
        }
      });
    });
  }

  /**
   * Execute add document action (stub)
   */
  private async executeAddDocument(
    caseDoc: CaseDocument,
    action: CaseAction,
    userId: string
  ): Promise<ActionResult> {
    // Implementation for adding documents
    return {
      success: true,
      caseId: caseDoc.id,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute add note action (stub)
   */
  private async executeAddNote(
    caseDoc: CaseDocument,
    action: CaseAction,
    userId: string
  ): Promise<ActionResult> {
    // Implementation for adding notes
    return {
      success: true,
      caseId: caseDoc.id,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Factory function to create executor for a pipeline
 */
export function createPipelineExecutor(config: PipelineConfig): PipelineExecutor {
  return new PipelineExecutor(config);
}
