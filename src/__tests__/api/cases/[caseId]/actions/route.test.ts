/**
 * Case Actions API Route Tests
 *
 * Tests for POST /api/cases/[caseId]/actions endpoint
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock Supabase
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn()
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
      { key: 'intake', name: 'Intake' },
      { key: 'review', name: 'Review' }
    ],
    transitions: [],
    fieldDefinitions: [],
    rolePermissions: []
  }))
}));

// Mock PipelineExecutor
const mockExecuteAction = vi.fn();
vi.mock('@/services/pipeline/PipelineExecutor', () => ({
  PipelineExecutor: class {
    async executeAction(...args: any[]) {
      return mockExecuteAction(...args);
    }
  }
}));

// Mock Zod validation
vi.mock('@/lib/schemas/pipelineConfig.schema', () => ({
  validateCaseAction: vi.fn((action) => {
    if (!action.type) throw new Error('Invalid action');
    return action;
  })
}));

describe('/api/cases/[caseId]/actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/cases/[caseId]/actions', () => {
    it('should execute transition action', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            user_metadata: { role: 'lawyer' }
          }
        },
        error: null
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'case-123',
            matter_type: 'insolvency',
            pipeline_stage: 'intake',
            metadata: {}
          },
          error: null
        })
      });

      mockExecuteAction.mockResolvedValue({
        success: true,
        data: {
          caseId: 'case-123',
          newStage: 'review'
        }
      });

      const { POST } = await import('@/app/api/cases/[caseId]/actions/route');
      const request = new NextRequest('http://localhost:3000/api/cases/case-123/actions', {
        method: 'POST',
        body: JSON.stringify({
          action: {
            type: 'transition',
            payload: {
              targetStage: 'review'
            }
          }
        })
      });

      const response = await POST(request, { params: { caseId: 'case-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.data.newStage).toBe('review');
    });

    it('should execute update_fields action', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            user_metadata: { role: 'lawyer' }
          }
        },
        error: null
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'case-123',
            matter_type: 'insolvency',
            pipeline_stage: 'intake',
            metadata: { client_name: 'Old Name' }
          },
          error: null
        })
      });

      mockExecuteAction.mockResolvedValue({
        success: true,
        data: {
          caseId: 'case-123',
          updatedFields: ['client_name']
        }
      });

      const { POST } = await import('@/app/api/cases/[caseId]/actions/route');
      const request = new NextRequest('http://localhost:3000/api/cases/case-123/actions', {
        method: 'POST',
        body: JSON.stringify({
          action: {
            type: 'update_fields',
            payload: {
              updates: {
                client_name: 'New Name'
              }
            }
          }
        })
      });

      const response = await POST(request, { params: { caseId: 'case-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 401 if not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      });

      const { POST } = await import('@/app/api/cases/[caseId]/actions/route');
      const request = new NextRequest('http://localhost:3000/api/cases/case-123/actions', {
        method: 'POST',
        body: JSON.stringify({
          action: { type: 'transition', payload: {} }
        })
      });

      const response = await POST(request, { params: { caseId: 'case-123' } });

      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid action', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      const { POST } = await import('@/app/api/cases/[caseId]/actions/route');
      const request = new NextRequest('http://localhost:3000/api/cases/case-123/actions', {
        method: 'POST',
        body: JSON.stringify({
          action: { /* missing type */ }
        })
      });

      const response = await POST(request, { params: { caseId: 'case-123' } });

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent case', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', user_metadata: { role: 'lawyer' } } },
        error: null
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' }
        })
      });

      const { POST } = await import('@/app/api/cases/[caseId]/actions/route');
      const request = new NextRequest('http://localhost:3000/api/cases/nonexistent/actions', {
        method: 'POST',
        body: JSON.stringify({
          action: { type: 'transition', payload: { targetStage: 'review' } }
        })
      });

      const response = await POST(request, { params: { caseId: 'nonexistent' } });

      expect(response.status).toBe(404);
    });

    it('should return 403 for unauthorized action', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            user_metadata: { role: 'paralegal' }
          }
        },
        error: null
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'case-123',
            matter_type: 'insolvency',
            pipeline_stage: 'intake'
          },
          error: null
        })
      });

      mockExecuteAction.mockResolvedValue({
        success: false,
        error: 'Transition not allowed',
        code: 'TRANSITION_NOT_ALLOWED'
      });

      const { POST } = await import('@/app/api/cases/[caseId]/actions/route');
      const request = new NextRequest('http://localhost:3000/api/cases/case-123/actions', {
        method: 'POST',
        body: JSON.stringify({
          action: {
            type: 'transition',
            payload: { targetStage: 'completed' }
          }
        })
      });

      const response = await POST(request, { params: { caseId: 'case-123' } });
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.result.code).toBe('TRANSITION_NOT_ALLOWED');
    });

    it('should handle add_document action', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', user_metadata: { role: 'lawyer' } } },
        error: null
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'case-123',
            matter_type: 'insolvency',
            pipeline_stage: 'intake'
          },
          error: null
        })
      });

      mockExecuteAction.mockResolvedValue({
        success: true,
        data: {
          documentId: 'doc-123'
        }
      });

      const { POST } = await import('@/app/api/cases/[caseId]/actions/route');
      const request = new NextRequest('http://localhost:3000/api/cases/case-123/actions', {
        method: 'POST',
        body: JSON.stringify({
          action: {
            type: 'add_document',
            payload: {
              documentType: 'bank_statement',
              fileUrl: 'https://example.com/doc.pdf'
            }
          }
        })
      });

      const response = await POST(request, { params: { caseId: 'case-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle add_note action', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', user_metadata: { role: 'lawyer' } } },
        error: null
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'case-123',
            matter_type: 'insolvency',
            pipeline_stage: 'intake'
          },
          error: null
        })
      });

      mockExecuteAction.mockResolvedValue({
        success: true,
        data: {
          noteId: 'note-123'
        }
      });

      const { POST } = await import('@/app/api/cases/[caseId]/actions/route');
      const request = new NextRequest('http://localhost:3000/api/cases/case-123/actions', {
        method: 'POST',
        body: JSON.stringify({
          action: {
            type: 'add_note',
            payload: {
              content: 'This is a test note',
              isInternal: true
            }
          }
        })
      });

      const response = await POST(request, { params: { caseId: 'case-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.data.noteId).toBe('note-123');
    });
  });
});
