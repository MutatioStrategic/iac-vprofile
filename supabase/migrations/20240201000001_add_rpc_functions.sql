-- =====================================================
-- Migration: RPC Functions for Transactional Operations
-- Description: Server-authoritative functions for atomic
--              case updates with history tracking
-- =====================================================

-- =====================================================
-- Function: execute_case_transition
-- Purpose: Atomically transition case to new stage with
--          optimistic locking and history tracking
-- =====================================================

CREATE OR REPLACE FUNCTION execute_case_transition(
  p_case_id UUID,
  p_from_stage TEXT,
  p_to_stage TEXT,
  p_user_id UUID,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_history_id UUID DEFAULT NULL,
  p_timestamp TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(
  case_id UUID,
  pipeline_stage TEXT,
  updated_at TIMESTAMPTZ,
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_history_id UUID;
  v_updated_count INTEGER;
BEGIN
  -- Generate history ID if not provided
  v_history_id := COALESCE(p_history_id, gen_random_uuid());

  -- Update case with optimistic locking
  -- Only succeeds if current stage matches p_from_stage
  UPDATE cases
  SET
    pipeline_stage = p_to_stage,
    updated_at = p_timestamp,
    updated_by = p_user_id::text
  WHERE
    id = p_case_id
    AND pipeline_stage = p_from_stage  -- Optimistic lock
    AND status = 'active';  -- Only transition active cases

  -- Check if update succeeded
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count = 0 THEN
    -- Update failed - either case not found or stage mismatch
    RETURN QUERY SELECT
      p_case_id,
      NULL::TEXT,
      NULL::TIMESTAMPTZ,
      FALSE,
      'Case not found, stage mismatch, or case not active'::TEXT;
    RETURN;
  END IF;

  -- Insert history record
  INSERT INTO case_history (
    id,
    case_id,
    action_type,
    user_id,
    from_stage,
    to_stage,
    metadata,
    timestamp,
    created_at
  ) VALUES (
    v_history_id,
    p_case_id,
    'stage_transition',
    p_user_id,
    p_from_stage,
    p_to_stage,
    p_metadata,
    p_timestamp,
    p_timestamp
  );

  -- Return success
  RETURN QUERY SELECT
    p_case_id,
    p_to_stage,
    p_timestamp,
    TRUE,
    NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Function: execute_case_update
-- Purpose: Atomically update case metadata fields
--          with history tracking
-- =====================================================

CREATE OR REPLACE FUNCTION execute_case_update(
  p_case_id UUID,
  p_user_id UUID,
  p_updates JSONB,
  p_timestamp TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(
  case_id UUID,
  metadata JSONB,
  updated_at TIMESTAMPTZ,
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_history_id UUID;
  v_old_metadata JSONB;
  v_new_metadata JSONB;
  v_updated_count INTEGER;
BEGIN
  -- Get current metadata
  SELECT metadata INTO v_old_metadata
  FROM cases
  WHERE id = p_case_id
    AND status = 'active';

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      p_case_id,
      NULL::JSONB,
      NULL::TIMESTAMPTZ,
      FALSE,
      'Case not found or not active'::TEXT;
    RETURN;
  END IF;

  -- Merge updates into existing metadata
  -- This preserves fields not being updated
  v_new_metadata := v_old_metadata || p_updates;

  -- Update case
  UPDATE cases
  SET
    metadata = v_new_metadata,
    updated_at = p_timestamp,
    updated_by = p_user_id::text
  WHERE id = p_case_id
    AND status = 'active';

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count = 0 THEN
    RETURN QUERY SELECT
      p_case_id,
      NULL::JSONB,
      NULL::TIMESTAMPTZ,
      FALSE,
      'Update failed'::TEXT;
    RETURN;
  END IF;

  -- Insert history record
  INSERT INTO case_history (
    id,
    case_id,
    action_type,
    user_id,
    changes,
    timestamp,
    created_at
  ) VALUES (
    gen_random_uuid(),
    p_case_id,
    'field_update',
    p_user_id,
    p_updates,
    p_timestamp,
    p_timestamp
  );

  -- Return success
  RETURN QUERY SELECT
    p_case_id,
    v_new_metadata,
    p_timestamp,
    TRUE,
    NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Function: create_case
-- Purpose: Create new case with initial stage and metadata
-- =====================================================

CREATE OR REPLACE FUNCTION create_case(
  p_case_id UUID,
  p_matter_type TEXT,
  p_pipeline_stage TEXT,
  p_pipeline_version TEXT,
  p_metadata JSONB,
  p_assigned_lawyer TEXT,
  p_client_id TEXT,
  p_user_id UUID,
  p_timestamp TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(
  case_id UUID,
  success BOOLEAN,
  error_message TEXT
) AS $$
BEGIN
  -- Insert case
  INSERT INTO cases (
    id,
    matter_type,
    pipeline_stage,
    pipeline_version,
    metadata,
    status,
    assigned_lawyer,
    client_id,
    created_at,
    updated_at,
    created_by,
    updated_by
  ) VALUES (
    p_case_id,
    p_matter_type,
    p_pipeline_stage,
    p_pipeline_version,
    p_metadata,
    'active',
    p_assigned_lawyer,
    p_client_id,
    p_timestamp,
    p_timestamp,
    p_user_id::text,
    p_user_id::text
  );

  -- Insert history record
  INSERT INTO case_history (
    id,
    case_id,
    action_type,
    user_id,
    to_stage,
    metadata,
    timestamp,
    created_at
  ) VALUES (
    gen_random_uuid(),
    p_case_id,
    'case_created',
    p_user_id,
    p_pipeline_stage,
    p_metadata,
    p_timestamp,
    p_timestamp
  );

  -- Return success
  RETURN QUERY SELECT
    p_case_id,
    TRUE,
    NULL::TEXT;

EXCEPTION WHEN OTHERS THEN
  -- Return error
  RETURN QUERY SELECT
    p_case_id,
    FALSE,
    SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Function: close_case
-- Purpose: Close case with final metadata
-- =====================================================

CREATE OR REPLACE FUNCTION close_case(
  p_case_id UUID,
  p_user_id UUID,
  p_close_metadata JSONB,
  p_timestamp TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(
  case_id UUID,
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  -- Update case to closed status
  UPDATE cases
  SET
    status = 'closed',
    metadata = metadata || p_close_metadata,
    updated_at = p_timestamp,
    updated_by = p_user_id::text
  WHERE id = p_case_id
    AND status = 'active';

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count = 0 THEN
    RETURN QUERY SELECT
      p_case_id,
      FALSE,
      'Case not found or already closed'::TEXT;
    RETURN;
  END IF;

  -- Insert history record
  INSERT INTO case_history (
    id,
    case_id,
    action_type,
    user_id,
    metadata,
    timestamp,
    created_at
  ) VALUES (
    gen_random_uuid(),
    p_case_id,
    'case_closed',
    p_user_id,
    p_close_metadata,
    p_timestamp,
    p_timestamp
  );

  -- Return success
  RETURN QUERY SELECT
    p_case_id,
    TRUE,
    NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Function: get_case_with_history
-- Purpose: Fetch case with recent history in single query
-- =====================================================

CREATE OR REPLACE FUNCTION get_case_with_history(
  p_case_id UUID,
  p_history_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
  case_data JSONB,
  history JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    to_jsonb(c.*) as case_data,
    COALESCE(
      jsonb_agg(
        to_jsonb(h.*)
        ORDER BY h.timestamp DESC
      ) FILTER (WHERE h.id IS NOT NULL),
      '[]'::jsonb
    ) as history
  FROM cases c
  LEFT JOIN LATERAL (
    SELECT *
    FROM case_history
    WHERE case_id = p_case_id
    ORDER BY timestamp DESC
    LIMIT p_history_limit
  ) h ON true
  WHERE c.id = p_case_id
  GROUP BY c.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Grant Execute Permissions
-- =====================================================

GRANT EXECUTE ON FUNCTION execute_case_transition TO authenticated;
GRANT EXECUTE ON FUNCTION execute_case_update TO authenticated;
GRANT EXECUTE ON FUNCTION create_case TO authenticated;
GRANT EXECUTE ON FUNCTION close_case TO authenticated;
GRANT EXECUTE ON FUNCTION get_case_with_history TO authenticated;

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON FUNCTION execute_case_transition IS
  'Atomically transition case stage with optimistic locking and history tracking';

COMMENT ON FUNCTION execute_case_update IS
  'Update case metadata fields with automatic history logging';

COMMENT ON FUNCTION create_case IS
  'Create new case with initial stage and metadata';

COMMENT ON FUNCTION close_case IS
  'Close case and add final metadata';

COMMENT ON FUNCTION get_case_with_history IS
  'Fetch case with recent history in a single optimized query';
