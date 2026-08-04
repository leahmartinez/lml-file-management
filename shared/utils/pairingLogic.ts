/**
 * Consultant Pairing Logic
 *
 * This file contains the business logic for consultant pairing functionality,
 * including job visibility filtering based on consultant pairings.
 *
 * Used by both frontend (to filter visible jobs in UI) and backend (to enforce
 * access control in API endpoints).
 */

import { UserRole, canHavePairing, canSeeAllProjects } from '../constants/roles';

/**
 * User entity interface (minimal fields needed for pairing logic)
 */
export interface PairingUser {
  email: string;
  role: UserRole | string; // string for compatibility with database values
  pairedUserId?: string | null;
}

/**
 * Job/Stage entity interface (minimal fields needed for visibility logic)
 */
export interface AssignableJob {
  consultantEmails?: string | string[]; // Can be JSON string or parsed array
  [key: string]: any; // Allow other properties
}

/**
 * Parse consultant emails from job entity
 * Handles both JSON string and array formats
 */
export function parseConsultantEmails(
  consultantEmails: string | string[] | undefined | null
): string[] {
  if (!consultantEmails) {
    return [];
  }

  // If already an array, return it (lowercased)
  if (Array.isArray(consultantEmails)) {
    return consultantEmails.map((email) => email.toLowerCase().trim());
  }

  // If string, try to parse as JSON
  if (typeof consultantEmails === 'string') {
    try {
      const parsed = JSON.parse(consultantEmails);
      if (Array.isArray(parsed)) {
        return parsed.map((email) => email.toLowerCase().trim());
      }
    } catch {
      // Not JSON, treat as comma-separated string (fallback)
      return consultantEmails
        .split(',')
        .map((email) => email.toLowerCase().trim())
        .filter((email) => email.length > 0);
    }
  }

  return [];
}

/**
 * Check if a job is assigned to a specific email
 */
export function isJobAssignedTo(job: AssignableJob, email: string): boolean {
  const consultantEmails = parseConsultantEmails(job.consultantEmails);
  const normalizedEmail = email.toLowerCase().trim();
  return consultantEmails.includes(normalizedEmail);
}

/**
 * Check if a user can see a specific job based on their role and pairing
 *
 * @param user - The user to check permissions for
 * @param job - The job/stage to check visibility for
 * @returns true if the user can see this job, false otherwise
 */
export function canUserSeeJob(user: PairingUser, job: AssignableJob): boolean {
  const userRole = user.role as UserRole;

  // Admin, Director, and AdminStaff can see all jobs
  if (canSeeAllProjects(userRole)) {
    return true;
  }

  const userEmail = user.email.toLowerCase().trim();

  // SubConsultant: only own assigned work
  if (userRole === UserRole.SubConsultant) {
    return isJobAssignedTo(job, userEmail);
  }

  // LMLConsultant: own work + paired consultant work
  if (userRole === UserRole.LMLConsultant) {
    // Check if user is assigned to this job
    if (isJobAssignedTo(job, userEmail)) {
      return true;
    }

    // Check if paired user is assigned to this job
    const pairedUserId = user.pairedUserId?.toLowerCase().trim();
    if (pairedUserId) {
      return isJobAssignedTo(job, pairedUserId);
    }

    return false;
  }

  // Default: no access
  return false;
}

/**
 * Filter a list of jobs to only those visible to a specific user
 *
 * @param user - The user to filter jobs for
 * @param jobs - All jobs to filter
 * @returns Jobs that the user can see
 */
export function getVisibleJobs<T extends AssignableJob>(
  user: PairingUser,
  jobs: T[]
): T[] {
  return jobs.filter((job) => canUserSeeJob(user, job));
}

/**
 * Get all consultant emails that a user can see work for
 * (Useful for filtering queries at the database level if possible)
 *
 * @param user - The user to get visible consultant emails for
 * @returns Array of consultant emails the user can see work for
 */
export function getVisibleConsultantEmails(user: PairingUser): string[] {
  const userRole = user.role as UserRole;
  const userEmail = user.email.toLowerCase().trim();

  // Admin, Director, and AdminStaff can see all consultants
  if (canSeeAllProjects(userRole)) {
    return []; // Return empty array to indicate "all consultants" (no filtering needed)
  }

  // SubConsultant: only own email
  if (userRole === UserRole.SubConsultant) {
    return [userEmail];
  }

  // LMLConsultant: own email + paired email (if exists)
  if (userRole === UserRole.LMLConsultant) {
    const emails = [userEmail];
    const pairedUserId = user.pairedUserId?.toLowerCase().trim();
    if (pairedUserId) {
      emails.push(pairedUserId);
    }
    return emails;
  }

  // Default: only own email
  return [userEmail];
}

/**
 * Pairing validation utilities
 */

/**
 * Validate that a pairing update is valid
 *
 * @param user1 - First user in pairing
 * @param user2 - Second user in pairing
 * @returns Object with isValid flag and error message if invalid
 */
export function validatePairing(
  user1: PairingUser,
  user2: PairingUser
): { isValid: boolean; error?: string } {
  // Both users must be LMLConsultants
  if (!canHavePairing(user1.role as UserRole)) {
    return {
      isValid: false,
      error: `User ${user1.email} has role ${user1.role} which cannot be paired. Only LMLConsultants can be paired.`,
    };
  }

  if (!canHavePairing(user2.role as UserRole)) {
    return {
      isValid: false,
      error: `User ${user2.email} has role ${user2.role} which cannot be paired. Only LMLConsultants can be paired.`,
    };
  }

  // Users cannot be paired with themselves
  if (user1.email.toLowerCase() === user2.email.toLowerCase()) {
    return {
      isValid: false,
      error: 'Users cannot be paired with themselves.',
    };
  }

  return { isValid: true };
}

/**
 * Check if a pairing is bidirectional (both users reference each other)
 *
 * @param user1 - First user in pairing
 * @param user2 - Second user in pairing
 * @returns true if pairing is bidirectional, false otherwise
 */
export function isPairingBidirectional(
  user1: PairingUser,
  user2: PairingUser
): boolean {
  const user1PairedEmail = user1.pairedUserId?.toLowerCase().trim();
  const user2PairedEmail = user2.pairedUserId?.toLowerCase().trim();
  const user1Email = user1.email.toLowerCase().trim();
  const user2Email = user2.email.toLowerCase().trim();

  return user1PairedEmail === user2Email && user2PairedEmail === user1Email;
}

/**
 * Get pairing status for a user
 *
 * @param user - The user to check pairing status for
 * @returns Pairing status object
 */
export function getPairingStatus(user: PairingUser): {
  isPaired: boolean;
  pairedWith: string | null;
  canBePaired: boolean;
} {
  const canBePaired = canHavePairing(user.role as UserRole);
  const pairedWith = user.pairedUserId?.toLowerCase().trim() || null;
  const isPaired = canBePaired && !!pairedWith;

  return {
    isPaired,
    pairedWith,
    canBePaired,
  };
}

/**
 * Example usage in backend API handler:
 *
 * ```typescript
 * // Get user from JWT token
 * const currentUser = getAuthenticatedUser(request);
 *
 * // Fetch all jobs from database
 * const allJobs = await getAllStages();
 *
 * // Filter to only jobs visible to current user
 * const visibleJobs = getVisibleJobs(currentUser, allJobs);
 *
 * // Return filtered jobs
 * return success(visibleJobs);
 * ```
 *
 * Example usage in frontend:
 *
 * ```typescript
 * // Get current user from auth context
 * const { user } = useAuth();
 *
 * // Fetch all jobs from API (or from local state)
 * const allJobs = await apiService.getAllJobs();
 *
 * // Filter to only jobs visible to current user
 * const visibleJobs = getVisibleJobs(user, allJobs);
 *
 * // Render visible jobs
 * return <JobList jobs={visibleJobs} />;
 * ```
 */
