/**
 * Cases API Route Tests
 *
 * Tests for GET /api/cases and POST /api/cases endpoints
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
  getPipeline: vi.fn((key: string) => {
    if (key === 'insolvency') {
      return {
        key: 'insolvency',
        name: 'Insolvency & Bankruptcy',
        version: '1.0.0',
        stages: [
          { key: 'intake', name: 'Intake', color: '#3B82F6' }
        ],
        transitions: [],
        fieldDefinitions: [],
        rolePermissions: []
      };
    }
    return undefined;
  }),
  getAllPipelines: vi.fn(() => [
    {
      key: 'insolvency',
      name: 'Insolvency & Bankruptcy',
      version: '1.0.0'
    }
  ])
}));

// Mock UUIDv7
vi.mock('@/lib/utils/uuidv7', () => ({
  generateUUIDv7: () => 'test-uuid-v7'
}));

describe('/api/cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/cases', () => {
    it('should return list of cases', async () => {
      // Mock auth
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      // Mock database query
      const mockCases = [
        {
          id: 'case-1',
          matter_type: 'insolvency',
          pipeline_stage: 'intake',
          status: 'active',
          client_id: 'client-1',
          assigned_lawyer: 'lawyer-1',
          metadata: { client_name: 'John Doe' },
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: mockCases,
          error: null,
          count: 1
        })
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      // Import and call the handler
      const { GET } = await import('@/app/api/cases/route');
      const request = new NextRequest('http://localhost:3000/api/cases');
      const response = await GET(request);

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.cases).toHaveLength(1);
      expect(data.cases[0].id).toBe('case-1');
      expect(data.count).toBe(1);
    });

    it('should filter by matterType', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0
        })
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const { GET } = await import('@/app/api/cases/route');
      const request = new NextRequest('http://localhost:3000/api/cases?matterType=insolvency');
      await GET(request);

      // Verify that eq was called with matterType
      expect(mockQuery.eq).toHaveBeenCalledWith('matter_type', 'insolvency');
    });

    it('should filter by status', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0
        })
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const { GET } = await import('@/app/api/cases/route');
      const request = new NextRequest('http://localhost:3000/api/cases?status=active');
      await GET(request);

      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'active');
    });

    it('should handle pagination', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 100
        })
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const { GET } = await import('@/app/api/cases/route');
      const request = new NextRequest('http://localhost:3000/api/cases?limit=20&offset=40');
      await GET(request);

      expect(mockQuery.range).toHaveBeenCalledWith(40, 59); // offset to offset+limit-1
    });

    it('should return 401 if not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      });

      const { GET } = await import('@/app/api/cases/route');
      const request = new NextRequest('http://localhost:3000/api/cases');
      const response = await GET(request);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/cases', () => {
    it('should create a new case', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'user@example.com' } },
        error: null
      });

      // Mock RPC call
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'test-uuid-v7',
            matter_type: 'insolvency',
            pipeline_stage: 'intake',
            status: 'active',
            metadata: { client_name: 'John Doe' }
          },
          error: null
        })
      });

      const { POST } = await import('@/app/api/cases/route');
      const request = new NextRequest('http://localhost:3000/api/cases', {
        method: 'POST',
        body: JSON.stringify({
          matterType: 'insolvency',
          clientId: 'client-123',
          assignedLawyer: 'lawyer-123',
          metadata: {
            client_name: 'John Doe'
          }
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.case.id).toBe('test-uuid-v7');
      expect(data.case.matterType).toBe('insolvency');
    });

    it('should return 400 for missing matterType', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      const { POST } = await import('@/app/api/cases/route');
      const request = new NextRequest('http://localhost:3000/api/cases', {
        method: 'POST',
        body: JSON.stringify({
          clientId: 'client-123'
          // Missing matterType
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should return 404 for invalid pipeline', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      const { POST } = await import('@/app/api/cases/route');
      const request = new NextRequest('http://localhost:3000/api/cases', {
        method: 'POST',
        body: JSON.stringify({
          matterType: 'nonexistent_pipeline',
          clientId: 'client-123'
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(404);
    });

    it('should return 401 if not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      });

      const { POST } = await import('@/app/api/cases/route');
      const request = new NextRequest('http://localhost:3000/api/cases', {
        method: 'POST',
        body: JSON.stringify({
          matterType: 'insolvency',
          clientId: 'client-123'
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
    });
  });
});
