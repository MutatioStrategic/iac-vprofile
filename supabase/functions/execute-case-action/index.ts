/**
 * Supabase Edge Function: execute-case-action
 * Executes case actions with server-side validation and transactions
 *
 * This function runs on Deno at the edge (geographically close to users)
 * Use this for low-latency case action execution
 *
 * Alternative to Next.js API route (/api/cases/[caseId]/actions)
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// Type definitions (simplified for edge function)
interface CaseAction {
  type: 'transition' | 'update_fields' | 'add_document' | 'add_note';
  payload: {
    targetStage?: string;
    updates?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    [key: string]: unknown;
  };
  reason?: string;
}

interface ExecuteActionRequest {
  caseId: string;
  action: CaseAction;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create Supabase client with user's auth token
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader }
      }
    });

    // Verify user authentication
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    const requestData: ExecuteActionRequest = await req.json();
    const { caseId, action } = requestData;

    if (!caseId || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing caseId or action' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Fetch case
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .single();

    if (caseError || !caseData) {
      return new Response(JSON.stringify({ error: 'Case not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Execute action based on type
    let result: any;

    switch (action.type) {
      case 'transition':
        result = await executeTransition(
          supabase,
          caseId,
          caseData.pipeline_stage,
          action.payload.targetStage as string,
          user.id,
          action.payload.metadata || {}
        );
        break;

      case 'update_fields':
        result = await executeFieldUpdate(
          supabase,
          caseId,
          user.id,
          action.payload.updates || {}
        );
        break;

      case 'add_document':
        result = await executeAddDocument(
          supabase,
          caseId,
          user.id,
          action.payload
        );
        break;

      case 'add_note':
        result = await executeAddNote(supabase, caseId, user.id, action.payload);
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action type' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
    }

    // Return result
    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error executing action:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

/**
 * Execute stage transition using RPC function
 */
async function executeTransition(
  supabase: any,
  caseId: string,
  fromStage: string,
  toStage: string,
  userId: string,
  metadata: Record<string, unknown>
) {
  const timestamp = new Date().toISOString();

  const { data, error } = await supabase.rpc('execute_case_transition', {
    p_case_id: caseId,
    p_from_stage: fromStage,
    p_to_stage: toStage,
    p_user_id: userId,
    p_metadata: metadata,
    p_history_id: null, // Let function generate ID
    p_timestamp: timestamp
  });

  if (error) {
    console.error('Transition error:', error);
    return {
      success: false,
      error: error.message || 'Transition failed'
    };
  }

  // Check if transition succeeded
  const result = Array.isArray(data) ? data[0] : data;
  if (!result || !result.success) {
    return {
      success: false,
      error: result?.error_message || 'Transition failed'
    };
  }

  return {
    success: true,
    caseId,
    newStage: toStage,
    timestamp
  };
}

/**
 * Execute field update using RPC function
 */
async function executeFieldUpdate(
  supabase: any,
  caseId: string,
  userId: string,
  updates: Record<string, unknown>
) {
  const timestamp = new Date().toISOString();

  const { data, error } = await supabase.rpc('execute_case_update', {
    p_case_id: caseId,
    p_user_id: userId,
    p_updates: updates,
    p_timestamp: timestamp
  });

  if (error) {
    console.error('Update error:', error);
    return {
      success: false,
      error: error.message || 'Update failed'
    };
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (!result || !result.success) {
    return {
      success: false,
      error: result?.error_message || 'Update failed'
    };
  }

  return {
    success: true,
    caseId,
    timestamp
  };
}

/**
 * Add document (placeholder - implement based on storage strategy)
 */
async function executeAddDocument(
  supabase: any,
  caseId: string,
  userId: string,
  payload: any
) {
  // TODO: Implement document storage logic
  // This would typically:
  // 1. Upload file to Supabase Storage
  // 2. Create document record in database
  // 3. Link to case

  return {
    success: true,
    caseId,
    message: 'Document upload not yet implemented',
    timestamp: new Date().toISOString()
  };
}

/**
 * Add note (placeholder)
 */
async function executeAddNote(
  supabase: any,
  caseId: string,
  userId: string,
  payload: any
) {
  // TODO: Implement notes table and insertion
  // This would typically:
  // 1. Validate note content
  // 2. Insert into case_notes table
  // 3. Return note ID

  return {
    success: true,
    caseId,
    message: 'Note creation not yet implemented',
    timestamp: new Date().toISOString()
  };
}
