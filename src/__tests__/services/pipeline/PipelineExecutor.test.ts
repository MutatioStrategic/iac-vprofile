/**
 * PipelineExecutor Unit Tests
 *
 * Tests the core pipeline execution engine functionality including:
 * - Transition validation
 * - Field permissions
 * - ViewModel computation
 * - Action execution
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PipelineExecutor } from '@/services/pipeline/PipelineExecutor';
import type { PipelineConfig, CaseDocument, CaseAction } from '@/types/pipeline.types';
import type { UserRole } from '@/types/auth.types';

// Mock Supabase client
vi.mock('@/services/supabase/client', () => ({
  createSupabaseClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: mockCaseDocument,
            error: null
          }))
        }))
      })),
    })),
    rpc: vi.fn((functionName, params) => {
      if (functionName === 'execute_case_transition') {
        return Promise.resolve({
          data: [{
            case_id: params.p_case_id,
            new_stage: params.p_to_stage,
            timestamp: params.p_timestamp,
            success: true,
            error: null
          }],
          error: null
        });
      }
      return Promise.resolve({ data: null, error: null });
    }),
  }),
}));

// Mock UUID generator
vi.mock('@/lib/utils/uuidv7', () => ({
  generateUUIDv7: () => 'test-uuid-v7',
}));

// Test data
const mockPipelineConfig: PipelineConfig = {
  key: 'test_pipeline',
  name: 'Test Pipeline',
  version: '1.0.0',
  stages: [
    {
      key: 'intake',
      name: 'Intake',
      description: 'Initial intake',
      color: '#3B82F6',
      estimatedDuration: { value: 2, unit: 'days' }
    },
    {
      key: 'review',
      name: 'Review',
      description: 'Review documents',
      color: '#10B981',
      estimatedDuration: { value: 3, unit: 'days' }
    },
    {
      key: 'approval',
      name: 'Approval',
      description: 'Final approval',
      color: '#8B5CF6',
      estimatedDuration: { value: 1, unit: 'days' }
    },
    {
      key: 'completed',
      name: 'Completed',
      description: 'Case completed',
      color: '#22C55E',
      estimatedDuration: { value: 0, unit: 'days' }
    }
  ],
  transitions: [
    {
      from: 'intake',
      to: 'review',
      label: 'Move to Review',
      requiredFields: ['client_name', 'case_type'],
      conditions: []
    },
    {
      from: 'review',
      to: 'approval',
      label: 'Request Approval',
      requiredFields: ['review_notes'],
      requiresApproval: true,
      conditions: []
    },
    {
      from: 'approval',
      to: 'completed',
      label: 'Complete Case',
      requiredFields: [],
      conditions: []
    }
  ],
  fieldDefinitions: [
    {
      key: 'client_name',
      label: 'Client Name',
      type: 'text',
      stages: ['*'],
      validation: { required: true }
    },
    {
      key: 'case_type',
      label: 'Case Type',
      type: 'select',
      stages: ['intake', 'review'],
      options: ['type_a', 'type_b'],
      validation: { required: true }
    },
    {
      key: 'review_notes',
      label: 'Review Notes',
      type: 'textarea',
      stages: ['review', 'approval'],
      validation: { required: true }
    },
    {
      key: 'internal_notes',
      label: 'Internal Notes',
      type: 'textarea',
      stages: ['*'],
      readOnly: false
    }
  ],
  rolePermissions: [
    {
      role: 'lawyer',
      canEdit: true,
      canDelete: false,
      canApprove: true,
      canAssign: true,
      canTransitionFrom: ['intake', 'review', 'approval'],
      editableFields: ['client_name', 'case_type', 'review_notes', 'internal_notes']
    },
    {
      role: 'paralegal',
      canEdit: true,
      canDelete: false,
      canApprove: false,
      canAssign: false,
      canTransitionFrom: ['intake', 'review'],
      editableFields: ['client_name', 'case_type', 'internal_notes']
    },
    {
      role: 'admin',
      canEdit: true,
      canDelete: true,
      canApprove: true,
      canAssign: true,
      canTransitionFrom: ['*'],
      editableFields: ['*']
    }
  ]
};

const mockCaseDocument: CaseDocument = {
  id: 'case-123',
  matterType: 'test_pipeline',
  pipelineStage: 'intake',
  pipelineVersion: '1.0.0',
  status: 'active',
  clientId: 'client-123',
  assignedLawyer: 'lawyer-123',
  metadata: {
    client_name: 'John Doe',
    case_type: 'type_a'
  },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  createdBy: 'user-123',
  updatedBy: 'user-123'
};

describe('PipelineExecutor', () => {
  let executor: PipelineExecutor;

  beforeEach(() => {
    executor = new PipelineExecutor(mockPipelineConfig);
  });

  describe('getAllowedTransitions', () => {
    it('should return allowed transitions for lawyer from intake stage', () => {
      const transitions = executor.getAllowedTransitions(mockCaseDocument, 'lawyer');

      expect(transitions).toHaveLength(1);
      expect(transitions[0].to).toBe('review');
      expect(transitions[0].label).toBe('Move to Review');
      expect(transitions[0].requiredFields).toEqual(['client_name', 'case_type']);
    });

    it('should return allowed transitions for paralegal from intake stage', () => {
      const transitions = executor.getAllowedTransitions(mockCaseDocument, 'paralegal');

      expect(transitions).toHaveLength(1);
      expect(transitions[0].to).toBe('review');
    });

    it('should not allow paralegal to transition from approval stage', () => {
      const caseInApproval = { ...mockCaseDocument, pipelineStage: 'approval' };
      const transitions = executor.getAllowedTransitions(caseInApproval, 'paralegal');

      expect(transitions).toHaveLength(0);
    });

    it('should allow admin to transition from any stage', () => {
      const caseInApproval = { ...mockCaseDocument, pipelineStage: 'approval' };
      const transitions = executor.getAllowedTransitions(caseInApproval, 'admin');

      expect(transitions).toHaveLength(1);
      expect(transitions[0].to).toBe('completed');
    });

    it('should return empty array for invalid stage', () => {
      const caseWithInvalidStage = { ...mockCaseDocument, pipelineStage: 'nonexistent' };
      const transitions = executor.getAllowedTransitions(caseWithInvalidStage, 'lawyer');

      expect(transitions).toHaveLength(0);
    });
  });

  describe('getEditableFields', () => {
    it('should return editable fields for lawyer at intake stage', () => {
      const fields = executor.getEditableFields(mockCaseDocument, 'lawyer');

      const fieldKeys = fields.map(f => f.key);
      expect(fieldKeys).toContain('client_name');
      expect(fieldKeys).toContain('case_type');
      expect(fieldKeys).toContain('internal_notes');
      expect(fieldKeys).not.toContain('review_notes'); // Not in intake stage
    });

    it('should return limited fields for paralegal', () => {
      const fields = executor.getEditableFields(mockCaseDocument, 'paralegal');

      const fieldKeys = fields.map(f => f.key);
      expect(fieldKeys).toContain('client_name');
      expect(fieldKeys).toContain('case_type');
      expect(fieldKeys).toContain('internal_notes');
      expect(fieldKeys).not.toContain('review_notes');
    });

    it('should not return read-only fields', () => {
      const configWithReadOnly = {
        ...mockPipelineConfig,
        fieldDefinitions: [
          ...mockPipelineConfig.fieldDefinitions,
          {
            key: 'readonly_field',
            label: 'Read Only',
            type: 'text',
            stages: ['*'],
            readOnly: true
          } as any
        ]
      };

      const executorWithReadOnly = new PipelineExecutor(configWithReadOnly);
      const fields = executorWithReadOnly.getEditableFields(mockCaseDocument, 'lawyer');

      const fieldKeys = fields.map(f => f.key);
      expect(fieldKeys).not.toContain('readonly_field');
    });

    it('should return all fields for admin with wildcard permissions', () => {
      const caseInReview = { ...mockCaseDocument, pipelineStage: 'review' };
      const fields = executor.getEditableFields(caseInReview, 'admin');

      expect(fields.length).toBeGreaterThan(0);
    });
  });

  describe('computeViewModel', () => {
    it('should compute correct ViewModel for lawyer at intake stage', () => {
      const viewModel = executor.computeViewModel(mockCaseDocument, 'lawyer');

      expect(viewModel.caseId).toBe('case-123');
      expect(viewModel.matterType).toBe('test_pipeline');
      expect(viewModel.currentStage.key).toBe('intake');
      expect(viewModel.currentStage.name).toBe('Intake');
      expect(viewModel.progress).toBe(25); // 1/4 stages = 25%
      expect(viewModel.permissions.canEdit).toBe(true);
      expect(viewModel.permissions.canDelete).toBe(false);
      expect(viewModel.permissions.canApprove).toBe(true);
    });

    it('should compute correct progress percentage', () => {
      const caseInReview = { ...mockCaseDocument, pipelineStage: 'review' };
      const viewModel = executor.computeViewModel(caseInReview, 'lawyer');

      expect(viewModel.progress).toBe(50); // 2/4 stages = 50%
    });

    it('should include timeline with stage statuses', () => {
      const caseInReview = { ...mockCaseDocument, pipelineStage: 'review' };
      const viewModel = executor.computeViewModel(caseInReview, 'lawyer');

      expect(viewModel.timeline.stages).toHaveLength(4);
      expect(viewModel.timeline.stages[0].status).toBe('completed'); // intake
      expect(viewModel.timeline.stages[1].status).toBe('active'); // review
      expect(viewModel.timeline.stages[2].status).toBe('pending'); // approval
      expect(viewModel.timeline.stages[3].status).toBe('pending'); // completed
    });

    it('should mark transitions in timeline', () => {
      const viewModel = executor.computeViewModel(mockCaseDocument, 'lawyer');

      const reviewStage = viewModel.timeline.stages.find(s => s.key === 'review');
      expect(reviewStage?.canTransitionTo).toBe(true);
    });

    it('should include field values in displayFields', () => {
      const viewModel = executor.computeViewModel(mockCaseDocument, 'lawyer');

      const clientNameField = viewModel.displayFields.find(f => f.key === 'client_name');
      expect(clientNameField?.value).toBe('John Doe');
    });

    it('should mark fields as editable correctly', () => {
      const viewModel = executor.computeViewModel(mockCaseDocument, 'lawyer');

      const editableField = viewModel.displayFields.find(f => f.key === 'client_name');
      expect(editableField?.isEditable).toBe(true);
    });
  });

  describe('executeAction - transition', () => {
    it('should execute valid transition', async () => {
      const action: CaseAction = {
        type: 'transition',
        payload: {
          targetStage: 'review',
          metadata: {}
        }
      };

      const result = await executor.executeAction(
        'case-123',
        action,
        'user-123',
        'lawyer'
      );

      expect(result.success).toBe(true);
      expect(result.data?.newStage).toBe('review');
    });

    it('should reject invalid transition', async () => {
      const action: CaseAction = {
        type: 'transition',
        payload: {
          targetStage: 'completed', // Cannot go directly from intake to completed
          metadata: {}
        }
      };

      const result = await executor.executeAction(
        'case-123',
        action,
        'user-123',
        'lawyer'
      );

      expect(result.success).toBe(false);
      expect(result.code).toBe('TRANSITION_NOT_ALLOWED');
    });

    it('should reject transition for unauthorized role', async () => {
      const caseInApproval = { ...mockCaseDocument, pipelineStage: 'approval' };

      // Mock the fetch to return approval stage case
      vi.mocked(vi.fn()).mockResolvedValueOnce({
        data: caseInApproval,
        error: null
      });

      const action: CaseAction = {
        type: 'transition',
        payload: {
          targetStage: 'completed',
          metadata: {}
        }
      };

      const result = await executor.executeAction(
        'case-123',
        action,
        'user-123',
        'paralegal' // Paralegal cannot transition from approval
      );

      expect(result.success).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle missing case gracefully', async () => {
      // Override mock to return no case
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: null,
                error: { message: 'Not found' }
              }))
            }))
          }))
        }))
      };

      const { createSupabaseClient } = await import('@/services/supabase/client');
      vi.mocked(createSupabaseClient).mockReturnValue(mockSupabase as any);

      const action: CaseAction = {
        type: 'transition',
        payload: { targetStage: 'review' }
      };

      const result = await executor.executeAction(
        'nonexistent-case',
        action,
        'user-123',
        'lawyer'
      );

      expect(result.success).toBe(false);
      expect(result.code).toBe('CASE_NOT_FOUND');
    });

    it('should handle unknown action type', async () => {
      const action: any = {
        type: 'unknown_action_type',
        payload: {}
      };

      const result = await executor.executeAction(
        'case-123',
        action,
        'user-123',
        'lawyer'
      );

      expect(result.success).toBe(false);
      expect(result.code).toBe('UNKNOWN_ACTION');
    });

    it('should validate config on construction', () => {
      const invalidConfig: any = {
        key: 'invalid',
        // Missing required fields
      };

      expect(() => new PipelineExecutor(invalidConfig)).toThrow();
    });
  });

  describe('role permissions', () => {
    it('should respect paralegal limitations', () => {
      const viewModel = executor.computeViewModel(mockCaseDocument, 'paralegal');

      expect(viewModel.permissions.canApprove).toBe(false);
      expect(viewModel.permissions.canDelete).toBe(false);
      expect(viewModel.permissions.canAssign).toBe(false);
    });

    it('should grant full permissions to admin', () => {
      const viewModel = executor.computeViewModel(mockCaseDocument, 'admin');

      expect(viewModel.permissions.canEdit).toBe(true);
      expect(viewModel.permissions.canDelete).toBe(true);
      expect(viewModel.permissions.canApprove).toBe(true);
      expect(viewModel.permissions.canAssign).toBe(true);
    });
  });

  describe('field validation', () => {
    it('should filter fields by stage', () => {
      const caseInApproval = { ...mockCaseDocument, pipelineStage: 'approval' };
      const fields = executor.getEditableFields(caseInApproval, 'lawyer');

      const fieldKeys = fields.map(f => f.key);
      expect(fieldKeys).not.toContain('case_type'); // Only in intake/review
      expect(fieldKeys).toContain('review_notes'); // In approval stage
    });

    it('should include wildcard fields in all stages', () => {
      const stages = ['intake', 'review', 'approval', 'completed'];

      stages.forEach(stage => {
        const caseInStage = { ...mockCaseDocument, pipelineStage: stage };
        const fields = executor.getEditableFields(caseInStage, 'lawyer');
        const fieldKeys = fields.map(f => f.key);

        expect(fieldKeys).toContain('client_name'); // Wildcard field
      });
    });
  });
});
