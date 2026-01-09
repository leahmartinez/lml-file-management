/**
 * Optimized React Query Hooks for Data Fetching
 * Provides caching, deduplication, and automatic refetching
 * Replaces manual useEffect-based data fetching to improve performance
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dataService } from '@/services/dataService';
import { usersApi } from '@/services/apiService';
import { Asset, Site, Project, Contact, DataFetchResult } from '@/types/data';

// Query configuration constants
const QUERY_CONFIG = {
  // Assets: cache for 5 minutes, stale after 2 minutes
  assets: {
    staleTime: 2 * 60 * 1000,      // 2 minutes
    gcTime: 5 * 60 * 1000,         // 5 minutes (formerly cacheTime)
  },
  // Sites: cache for 10 minutes, stale after 5 minutes
  sites: {
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  },
  // Projects: cache for 5 minutes, stale after 1 minute (changed for data accuracy)
  projects: {
    staleTime: 60 * 1000,         // 1 minute - project data changes frequently
    gcTime: 5 * 60 * 1000,        // 5 minutes
  },
  // Contacts: cache for 15 minutes, stale after 10 minutes
  contacts: {
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  },
  // Users: cache for 1 minute, stale after 30 seconds (frequently updated)
  users: {
    staleTime: 30 * 1000,
    gcTime: 1 * 60 * 1000,
  },
};

/**
 * Fetch assets with caching
 * Multiple components can use this hook, only one request is made
 */
export function useAssetsQuery() {
  return useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      console.log('📊 Fetching assets...');
      return await dataService.fetchAssets();
    },
    ...QUERY_CONFIG.assets,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Fetch sites with caching
 */
export function useSitesQuery() {
  return useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      console.log('🏢 Fetching sites...');
      return await dataService.fetchSites();
    },
    ...QUERY_CONFIG.sites,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Fetch projects with caching
 */
export function useProjectsQuery() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      console.log('📋 Fetching projects...');
      return await dataService.fetchProjects();
    },
    ...QUERY_CONFIG.projects,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Fetch contacts with caching
 */
export function useContactsQuery() {
  return useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      console.log('👥 Fetching contacts...');
      return await dataService.fetchContacts();
    },
    ...QUERY_CONFIG.contacts,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Fetch all data at once (sites, projects, assets, contacts)
 * More efficient than fetching each separately for pages that need all data
 */
export function useAllDataQuery() {
  return useQuery({
    queryKey: ['all-data'],
    queryFn: async () => {
      console.log('📚 Fetching all data...');
      return await dataService.fetchAll();
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Fetch assets filtered by site
 * Uses site name as part of query key for proper caching
 */
export function useAssetsBySiteQuery(siteName: string | undefined) {
  return useQuery({
    queryKey: ['assets', 'by-site', siteName],
    queryFn: async () => {
      if (!siteName) return [];
      console.log(`📊 Fetching assets for site: ${siteName}`);
      return await dataService.fetchAssetsBySite(siteName);
    },
    ...QUERY_CONFIG.assets,
    enabled: !!siteName, // Don't fetch if siteName is not provided
    retry: 2,
  });
}

/**
 * Fetch assets filtered by project
 * Uses project code as part of query key for proper caching
 */
export function useAssetsByProjectQuery(projectCode: string | undefined) {
  return useQuery({
    queryKey: ['assets', 'by-project', projectCode],
    queryFn: async () => {
      if (!projectCode) return [];
      console.log(`📊 Fetching assets for project: ${projectCode}`);
      return await dataService.fetchAssetsByProject(projectCode);
    },
    ...QUERY_CONFIG.assets,
    enabled: !!projectCode, // Don't fetch if projectCode is not provided
    retry: 2,
  });
}

/**
 * Fetch all users (Admin/Consultant only)
 * Uses shorter cache time since user list may change frequently
 */
export function useUsersQuery() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      console.log('👨‍💼 Fetching all users...');
      return await usersApi.getAllUsers();
    },
    ...QUERY_CONFIG.users,
    retry: 1,
  });
}

/**
 * Mutation for approving a user
 * Automatically refetches users list after success
 */
export function useApproveUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (email: string) => {
      console.log(`✅ Approving user: ${email}`);
      return usersApi.approveUser(email);
    },
    onSuccess: (data, variables) => {
      console.log(`✅ User approved: ${variables}`);
      // Invalidate users query to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      console.error('❌ Failed to approve user:', error.message);
    },
  });
}

/**
 * Mutation for suspending a user
 * Automatically refetches users list after success
 */
export function useSuspendUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (email: string) => {
      console.log(`⛔ Suspending user: ${email}`);
      return usersApi.suspendUser(email);
    },
    onSuccess: (data, variables) => {
      console.log(`⛔ User suspended: ${variables}`);
      // Invalidate users query to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      console.error('❌ Failed to suspend user:', error.message);
    },
  });
}

/**
 * Mutation for deleting a user
 * Automatically refetches users list after success
 */
export function useDeleteUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (email: string) => {
      console.log(`🗑️ Deleting user: ${email}`);
      return usersApi.deleteUser(email);
    },
    onSuccess: (data, variables) => {
      console.log(`🗑️ User deleted: ${variables}`);
      // Invalidate users query to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      console.error('❌ Failed to delete user:', error.message);
    },
  });
}

/**
 * Mutation for updating a user
 * Automatically refetches users list after success
 */
export function useUpdateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, updates }: { email: string; updates: any }) => {
      console.log(`✏️ Updating user: ${email}`);
      return usersApi.updateUser(email, updates);
    },
    onSuccess: (data, variables) => {
      console.log(`✏️ User updated: ${variables.email}`);
      // Invalidate users query to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      console.error('❌ Failed to update user:', error.message);
    },
  });
}

/**
 * Adapter function to convert React Query hook to old DataFetchResult format
 * This allows gradual migration of components without rewriting all of them
 * @deprecated Use React Query hooks directly instead
 */
export function useAssetsAdapter(): DataFetchResult<Asset[]> {
  const { data, isLoading, error, refetch } = useAssetsQuery();

  return {
    data: data || [],
    loading: isLoading,
    error: error instanceof Error ? error : null,
    refetch: () => refetch(),
  };
}

/**
 * Adapter for sites
 * @deprecated Use React Query hooks directly instead
 */
export function useSitesAdapter(): DataFetchResult<Site[]> {
  const { data, isLoading, error, refetch } = useSitesQuery();

  return {
    data: data || [],
    loading: isLoading,
    error: error instanceof Error ? error : null,
    refetch: () => refetch(),
  };
}

/**
 * Adapter for projects
 * @deprecated Use React Query hooks directly instead
 */
export function useProjectsAdapter(): DataFetchResult<Project[]> {
  const { data, isLoading, error, refetch } = useProjectsQuery();

  return {
    data: data || [],
    loading: isLoading,
    error: error instanceof Error ? error : null,
    refetch: () => refetch(),
  };
}

/**
 * Adapter for contacts
 * @deprecated Use React Query hooks directly instead
 */
export function useContactsAdapter(): DataFetchResult<Contact[]> {
  const { data, isLoading, error, refetch } = useContactsQuery();

  return {
    data: data || [],
    loading: isLoading,
    error: error instanceof Error ? error : null,
    refetch: () => refetch(),
  };
}
