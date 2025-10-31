/**
 * Case Actions API Route
 * POST /api/cases/[caseId]/actions - Execute case actions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/services/supabase/client';
import { getPipeline } from '@/services/pipelines/registry';
import { createPipelineExecutor } from '@/services/pipeline/PipelineExecutor';
import { validateCaseAction } from '@/lib/schemas/pipelineConfig.schema';
import type { CaseAction } from '@/types/pipeline.types';

/**
 * POST /api/cases/[caseId]/actions
 * Execute a case action (transition, update, etc.)
 *
 * Body:
 * {
 *   action: {
 *     type: 'transition' | 'update_fields' | 'add_document' | 'add_note',
 *     payload: {...},
 *     reason?: string,
 *     metadata?: {...}
 *   }
 * }
 */
export async function POST(
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

    // Parse and validate request body
    const body = await req.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    // Validate action schema
    try {
      validateCaseAction(action);
    } catch (validationError: any) {
      return NextResponse.json(
        {
          error: 'Invalid action format',
          details: validationError.errors || validationError.message
        },
        { status: 400 }
      );
    }

    // Fetch case
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .single();

    if (caseError || !caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Normalize case document
    const caseDoc = {
      ...caseData,
      matterType: caseData.matter_type,
      pipelineStage: caseData.pipeline_stage,
      pipelineVersion: caseData.pipeline_version,
      assignedLawyer: caseData.assigned_lawyer,
      clientId: caseData.client_id,
      createdAt: caseData.created_at,
      updatedAt: caseData.updated_at,
      createdBy: caseData.created_by,
      updatedBy: caseData.updated_by
    };

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

    // Create pipeline executor
    const executor = createPipelineExecutor(pipelineConfig);

    // Execute action
    const result = await executor.executeAction(
      caseId,
      action as CaseAction,
      user.id,
      userRole
    );

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'Action execution failed',
          code: result.code,
          details: result.details
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error in POST /api/cases/[caseId]/actions:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
