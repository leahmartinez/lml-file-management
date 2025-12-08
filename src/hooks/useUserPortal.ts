/**
 * Hook for managing user portal data
 * Fetches stages and projects assigned to the current user
 */

import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useDashboardData, DashboardRow } from '@/hooks/useDashboardData';
import { useStageConsultants } from '@/hooks/useStageConsultants';

export interface UserAssignedWork extends DashboardRow {
  assignmentDate?: string; // When user was assigned
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
  const { userProfile } = useProfile();
  const { rows: allRows = [], loading: dashboardLoading } = useDashboardData();
  const { getStageConsultants } = useStageConsultants();

  // Filter rows where current user is assigned as a consultant
  const assignedStages = useMemo(() => {
    if (!user?.email || dashboardLoading) return [];

    const assigned: UserAssignedWork[] = [];

    allRows.forEach((row) => {
      // Check if user is assigned as a consultant to this stage
      const consultants = getStageConsultants(row.stageId);
      if (consultants.includes(user.email)) {
        assigned.push({
          ...row,
          assignmentDate: new Date().toISOString(), // Could be stored if we track it
        });
      }
    });

    // Sort by project code
    return assigned.sort((a, b) => a.projectCode.localeCompare(b.projectCode));
  }, [allRows, user?.email, dashboardLoading, getStageConsultants]);

  return {
    userEmail: user?.email || '',
    assignedStages,
    totalAssigned: assignedStages.length,
    loading: dashboardLoading,
  };
}
