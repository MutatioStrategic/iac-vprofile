/**
 * Auth Context Provider
 * Manages authentication state with Supabase Auth
 */

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/services/supabase/client';
import type { UserProfile, AuthContext as AuthContextType } from '@/types/auth.types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(mapSupabaseUserToProfile(session.user));
        }
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(mapSupabaseUserToProfile(session.user));
        } else {
          setUser(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const value: AuthContextType = {
    user,
    role: user?.role || null,
    isAuthenticated: !!user,
    isLoading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

/**
 * Map Supabase user to UserProfile
 */
function mapSupabaseUserToProfile(user: User): UserProfile {
  return {
    id: user.id,
    email: user.email || '',
    role: user.user_metadata?.role || 'client',
    firstName: user.user_metadata?.first_name,
    lastName: user.user_metadata?.last_name,
    phone: user.user_metadata?.phone,
    avatar: user.user_metadata?.avatar,
    metadata: user.user_metadata,
    created_at: user.created_at,
    updated_at: user.updated_at || user.created_at
  };
}
