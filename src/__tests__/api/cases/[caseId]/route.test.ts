/**
 * Case Detail API Route Tests
 *
 * Tests for GET /api/cases/[caseId] and PATCH /api/cases/[caseId] endpoints
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock Supabase
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(),
  rpc: vi.fn()
};

vi.mock('@/services/supabase/client', () => ({
  createSupabaseServerClient: () => mockSupabaseClient,
  createSupabaseClient: () => mockSupabaseClient
}));

// Mock pipeline registry
vi.mock('@/services/pipelines/registry', () => ({
  getPipeline: vi.fn(() => ({
    key: 'insolvency',
    name: 'Insolvency & Bankruptcy',
    version: '1.0.0',
    stages: [
      { key: 'intake', name: 'Intake', color: '#3B82F6' },
      { key: 'review', name: 'Review', color: '#10B981' }
    ],
    transitions: [
      { from: 'intake', to: 'review', label: 'Move to Review' }
    ],
    fieldDefinitions: [
      {
        key: 'client_name',
        label: 'Client Name',
        type: 'text',
        stages: ['*'],
        validation: { required: true }
      }
    ],
    rolePermissions: [
      {
        role: 'lawyer',
        canEdit: true,
        canTransitionFrom: ['intake', 'review'],
        editableFields: ['client_name']
      }
    ]
  }))
}));

// Mock PipelineExecutor
vi.mock('@/services/pipeline/PipelineExecutor', () => ({
  PipelineExecutor: class {
    computeViewModel() {
      return {
        caseId: 'case-123',
        matterType: 'insolvency',
        currentStage: { key: 'intake', name: 'Intake' },
        progress: 50,
        allowedTransitions: [],
        editableFields: [],
        displayFields: [],
        allowedActions: [],
        permissions: { canEdit: true },
        timeline: { stages: [] }
      };
    }
  }
}));

describe('/api/cases/[caseId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/cases/[caseId]', () => {
    it('should return case with ViewModel', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      const mockCaseData = {
        id: 'case-123',
        matter_type: 'insolvency',
        pipeline_stage: 'intake',
        pipeline_version: '1.0.0',
        status: 'active',
        client_id: 'client-123',
        assigned_lawyer: 'lawyer-123',
        metadata: { client_name: 'John Doe' },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user-123',
        updated_by: 'user-123'
      };

      const mockHistory = [
        {
          id: 'history-1',
          case_id: 'case-123',
          action_type: 'transition',
          user_id: 'user-123',
          from_stage: null,
          to_stage: 'intake',
          changes: {},
          timestamp: '2024-01-01T00:00:00Z'
        }
      ];

      mockSupabaseClient.rpc.mockResolvedValue({
        data: [
          {
            case_data: mockCaseData,
            history: mockHistory
          }
        ],
        error: null
      });

      const { GET } = await import('@/app/api/cases/[caseId]/route');
      const request = new NextRequest('http://localhost:3000/api/cases/case-123');
      const response = await GET(request, { params: { caseId: 'case-123' } });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.case.id).toBe('case-123');
      expect(data.viewModel).toBeDefined();
      expect(data.pipelineConfig).toBeDefined();
      expect(data.history).toBeDefined();
    });

    it('should return 404 for non-existent case', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      mockSupabaseClient.rpc.mockResolvedValue({
        data: [],
        error: null
      });

      const { GET } = await import('@/app/api/cases/[caseId]/route');
      const request = new NextRequest('http://localhost:3000/api/cases/nonexistent');
      const response = await GET(request, { params: { caseId: 'nonexistent' } });

      expect(response.status).toBe(404);
    });

    it('should return 401 if not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      });

      const { GET } = await import('@/app/api/cases/[caseId]/route');
      const request = new NextRequest('http://localhost:3000/api/cases/case-123');
      const response = await GET(request, { params: { caseId: 'case-123' } });

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/cases/[caseId]', () => {
    it('should update case metadata', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      mockSupabaseClient.rpc.mockResolvedValue({
        data: [{
          case_id: 'case-123',
          success: true
        }],
        error: null
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'case-123',
            matter_type: 'insolvency',
            metadata: { client_name: 'Jane Doe' }
          },
          error: null
        })
      });

      const { PATCH } = await import('@/app/api/cases/[caseId]/route');
      const request = new NextRequest('http://localhost:3000/api/cases/case-123', {
        method: 'PATCH',
        body: JSON.stringify({
          metadata: {
            client_name: 'Jane Doe'
          }
        })
      });

      const response = await PATCH(request, { params: { caseId: 'case-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.case.metadata.client_name).toBe('Jane Doe');
    });

    it('should update assigned lawyer', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      const mockUpdate = vi.fn().mockResolvedValue({
        data: { id: 'case-123', assigned_lawyer: 'new-lawyer-123' },
        error: null
      });

      mockSupabaseClient.from.mockReturnValue({
        update: mockUpdate,
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'case-123', assigned_lawyer: 'new-lawyer-123' },
          error: null
        })
      });

      const { PATCH } = await import('@/app/api/cases/[caseId]/route');
      const request = new NextRequest('http://localhost:3000/api/cases/case-123', {
        method: 'PATCH',
        body: JSON.stringify({
          assignedLawyer: 'new-lawyer-123'
        })
      });

      const response = await PATCH(request, { params: { caseId: 'case-123' } });

      expect(response.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith({
        assigned_lawyer: 'new-lawyer-123',
        updated_at: expect.any(String),
        updated_by: 'user-123'
      });
    });

    it('should return 401 if not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      });

      const { PATCH } = await import('@/app/api/cases/[caseId]/route');
      const request = new NextRequest('http://localhost:3000/api/cases/case-123', {
        method: 'PATCH',
        body: JSON.stringify({ metadata: {} })
      });

      const response = await PATCH(request, { params: { caseId: 'case-123' } });

      expect(response.status).toBe(401);
    });

    it('should return 500 on database error', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      const { PATCH } = await import('@/app/api/cases/[caseId]/route');
      const request = new NextRequest('http://localhost:3000/api/cases/case-123', {
        method: 'PATCH',
        body: JSON.stringify({
          metadata: { client_name: 'Test' }
        })
      });

      const response = await PATCH(request, { params: { caseId: 'case-123' } });

      expect(response.status).toBe(500);
    });
  });
});
