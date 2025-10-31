/**
 * Cases API Route
 * GET  /api/cases - List all cases with filtering
 * POST /api/cases - Create new case
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/services/supabase/client';
import { getPipeline } from '@/services/pipelines/registry';
import { generateUUIDv7 } from '@/lib/utils/uuidv7';
import type { CaseDocument } from '@/types/pipeline.types';

/**
 * GET /api/cases
 * List cases with optional filtering
 *
 * Query params:
 * - matterType: Filter by matter type
 * - status: Filter by status (active, closed, archived)
 * - assignedLawyer: Filter by assigned lawyer
 * - pipelineStage: Filter by current stage
 * - limit: Number of results (default: 50, max: 200)
 * - offset: Offset for pagination (default: 0)
 */
export async function GET(req: NextRequest) {
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

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const matterType = searchParams.get('matterType');
    const status = searchParams.get('status');
    const assignedLawyer = searchParams.get('assignedLawyer');
    const pipelineStage = searchParams.get('pipelineStage');
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '50'),
      200
    );
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('cases')
      .select('*', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (matterType) {
      query = query.eq('matter_type', matterType);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (assignedLawyer) {
      query = query.eq('assigned_lawyer', assignedLawyer);
    }

    if (pipelineStage) {
      query = query.eq('pipeline_stage', pipelineStage);
    }

    // Execute query
    const { data: cases, error, count } = await query;

    if (error) {
      console.error('Error fetching cases:', error);
      return NextResponse.json(
        { error: 'Failed to fetch cases' },
        { status: 500 }
      );
    }

    // Normalize field names (snake_case to camelCase)
    const normalizedCases = (cases || []).map(normalizeCaseDocument);

    return NextResponse.json({
      success: true,
      cases: normalizedCases,
      count: count || 0,
      limit,
      offset
    });
  } catch (error) {
    console.error('Error in GET /api/cases:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cases
 * Create new case
 *
 * Body:
 * {
 *   matterType: string,
 *   clientId?: string,
 *   assignedLawyer?: string,
 *   metadata: Record<string, unknown>
 * }
 */
export async function POST(req: NextRequest) {
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

    // Parse request body
    const body = await req.json();
    const { matterType, clientId, assignedLawyer, metadata = {} } = body;

    // Validate required fields
    if (!matterType) {
      return NextResponse.json(
        { error: 'matterType is required' },
        { status: 400 }
      );
    }

    // Get pipeline config
    const pipelineConfig = getPipeline(matterType);
    if (!pipelineConfig) {
      return NextResponse.json(
        { error: `Unknown matter type: ${matterType}` },
        { status: 400 }
      );
    }

    // Get initial stage
    const initialStage = pipelineConfig.stages[0]?.key;
    if (!initialStage) {
      return NextResponse.json(
        { error: 'Pipeline has no stages defined' },
        { status: 500 }
      );
    }

    // Generate case ID with UUIDv7 (time-ordered)
    const caseId = generateUUIDv7();
    const timestamp = new Date().toISOString();

    // Create case using RPC function
    const { data, error } = await supabase.rpc('create_case', {
      p_case_id: caseId,
      p_matter_type: matterType,
      p_pipeline_stage: initialStage,
      p_pipeline_version: pipelineConfig.version,
      p_metadata: metadata,
      p_assigned_lawyer: assignedLawyer || null,
      p_client_id: clientId || null,
      p_user_id: user.id,
      p_timestamp: timestamp
    });

    if (error) {
      console.error('Error creating case:', error);
      return NextResponse.json(
        { error: 'Failed to create case', details: error.message },
        { status: 500 }
      );
    }

    // Fetch the created case
    const { data: newCase, error: fetchError } = await supabase
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .single();

    if (fetchError || !newCase) {
      console.error('Error fetching created case:', fetchError);
      return NextResponse.json(
        { error: 'Case created but failed to fetch' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        case: normalizeCaseDocument(newCase)
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/cases:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Normalize case document field names
 * Converts snake_case to camelCase and adds both versions
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
