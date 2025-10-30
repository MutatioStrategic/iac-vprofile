/**
 * Authentication and Authorization Types
 */

/**
 * User roles in the system
 */
export type UserRole =
  | 'admin'
  | 'lawyer'
  | 'paralegal'
  | 'client'
  | 'accountant'
  | 'investigator'
  | 'mediator';

/**
 * User profile from Supabase Auth
 */
export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Auth context
 */
export interface AuthContext {
  user: UserProfile | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

/**
 * Permission check result
 */
export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
}
