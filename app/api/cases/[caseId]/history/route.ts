/**
 * Case History API Route
 * GET /api/cases/[caseId]/history - Get case history timeline
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/services/supabase/client';

/**
 * GET /api/cases/[caseId]/history
 * Returns case history entries
 *
 * Query params:
 * - limit: Number of entries (default: 50, max: 200)
 * - offset: Offset for pagination (default: 0)
 * - actionType: Filter by action type
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

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '50'),
      200
    );
    const offset = parseInt(searchParams.get('offset') || '0');
    const actionType = searchParams.get('actionType');

    // Build query
    let query = supabase
      .from('case_history')
      .select('*', { count: 'exact' })
      .eq('case_id', caseId)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (actionType) {
      query = query.eq('action_type', actionType);
    }

    // Execute query
    const { data: history, error, count } = await query;

    if (error) {
      console.error('Error fetching case history:', error);
      return NextResponse.json(
        { error: 'Failed to fetch case history' },
        { status: 500 }
      );
    }

    // Normalize history entries
    const normalizedHistory = (history || []).map((entry) => ({
      ...entry,
      caseId: entry.case_id,
      actionType: entry.action_type,
      userId: entry.user_id,
      fromStage: entry.from_stage,
      toStage: entry.to_stage,
      createdAt: entry.created_at
    }));

    return NextResponse.json({
      success: true,
      history: normalizedHistory,
      count: count || 0,
      limit,
      offset
    });
  } catch (error) {
    console.error('Error in GET /api/cases/[caseId]/history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
