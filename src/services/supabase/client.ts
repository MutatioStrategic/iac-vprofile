/**
 * Supabase Client Configuration
 * Server-side and client-side client creation
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase.types';

// Environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Create client-side Supabase client (browser)
 * Uses anon key with RLS enabled
 */
export function createSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      'Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });
}

/**
 * Create server-side Supabase client (API routes, server components)
 * Uses service role key to bypass RLS when needed
 *
 * ⚠️ WARNING: Only use for server-authoritative operations
 */
export function createSupabaseServerClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'Missing Supabase service role key. Required for server operations.'
    );
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Create Supabase client for Edge Functions
 * Uses JWT from request headers for authentication
 */
export function createSupabaseEdgeClient(authToken?: string) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase environment variables');
  }

  const client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Set auth token if provided
  if (authToken) {
    client.auth.setSession({
      access_token: authToken,
      refresh_token: '' // Not needed for edge functions
    });
  }

  return client;
}

/**
 * Singleton instance for client-side use
 */
let browserClient: ReturnType<typeof createSupabaseClient> | null = null;

export function getSupabaseBrowserClient() {
  if (typeof window === 'undefined') {
    throw new Error('Browser client can only be used on client-side');
  }

  if (!browserClient) {
    browserClient = createSupabaseClient();
  }

  return browserClient;
}
