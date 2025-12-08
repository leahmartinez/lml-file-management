/**
 * Safe hook to get projects with proper deletion filtering applied
 *
 * ALWAYS use this instead of useProjects() directly!
 * This ensures deleted projects are never shown in the UI.
 *
 * useProjects() bypasses deletion tracking and should only be used
 * by useProjectManagement() for merging logic.
 */

import { useProjectManagement } from './useProjectManagement';
import { DataFetchResult, Project } from '@/types/data';
import { useCallback } from 'react';

/**
 * Get projects with deletion filtering properly applied
 * This is the ONLY safe way to get projects for display
 */
export function useFilteredProjects(): DataFetchResult<Project[]> {
  const { projects, loading, error } = useProjectManagement();

  const refetch = useCallback(async () => {
    // useProjectManagement handles its own refetch
    // No-op here since it auto-updates from React Query
    return Promise.resolve();
  }, []);

  return {
    data: projects,
    loading,
    error,
    refetch,
  };
}
