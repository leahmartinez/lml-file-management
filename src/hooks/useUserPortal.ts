/**
 * Hook for managing user portal data
 * Fetches stages and projects assigned to the current user
 */

import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useDashboardData, DashboardRow } from '@/hooks/useDashboardData';
import { useStageConsultants } from '@/hooks/useStageConsultants';
import { useContacts } from '@/hooks/useContacts';

export interface UserAssignedWork extends DashboardRow {
  assignmentDate?: string; // When user was assigned
  assignedToCurrentUser?: boolean; // True if assigned to current user, false if assigned to paired consultant
  pairedConsultantName?: string; // Name of paired consultant if stage is theirs
}

export interface UserPortalData {
  userEmail: string;
  assignedStages: UserAssignedWork[];
  totalAssigned: number;
  loading: boolean;
}

/**
 * Get stages and projects assigned to the current user
 */
export function useUserPortal(): UserPortalData {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { rows: allRows = [], loading: dashboardLoading } = useDashboardData();
  const { getStageConsultants } = useStageConsultants();
  const { contacts = [] } = useContacts() || {};

  // Filter rows where current user is assigned as a consultant
  // For LMLConsultant role, also include stages assigned to paired consultant
  const assignedStages = useMemo(() => {
    if (!user?.email || dashboardLoading) return [];

    const assigned: UserAssignedWork[] = [];
    const userEmail = user.email.toLowerCase().trim();
    const pairedUserId = user.pairedUserId?.toLowerCase().trim();

    // Get paired consultant's name if exists
    let pairedConsultantName: string | undefined;
    if (pairedUserId) {
      // Try to find the paired consultant in contacts
      const pairedContact = contacts.find(c => c.email?.toLowerCase().trim() === pairedUserId);
      if (pairedContact && pairedContact.firstName) {
        // Use first name only for brevity
        pairedConsultantName = pairedContact.firstName;
      } else {
        // Fallback to email prefix
        pairedConsultantName = pairedUserId.split('@')[0];
      }
    }

    allRows.forEach((row) => {
      // Check if user is assigned as a consultant to this stage
      const consultants = getStageConsultants(row.stageId);
      const consultantsLower = consultants.map(c => c.toLowerCase().trim());

      const isAssignedToCurrentUser = consultantsLower.includes(userEmail);
      const isAssignedToPairedConsultant = pairedUserId && consultantsLower.includes(pairedUserId);

      if (isAssignedToCurrentUser) {
        // Stage is assigned to current user
        assigned.push({
          ...row,
          assignmentDate: new Date().toISOString(), // Could be stored if we track it
          assignedToCurrentUser: true,
        });
      } else if (isAssignedToPairedConsultant && user.role === 'LMLConsultant') {
        // Stage is assigned to paired consultant (only for LMLConsultant role)
        assigned.push({
          ...row,
          assignmentDate: new Date().toISOString(),
          assignedToCurrentUser: false,
          pairedConsultantName: pairedConsultantName,
        });
      }
    });

    // Sort by project code
    return assigned.sort((a, b) => a.projectCode.localeCompare(b.projectCode));
  }, [allRows, user?.email, user?.pairedUserId, user?.role, dashboardLoading, getStageConsultants, profile, contacts]);

  return {
    userEmail: user?.email || '',
    assignedStages,
    totalAssigned: assignedStages.length,
    loading: dashboardLoading,
  };
}
