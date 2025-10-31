/**
 * Case Detail API Route
 * GET   /api/cases/[caseId] - Get case with ViewModel
 * PATCH /api/cases/[caseId] - Update case metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/services/supabase/client';
import { getPipeline } from '@/services/pipelines/registry';
import { createPipelineExecutor } from '@/services/pipeline/PipelineExecutor';
import type { CaseDocument } from '@/types/pipeline.types';

/**
 * GET /api/cases/[caseId]
 * Returns case document + ViewModel + pipeline config + history
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { caseId: string } }
) {
  try {
    const supabase = createSupabaseServerClient();

    // Authenticate user
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const caseId = params.caseId;

    // Fetch case with history using optimized RPC function
    const { data, error } = await supabase.rpc('get_case_with_history', {
      p_case_id: caseId,
      p_history_limit: 50
    });

    if (error) {
      console.error('Error fetching case:', error);
      return NextResponse.json(
        { error: 'Failed to fetch case' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0 || !data[0].case_data) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const caseData = data[0].case_data;
    const history = data[0].history || [];

    // Normalize case document
    const caseDoc = normalizeCaseDocument(caseData);

    // Get pipeline config
    const pipelineConfig = getPipeline(caseDoc.matterType);
    if (!pipelineConfig) {
      return NextResponse.json(
        { error: `Unknown matter type: ${caseDoc.matterType}` },
        { status: 400 }
      );
    }

    // Get user role
    const userRole = user.user_metadata?.role || 'client';

    // Create pipeline executor and compute view model
    const executor = createPipelineExecutor(pipelineConfig);
    const viewModel = executor.computeViewModel(caseDoc, userRole);

    // Normalize history entries
    const normalizedHistory = Array.isArray(history)
      ? history.map(normalizeHistoryEntry)
      : [];

    return NextResponse.json({
      success: true,
      case: caseDoc,
      viewModel,
      pipelineConfig: {
        key: pipelineConfig.key,
        name: pipelineConfig.name,
        version: pipelineConfig.version
      },
      history: normalizedHistory
    });
  } catch (error) {
    console.error('Error in GET /api/cases/[caseId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/cases/[caseId]
 * Update case fields (non-stage updates)
 *
 * Body:
 * {
 *   assignedLawyer?: string,
 *   status?: 'active' | 'closed' | 'archived',
 *   metadata?: Record<string, unknown>
 * }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { caseId: string } }
) {
  try {
    const supabase = createSupabaseServerClient();

    // Authenticate user
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const caseId = params.caseId;

    // Parse request body
    const body = await req.json();
    const { assignedLawyer, status, metadata } = body;

    // Build updates object
    const updates: any = {
      updated_at: new Date().toISOString(),
      updated_by: user.id
    };

    if (assignedLawyer !== undefined) {
      updates.assigned_lawyer = assignedLawyer;
    }

    if (status !== undefined) {
      // Validate status
      if (!['active', 'closed', 'archived'].includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status value' },
          { status: 400 }
        );
      }
      updates.status = status;
    }

    if (metadata !== undefined) {
      // Use RPC function for metadata updates to ensure history tracking
      const { data, error } = await supabase.rpc('execute_case_update', {
        p_case_id: caseId,
        p_user_id: user.id,
        p_updates: metadata,
        p_timestamp: updates.updated_at
      });

      if (error) {
        console.error('Error updating metadata:', error);
        return NextResponse.json(
          { error: 'Failed to update metadata' },
          { status: 500 }
        );
      }

      // If only metadata was updated, return success
      if (!assignedLawyer && !status) {
        const { data: updatedCase, error: fetchError } = await supabase
          .from('cases')
          .select('*')
          .eq('id', caseId)
          .single();

        if (fetchError) {
          return NextResponse.json(
            { error: 'Update succeeded but failed to fetch case' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          case: normalizeCaseDocument(updatedCase)
        });
      }
    }

    // Update other fields if present
    if (assignedLawyer !== undefined || status !== undefined) {
      const { data, error } = await supabase
        .from('cases')
        .update(updates)
        .eq('id', caseId)
        .select()
        .single();

      if (error) {
        console.error('Error updating case:', error);
        return NextResponse.json(
          { error: 'Failed to update case' },
          { status: 500 }
        );
      }

      if (!data) {
        return NextResponse.json({ error: 'Case not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        case: normalizeCaseDocument(data)
      });
    }

    // If we get here, no updates were provided
    return NextResponse.json(
      { error: 'No updates provided' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in PATCH /api/cases/[caseId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Normalize case document field names
 */
function normalizeCaseDocument(caseDoc: any): CaseDocument {
  return {
    ...caseDoc,
    matterType: caseDoc.matter_type,
    pipelineStage: caseDoc.pipeline_stage,
    pipelineVersion: caseDoc.pipeline_version,
    assignedLawyer: caseDoc.assigned_lawyer,
    clientId: caseDoc.client_id,
    createdAt: caseDoc.created_at,
    updatedAt: caseDoc.updated_at,
    createdBy: caseDoc.created_by,
    updatedBy: caseDoc.updated_by
  };
}

/**
 * Normalize history entry field names
 */
function normalizeHistoryEntry(entry: any) {
  return {
    ...entry,
    caseId: entry.case_id,
    actionType: entry.action_type,
    userId: entry.user_id,
    fromStage: entry.from_stage,
    toStage: entry.to_stage,
    createdAt: entry.created_at
  };
}
