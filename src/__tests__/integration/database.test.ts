/**
 * Database Integration Tests
 *
 * Tests for database operations and RPC functions
 * These tests require a local Supabase instance or test database
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { generateUUIDv7 } from '@/lib/utils/uuidv7';

// Skip these tests if not in integration test environment
const isIntegrationTest = process.env.RUN_INTEGRATION_TESTS === 'true';
const describeIf = isIntegrationTest ? describe : describe.skip;

describeIf('Database Integration Tests', () => {
  let supabase: ReturnType<typeof createClient>;
  let testCaseId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Create Supabase client for testing
    supabase = createClient(
      process.env.TEST_SUPABASE_URL || 'http://localhost:54321',
      process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || 'test-service-key',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    testUserId = generateUUIDv7();
  });

  afterAll(async () => {
    // Cleanup test data
    if (testCaseId) {
      await supabase.from('cases').delete().eq('id', testCaseId);
    }
  });

  beforeEach(async () => {
    testCaseId = generateUUIDv7();
  });

  describe('RPC: create_case', () => {
    it('should create a new case', async () => {
      const { data, error } = await supabase.rpc('create_case', {
        p_case_id: testCaseId,
        p_matter_type: 'insolvency',
        p_pipeline_stage: 'intake',
        p_pipeline_version: '1.0.0',
        p_client_id: 'client-123',
        p_assigned_lawyer: 'lawyer-123',
        p_metadata: { client_name: 'Test Client' },
        p_user_id: testUserId,
        p_timestamp: new Date().toISOString()
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data[0].case_id).toBe(testCaseId);
      expect(data[0].success).toBe(true);
    });

    it('should reject duplicate case ID', async () => {
      // Create first case
      await supabase.rpc('create_case', {
        p_case_id: testCaseId,
        p_matter_type: 'insolvency',
        p_pipeline_stage: 'intake',
        p_pipeline_version: '1.0.0',
        p_user_id: testUserId,
        p_timestamp: new Date().toISOString()
      });

      // Try to create with same ID
      const { data, error } = await supabase.rpc('create_case', {
        p_case_id: testCaseId,
        p_matter_type: 'insolvency',
        p_pipeline_stage: 'intake',
        p_pipeline_version: '1.0.0',
        p_user_id: testUserId,
        p_timestamp: new Date().toISOString()
      });

      expect(error).not.toBeNull();
    });

    it('should create case with default values', async () => {
      const { data, error } = await supabase.rpc('create_case', {
        p_case_id: testCaseId,
        p_matter_type: 'insolvency',
        p_pipeline_stage: 'intake',
        p_user_id: testUserId
      });

      expect(error).toBeNull();
      expect(data[0].success).toBe(true);
    });
  });

  describe('RPC: execute_case_transition', () => {
    beforeEach(async () => {
      // Create a test case
      await supabase.rpc('create_case', {
        p_case_id: testCaseId,
        p_matter_type: 'insolvency',
        p_pipeline_stage: 'intake',
        p_user_id: testUserId
      });
    });

    it('should execute valid transition', async () => {
      const { data, error } = await supabase.rpc('execute_case_transition', {
        p_case_id: testCaseId,
        p_from_stage: 'intake',
        p_to_stage: 'document_collection',
        p_user_id: testUserId,
        p_metadata: { reason: 'All documents received' },
        p_history_id: generateUUIDv7(),
        p_timestamp: new Date().toISOString()
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data[0].success).toBe(true);
      expect(data[0].new_stage).toBe('document_collection');
    });

    it('should reject transition with wrong from_stage (optimistic locking)', async () => {
      const { data, error } = await supabase.rpc('execute_case_transition', {
        p_case_id: testCaseId,
        p_from_stage: 'wrong_stage',
        p_to_stage: 'document_collection',
        p_user_id: testUserId,
        p_history_id: generateUUIDv7(),
        p_timestamp: new Date().toISOString()
      });

      expect(data).toBeDefined();
      expect(data[0].success).toBe(false);
      expect(data[0].error).toContain('mismatch');
    });

    it('should create history entry on transition', async () => {
      const historyId = generateUUIDv7();

      await supabase.rpc('execute_case_transition', {
        p_case_id: testCaseId,
        p_from_stage: 'intake',
        p_to_stage: 'document_collection',
        p_user_id: testUserId,
        p_history_id: historyId,
        p_timestamp: new Date().toISOString()
      });

      // Verify history entry was created
      const { data: history, error } = await supabase
        .from('case_history')
        .select('*')
        .eq('id', historyId)
        .single();

      expect(error).toBeNull();
      expect(history).toBeDefined();
      expect(history.case_id).toBe(testCaseId);
      expect(history.action_type).toBe('transition');
      expect(history.from_stage).toBe('intake');
      expect(history.to_stage).toBe('document_collection');
    });
  });

  describe('RPC: execute_case_update', () => {
    beforeEach(async () => {
      await supabase.rpc('create_case', {
        p_case_id: testCaseId,
        p_matter_type: 'insolvency',
        p_pipeline_stage: 'intake',
        p_metadata: { client_name: 'Original Name' },
        p_user_id: testUserId
      });
    });

    it('should update case metadata', async () => {
      const { data, error } = await supabase.rpc('execute_case_update', {
        p_case_id: testCaseId,
        p_user_id: testUserId,
        p_updates: { client_name: 'Updated Name', phone: '555-1234' },
        p_history_id: generateUUIDv7(),
        p_timestamp: new Date().toISOString()
      });

      expect(error).toBeNull();
      expect(data[0].success).toBe(true);

      // Verify the update
      const { data: caseData } = await supabase
        .from('cases')
        .select('metadata')
        .eq('id', testCaseId)
        .single();

      expect(caseData.metadata.client_name).toBe('Updated Name');
      expect(caseData.metadata.phone).toBe('555-1234');
    });

    it('should create history entry on update', async () => {
      const historyId = generateUUIDv7();

      await supabase.rpc('execute_case_update', {
        p_case_id: testCaseId,
        p_user_id: testUserId,
        p_updates: { client_name: 'Updated Name' },
        p_history_id: historyId,
        p_timestamp: new Date().toISOString()
      });

      const { data: history } = await supabase
        .from('case_history')
        .select('*')
        .eq('id', historyId)
        .single();

      expect(history.action_type).toBe('update_fields');
      expect(history.changes).toBeDefined();
    });
  });

  describe('RPC: get_case_with_history', () => {
    beforeEach(async () => {
      await supabase.rpc('create_case', {
        p_case_id: testCaseId,
        p_matter_type: 'insolvency',
        p_pipeline_stage: 'intake',
        p_user_id: testUserId
      });

      // Create some history
      await supabase.rpc('execute_case_transition', {
        p_case_id: testCaseId,
        p_from_stage: 'intake',
        p_to_stage: 'document_collection',
        p_user_id: testUserId,
        p_history_id: generateUUIDv7(),
        p_timestamp: new Date().toISOString()
      });
    });

    it('should return case with history', async () => {
      const { data, error } = await supabase.rpc('get_case_with_history', {
        p_case_id: testCaseId,
        p_history_limit: 10
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data[0].case_data).toBeDefined();
      expect(data[0].history).toBeDefined();
      expect(data[0].history.length).toBeGreaterThan(0);
    });

    it('should limit history entries', async () => {
      // Create more history entries
      for (let i = 0; i < 5; i++) {
        await supabase.rpc('execute_case_update', {
          p_case_id: testCaseId,
          p_user_id: testUserId,
          p_updates: { note: `Update ${i}` },
          p_history_id: generateUUIDv7(),
          p_timestamp: new Date().toISOString()
        });
      }

      const { data } = await supabase.rpc('get_case_with_history', {
        p_case_id: testCaseId,
        p_history_limit: 3
      });

      expect(data[0].history.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Database Indexes', () => {
    it('should efficiently query by matter_type and status', async () => {
      // Create multiple test cases
      const caseIds = [];
      for (let i = 0; i < 10; i++) {
        const caseId = generateUUIDv7();
        caseIds.push(caseId);
        await supabase.rpc('create_case', {
          p_case_id: caseId,
          p_matter_type: 'insolvency',
          p_pipeline_stage: 'intake',
          p_user_id: testUserId
        });
      }

      // Query using indexed columns
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('matter_type', 'insolvency')
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(5);

      const queryTime = Date.now() - startTime;

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(queryTime).toBeLessThan(1000); // Should be fast with indexes

      // Cleanup
      for (const id of caseIds) {
        await supabase.from('cases').delete().eq('id', id);
      }
    });

    it('should efficiently query metadata with GIN index', async () => {
      const caseId = generateUUIDv7();
      await supabase.rpc('create_case', {
        p_case_id: caseId,
        p_matter_type: 'insolvency',
        p_pipeline_stage: 'intake',
        p_metadata: { client_name: 'Searchable Name', tags: ['urgent', 'priority'] },
        p_user_id: testUserId
      });

      // Query using JSONB operator
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .contains('metadata', { tags: ['urgent'] });

      expect(error).toBeNull();
      expect(data.length).toBeGreaterThan(0);

      await supabase.from('cases').delete().eq('id', caseId);
    });
  });

  describe('RLS Policies', () => {
    it('should enforce row-level security', async () => {
      // Create a client without service role
      const anonClient = createClient(
        process.env.TEST_SUPABASE_URL || 'http://localhost:54321',
        process.env.TEST_SUPABASE_ANON_KEY || 'test-anon-key'
      );

      // Try to query without authentication
      const { data, error } = await anonClient
        .from('cases')
        .select('*');

      // Should fail or return empty due to RLS
      expect(data?.length || 0).toBe(0);
    });
  });

  describe('Concurrent Updates', () => {
    it('should handle concurrent transitions with optimistic locking', async () => {
      const { data, error } = await supabase.rpc('create_case', {
        p_case_id: testCaseId,
        p_matter_type: 'insolvency',
        p_pipeline_stage: 'intake',
        p_user_id: testUserId
      });

      // Simulate concurrent transitions
      const transition1 = supabase.rpc('execute_case_transition', {
        p_case_id: testCaseId,
        p_from_stage: 'intake',
        p_to_stage: 'document_collection',
        p_user_id: testUserId,
        p_history_id: generateUUIDv7(),
        p_timestamp: new Date().toISOString()
      });

      const transition2 = supabase.rpc('execute_case_transition', {
        p_case_id: testCaseId,
        p_from_stage: 'intake',
        p_to_stage: 'review',
        p_user_id: testUserId,
        p_history_id: generateUUIDv7(),
        p_timestamp: new Date().toISOString()
      });

      const results = await Promise.all([transition1, transition2]);

      // One should succeed, one should fail
      const successes = results.filter(r => r.data?.[0]?.success).length;
      const failures = results.filter(r => !r.data?.[0]?.success).length;

      expect(successes).toBe(1);
      expect(failures).toBe(1);
    });
  });
});
