/**
 * Shared Role Constants
 *
 * This file defines the user role constants and utilities used across both
 * frontend (React) and backend (Azure Functions).
 *
 * IMPORTANT: This file should be imported by both api/ and src/ codebases
 * to ensure consistent role values.
 */

/**
 * User Role Enum
 *
 * Defines all possible user roles in the LML Lift Consultants Work Management Portal.
 * These values must match the role field in the Users table (Azure Data Tables).
 */
export enum UserRole {
  /**
   * Admin - Application Administrator (Leah)
   * - Full system access
   * - Can manage all users, projects, proposals, jobs
   * - Can see and set proposal pricing
   * - Can access map on My Work
   * - Superuser role with no restrictions
   */
  Admin = 'Admin',

  /**
   * Director - Full Project Visibility
   * - Can see all work across all consultants
   * - Can see and set proposal pricing
   * - Can access map on My Work
   * - Cannot manage users or system configuration
   */
  Director = 'Director',

  /**
   * LMLConsultant - Standard LML Lift Consultant
   * - Can see their own assigned work
   * - Can see work of their paired consultant (if paired)
   * - Can see proposal pricing (but cannot set prices)
   * - Can access map on My Work
   * - Participates in bidirectional consultant pairings
   */
  LMLConsultant = 'LMLConsultant',

  /**
   * SubConsultant - Subcontractor/External Consultant
   * - Can see only their own assigned work
   * - CANNOT see proposal pricing (prices hidden in UI)
   * - Can access map on My Work
   * - Does NOT participate in consultant pairings
   * - More restricted than LMLConsultant
   */
  SubConsultant = 'SubConsultant',

  /**
   * AdminStaff - Internal Admin Team (Ellie, Jo, Georgia)
   * - Can manage all jobs (create, update, delete, assign)
   * - Can see all projects and proposals
   * - Can see proposal pricing (but cannot set prices)
   * - CANNOT see map on My Work (frontend restriction)
   * - Cannot manage users
   */
  AdminStaff = 'AdminStaff',
}

/**
 * Role display names for UI
 */
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  [UserRole.Admin]: 'Administrator',
  [UserRole.Director]: 'Director',
  [UserRole.LMLConsultant]: 'LML Consultant',
  [UserRole.SubConsultant]: 'Sub-Consultant',
  [UserRole.AdminStaff]: 'Admin Staff',
};

/**
 * Role descriptions for UI (e.g., role selection dropdown)
 */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  [UserRole.Admin]: 'Full system access, can manage users and all data',
  [UserRole.Director]: 'Can see all work and set proposal pricing',
  [UserRole.LMLConsultant]: 'Can see own work and paired consultant work, can see prices',
  [UserRole.SubConsultant]: 'Can see only own work, cannot see pricing',
  [UserRole.AdminStaff]: 'Can manage jobs and see all data, cannot manage users',
};

/**
 * Check if a role can see proposal pricing ($)
 */
export function canSeePricing(role: UserRole): boolean {
  return role !== UserRole.SubConsultant;
}

/**
 * Check if a role can set/edit proposal pricing
 */
export function canSetPricing(role: UserRole): boolean {
  return role === UserRole.Admin || role === UserRole.Director;
}

/**
 * Check if a role can see the map on My Work
 */
export function canSeeMap(role: UserRole): boolean {
  return role !== UserRole.AdminStaff;
}

/**
 * Check if a role can manage users (create, update, suspend, delete)
 */
export function canManageUsers(role: UserRole): boolean {
  return role === UserRole.Admin;
}

/**
 * Check if a role can manage jobs (create, update, delete, assign)
 */
export function canManageJobs(role: UserRole): boolean {
  return (
    role === UserRole.Admin ||
    role === UserRole.Director ||
    role === UserRole.AdminStaff
  );
}

/**
 * Check if a role can see all projects and proposals (not just assigned)
 */
export function canSeeAllProjects(role: UserRole): boolean {
  return (
    role === UserRole.Admin ||
    role === UserRole.Director ||
    role === UserRole.AdminStaff
  );
}

/**
 * Check if a role participates in consultant pairings
 */
export function canHavePairing(role: UserRole): boolean {
  return role === UserRole.LMLConsultant;
}

/**
 * Get all roles that are allowed for user creation
 * (Some roles like Admin should only be set manually or have restrictions)
 */
export function getCreatableRoles(): UserRole[] {
  return [
    UserRole.Director,
    UserRole.LMLConsultant,
    UserRole.SubConsultant,
    UserRole.AdminStaff,
    // Admin role can be created but should be restricted to super admin only
    UserRole.Admin,
  ];
}

/**
 * Permission level for role comparison (higher = more permissions)
 * Used for determining if a user can perform actions on other users
 */
export const ROLE_PERMISSION_LEVEL: Record<UserRole, number> = {
  [UserRole.Admin]: 100, // Highest
  [UserRole.Director]: 80,
  [UserRole.AdminStaff]: 60,
  [UserRole.LMLConsultant]: 40,
  [UserRole.SubConsultant]: 20, // Lowest
};

/**
 * Check if one role has higher permission level than another
 * Useful for preventing users from modifying higher-privileged accounts
 */
export function hasHigherPermissionThan(
  role1: UserRole,
  role2: UserRole
): boolean {
  return ROLE_PERMISSION_LEVEL[role1] > ROLE_PERMISSION_LEVEL[role2];
}

/**
 * Validate if a role string is a valid UserRole
 */
export function isValidRole(role: string): role is UserRole {
  return Object.values(UserRole).includes(role as UserRole);
}

/**
 * Parse a role string to UserRole enum (with validation)
 * Returns null if invalid
 */
export function parseRole(role: string): UserRole | null {
  if (isValidRole(role)) {
    return role as UserRole;
  }
  return null;
}

/**
 * Legacy role mapping for migration
 * Maps old role values to new UserRole enum values
 */
export const LEGACY_ROLE_MAPPING: Record<string, UserRole> = {
  admin: UserRole.Admin,
  super_admin: UserRole.Admin, // Consolidate super_admin → Admin
  consultant: UserRole.LMLConsultant,
  subconsultant: UserRole.SubConsultant,
  // The following require manual review during migration:
  user: UserRole.LMLConsultant, // Default assumption
  site_manager: UserRole.AdminStaff, // Default assumption
  national_manager: UserRole.Director, // Default assumption
};

/**
 * Get new role from legacy role value
 * Returns null if no mapping exists
 */
export function mapLegacyRole(legacyRole: string): UserRole | null {
  return LEGACY_ROLE_MAPPING[legacyRole] || null;
}
