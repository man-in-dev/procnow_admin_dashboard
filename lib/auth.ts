/**
 * Authentication utility functions for the admin dashboard
 */

import { getAuthToken, getCurrentUser, removeAuthToken, type AuthUser } from './api';

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getAuthToken() !== null;
}

/**
 * Check if user is admin
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const token = getAuthToken();
    if (!token) {
      return false;
    }

    const user = await getCurrentUser(token);
    return user.role === 'admin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Get current authenticated user
 */
export async function getAuthenticatedUser(): Promise<AuthUser | null> {
  try {
    const token = getAuthToken();
    if (!token) {
      return null;
    }

    return await getCurrentUser(token);
  } catch (error) {
    console.error('Error getting authenticated user:', error);
    return null;
  }
}

/**
 * Logout user
 */
export function logout(): void {
  removeAuthToken();
}

/**
 * Require authentication - redirects to login if not authenticated
 * Returns true if authenticated, false otherwise
 */
export function requireAuth(): boolean {
  if (!isAuthenticated()) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return false;
  }
  return true;
}

/**
 * Require admin role - redirects to login if not admin
 * Returns true if admin, false otherwise
 */
export async function requireAdmin(): Promise<boolean> {
  if (!isAuthenticated()) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return false;
  }

  const admin = await isAdmin();
  if (!admin) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return false;
  }

  return true;
}

