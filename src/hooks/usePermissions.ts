/**
 * usePermissions Hook
 *
 * Provides role-based permission checking for the current authenticated user.
 * Used throughout the application to control UI visibility and access.
 *
 * SECURITY: This is a frontend convenience hook. Actual authorization is enforced
 * by backend API endpoints. Never rely solely on frontend checks for security.
 *
 * Usage:
 * ```tsx
 * const { canSeeFinancials, isAdmin, canEditProposals } = usePermissions();
 *
 * if (canSeeFinancials) {
 *   return <PricingSection />;
 * }
 * ```
 */

import { useMemo } from 'react';
import { useAuth } from './useAuth';
import {
  UserRole,
  canSeePricing,
  canSetPricing,
  canManageUsers,
  canSeeMap,
  canManageJobs,
  canSeeAllProjects,
  mapLegacyRole,
} from '../../shared/constants/roles';

/**
 * Normalize role to UserRole enum
 * Handles legacy role values for backwards compatibility
 */
function normalizeRole(role: string | undefined): UserRole {
  if (!role) {
    return UserRole.LMLConsultant; // Default fallback
  }

  // Check if it's already a valid UserRole
  if (Object.values(UserRole).includes(role as UserRole)) {
    return role as UserRole;
  }

  // Try to map legacy role
  const mapped = mapLegacyRole(role);
  if (mapped) {
    return mapped;
  }

  // Default fallback
  return UserRole.LMLConsultant;
}

export interface PermissionsResult {
  // Current user role (normalized)
  role: UserRole;

  // Permission flags
  canSeeFinancials: boolean;
  canEditProposals: boolean;
  canAccessAdmin: boolean;
  canSeeMap: boolean;
  canManageJobs: boolean;
  canSeeAllProjects: boolean;

  // Role checks
  isAdmin: boolean;
  isDirector: boolean;
  isLMLConsultant: boolean;
  isSubConsultant: boolean;
  isAdminStaff: boolean;
}

/**
 * Hook to get current user permissions
 *
 * @returns Permissions object with role and permission flags
 */
export function usePermissions(): PermissionsResult {
  const { user } = useAuth();

  return useMemo(() => {
    // If no user, return restrictive defaults
    if (!user) {
      return {
        role: UserRole.SubConsultant,
        canSeeFinancials: false,
        canEditProposals: false,
        canAccessAdmin: false,
        canSeeMap: false,
        canManageJobs: false,
        canSeeAllProjects: false,
        isAdmin: false,
        isDirector: false,
        isLMLConsultant: false,
        isSubConsultant: true,
        isAdminStaff: false,
      };
    }

    const normalizedRole = normalizeRole(user.role);

    return {
      role: normalizedRole,

      // Permission flags
      canSeeFinancials: canSeePricing(normalizedRole),
      canEditProposals: canSetPricing(normalizedRole),
      canAccessAdmin: canManageUsers(normalizedRole),
      canSeeMap: canSeeMap(normalizedRole),
      canManageJobs: canManageJobs(normalizedRole),
      canSeeAllProjects: canSeeAllProjects(normalizedRole),

      // Role checks
      isAdmin: normalizedRole === UserRole.Admin,
      isDirector: normalizedRole === UserRole.Director,
      isLMLConsultant: normalizedRole === UserRole.LMLConsultant,
      isSubConsultant: normalizedRole === UserRole.SubConsultant,
      isAdminStaff: normalizedRole === UserRole.AdminStaff,
    };
  }, [user]);
}
