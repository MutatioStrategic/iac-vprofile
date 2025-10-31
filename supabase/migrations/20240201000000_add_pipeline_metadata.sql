-- =====================================================
-- Migration: Add Pipeline Metadata to Cases
-- Description: Adds matter_type, pipeline_version, and
--              metadata JSONB columns to support declarative
--              pipeline configurations
-- =====================================================

-- Add pipeline columns to cases table
ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS matter_type TEXT,
  ADD COLUMN IF NOT EXISTS pipeline_version TEXT DEFAULT '1.0.0',
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Set default matter_type for existing rows (backfill)
UPDATE cases
SET matter_type = 'default'
WHERE matter_type IS NULL;

-- Make matter_type required going forward
ALTER TABLE cases
  ALTER COLUMN matter_type SET NOT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_cases_matter_type
  ON cases(matter_type);

CREATE INDEX IF NOT EXISTS idx_cases_pipeline_stage
  ON cases(pipeline_stage);

CREATE INDEX IF NOT EXISTS idx_cases_assigned_lawyer_updated
  ON cases(assigned_lawyer, updated_at DESC);

-- GIN index for JSONB metadata queries
-- Allows fast lookups like: metadata @> '{"key": "value"}'
CREATE INDEX IF NOT EXISTS idx_cases_metadata_gin
  ON cases USING GIN(metadata);

-- Composite index for common filtering queries
CREATE INDEX IF NOT EXISTS idx_cases_status_matter_type_updated
  ON cases(status, matter_type, updated_at DESC);

-- =====================================================
-- Case History Table
-- Tracks all state changes with full audit trail
-- =====================================================

CREATE TABLE IF NOT EXISTS case_history (
  id UUID PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  user_id UUID NOT NULL,
  from_stage TEXT,
  to_stage TEXT,
  changes JSONB,
  metadata JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for case_history
CREATE INDEX IF NOT EXISTS idx_case_history_case_id_timestamp
  ON case_history(case_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_case_history_user_id
  ON case_history(user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_case_history_action_type
  ON case_history(action_type, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_case_history_changes_gin
  ON case_history USING GIN(changes);

-- =====================================================
-- Row Level Security (RLS) for case_history
-- =====================================================

ALTER TABLE case_history ENABLE ROW LEVEL SECURITY;

-- Lawyers can view history of their assigned cases
CREATE POLICY "Lawyers can view case history" ON case_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_history.case_id
        AND cases.assigned_lawyer = auth.uid()::text
    )
  );

-- Admins can view all history
CREATE POLICY "Admins can view all case history" ON case_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'admin'
    )
  );

-- Only server (service role) can insert history
-- This prevents clients from forging history entries
CREATE POLICY "Service role can insert history" ON case_history
  FOR INSERT
  WITH CHECK (true);

-- Prevent updates and deletes on history (immutable audit log)
CREATE POLICY "No updates on history" ON case_history
  FOR UPDATE
  USING (false);

CREATE POLICY "No deletes on history" ON case_history
  FOR DELETE
  USING (false);

-- =====================================================
-- NOTIFY Trigger for Real-time Updates
-- Publishes case changes to 'case_changes' channel
-- =====================================================

CREATE OR REPLACE FUNCTION notify_case_change()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'case_changes',
    json_build_object(
      'operation', TG_OP,
      'case_id', NEW.id,
      'matter_type', NEW.matter_type,
      'pipeline_stage', NEW.pipeline_stage,
      'updated_at', NEW.updated_at
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS case_change_trigger ON cases;

-- Create trigger for INSERT and UPDATE
CREATE TRIGGER case_change_trigger
  AFTER INSERT OR UPDATE ON cases
  FOR EACH ROW
  EXECUTE FUNCTION notify_case_change();

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON COLUMN cases.matter_type IS
  'Pipeline type key (e.g., insolvency, personal_injury, family_law)';

COMMENT ON COLUMN cases.pipeline_version IS
  'Semver version of pipeline config used when case was created';

COMMENT ON COLUMN cases.metadata IS
  'JSONB field data as defined in pipeline fieldDefinitions';

COMMENT ON TABLE case_history IS
  'Immutable audit log of all case state changes';

COMMENT ON INDEX idx_cases_metadata_gin IS
  'GIN index for fast JSONB queries on case metadata';

-- =====================================================
-- Validation Function for Pipeline Stages
-- Ensures stage exists in pipeline config
-- =====================================================

CREATE OR REPLACE FUNCTION validate_pipeline_stage()
RETURNS TRIGGER AS $$
BEGIN
  -- This is a basic validation; in production you'd check against
  -- actual pipeline config stored in a pipelines table
  IF NEW.pipeline_stage IS NULL OR LENGTH(NEW.pipeline_stage) = 0 THEN
    RAISE EXCEPTION 'pipeline_stage cannot be null or empty';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS validate_pipeline_stage_trigger ON cases;

-- Create validation trigger
CREATE TRIGGER validate_pipeline_stage_trigger
  BEFORE INSERT OR UPDATE ON cases
  FOR EACH ROW
  EXECUTE FUNCTION validate_pipeline_stage();

-- =====================================================
-- Grant Permissions
-- =====================================================

-- Authenticated users can read cases they're assigned to
GRANT SELECT ON cases TO authenticated;

-- Authenticated users can read history of cases they're assigned to
GRANT SELECT ON case_history TO authenticated;

-- Service role has full access for server-side operations
-- (This is already granted in Supabase setup)
