/**
 * Unified data hooks using React Query for automatic caching and deduplication
 * Provides loading states, error handling, and easy data access
 * Now backed by React Query for improved performance (Issue 2 fix)
 */

import { useCallback, useEffect, useState } from 'react';
import { useAssetsQuery, useSitesQuery, useProjectsQuery, useContactsQuery } from './useQueryHooks';
import { useQuery } from '@tanstack/react-query';
import { dataService } from '@/services/dataService';
import { Asset, Site, Project, Contact, DataFetchResult } from '@/types/data';

/**
 * Hook for fetching assets with loading and error states
 * Now uses React Query for caching - prevents duplicate fetches
 */
export function useAssets(): DataFetchResult<Asset[]> {
  const query = useAssetsQuery();

  const refetch = useCallback(() => {
    return query.refetch();
  }, [query]);

  return {
    data: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error : null,
    refetch,
  };
}

/**
 * Hook for fetching sites with loading and error states
 * Now uses React Query for caching
 */
export function useSites(): DataFetchResult<Site[]> {
  const query = useSitesQuery();

  const refetch = useCallback(() => {
    return query.refetch();
  }, [query]);

  return {
    data: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error : null,
    refetch,
  };
}

/**
 * Hook for fetching projects with loading and error states
 * Now uses React Query for caching
 */
export function useProjects(): DataFetchResult<Project[]> {
  const query = useProjectsQuery();

  const refetch = useCallback(() => {
    return query.refetch();
  }, [query]);

  return {
    data: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error : null,
    refetch,
  };
}

/**
 * Hook for fetching contacts with loading and error states
 * Now uses React Query for caching
 */
export function useContacts(): DataFetchResult<Contact[]> {
  const query = useContactsQuery();

  const refetch = useCallback(() => {
    return query.refetch();
  }, [query]);

  return {
    data: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error : null,
    refetch,
  };
}

/**
 * Hook for fetching all data (sites, projects, assets, contacts)
 * Uses individual React Query hooks for maximum caching efficiency
 */
export function useAllData() {
  const assetsQuery = useAssetsQuery();
  const sitesQuery = useSitesQuery();
  const projectsQuery = useProjectsQuery();
  const contactsQuery = useContactsQuery();

  const isLoading = assetsQuery.isLoading || sitesQuery.isLoading || projectsQuery.isLoading || contactsQuery.isLoading;
  const error = assetsQuery.error || sitesQuery.error || projectsQuery.error || contactsQuery.error;

  const refetch = useCallback(async () => {
    await Promise.all([
      assetsQuery.refetch(),
      sitesQuery.refetch(),
      projectsQuery.refetch(),
      contactsQuery.refetch(),
    ]);
  }, [assetsQuery, sitesQuery, projectsQuery, contactsQuery]);

  return {
    data: {
      assets: assetsQuery.data ?? [],
      sites: sitesQuery.data ?? [],
      projects: projectsQuery.data ?? [],
      contacts: contactsQuery.data ?? [],
    },
    loading: isLoading,
    error: error instanceof Error ? error : null,
    refetch,
  };
}

/**
 * Hook for fetching assets filtered by site
 * Uses React Query for caching site-specific asset queries
 */
export function useAssetsBySite(siteName: string): DataFetchResult<Asset[]> {
  const query = useQuery({
    queryKey: ['assets', 'site', siteName],
    queryFn: async () => {
      if (!siteName) return [];
      return await dataService.fetchAssetsBySite(siteName);
    },
    enabled: !!siteName,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const refetch = useCallback(() => {
    return query.refetch();
  }, [query]);

  return {
    data: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error : null,
    refetch,
  };
}

/**
 * Hook for fetching assets filtered by project
 * Uses React Query for caching project-specific asset queries
 */
export function useAssetsByProject(projectCode: string): DataFetchResult<Asset[]> {
  const query = useQuery({
    queryKey: ['assets', 'project', projectCode],
    queryFn: async () => {
      if (!projectCode) return [];
      return await dataService.fetchAssetsByProject(projectCode);
    },
    enabled: !!projectCode,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const refetch = useCallback(() => {
    return query.refetch();
  }, [query]);

  return {
    data: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error : null,
    refetch,
  };
}

