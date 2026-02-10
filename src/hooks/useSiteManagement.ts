import { useState, useCallback } from 'react';
import { Site } from '@/types/data';
import { useSites } from './useData';
import { toast } from '@/hooks/use-toast';
import { dataSourceConfig } from '@/config/dataSource';
import { sitesApi } from '@/services/apiService';

/**
 * Hook for managing sites (add, edit, delete)
 * Stores custom sites in localStorage and merges with CSV data
 */
export const useSiteManagement = () => {
  const { data: csvSites, refetch } = useSites();
  const isApi = dataSourceConfig.type === 'api';
  const [customSites, setCustomSites] = useState<Site[]>(() => {
    const stored = localStorage.getItem('customSites');
    return stored ? JSON.parse(stored) : [];
  });

  // Get all sites (CSV + custom)
  const allSites = isApi ? [...csvSites] : [...csvSites, ...customSites];

  const addSite = useCallback((site: Omit<Site, 'projects' | 'assets'>) => {
    if (isApi) {
      (async () => {
        try {
          // Check if site already exists
          if (allSites.some(s => s.building.toLowerCase() === site.building.toLowerCase())) {
            toast({
              title: "Error",
              description: `A site with the name "${site.building}" already exists`,
              variant: "destructive",
            });
            return;
          }

          await sitesApi.create({
            ...site,
            siteId: site.building,
            projectCodes: [],
            contacts: site.contacts || [],
          });
          await refetch?.();
          toast({
            title: "Success",
            description: `Site "${site.building}" has been added`,
          });
        } catch (error: any) {
          toast({
            title: "Error",
            description: error.message || 'Failed to add site',
            variant: "destructive",
          });
        }
      })();
      return;
    }

    const newSite: Site = {
      ...site,
      projects: [],
      assets: [],
    };

    // Check if site already exists
    if (allSites.some(s => s.building.toLowerCase() === site.building.toLowerCase())) {
      toast({
        title: "Error",
        description: `A site with the name "${site.building}" already exists`,
        variant: "destructive",
      });
      return;
    }

    const updated = [...customSites, newSite];
    setCustomSites(updated);
    localStorage.setItem('customSites', JSON.stringify(updated));
    
    toast({
      title: "Success",
      description: `Site "${site.building}" has been added`,
    });
  }, [customSites, allSites, isApi, refetch]);

  const updateSite = useCallback((updatedSite: Site) => {
    if (isApi) {
      (async () => {
        try {
          await sitesApi.update({
            ...updatedSite,
            siteId: updatedSite.siteId || updatedSite.building,
            contacts: updatedSite.contacts || [],
            projectCodes: (updatedSite.projects || []).map(p => p.projectCode),
          });
          await refetch?.();
          toast({
            title: "Success",
            description: `Site "${updatedSite.building}" has been updated`,
          });
        } catch (error: any) {
          toast({
            title: "Error",
            description: error.message || 'Failed to update site',
            variant: "destructive",
          });
        }
      })();
      return;
    }

    // Check if it's a CSV site (read-only) or custom site
    const isCsvSite = csvSites.some(s => s.building === updatedSite.building);
    
    if (isCsvSite) {
      // For CSV sites, create a custom override
      const existingCustom = customSites.find(s => s.building === updatedSite.building);
      if (existingCustom) {
        const updated = customSites.map(s => 
          s.building === updatedSite.building ? updatedSite : s
        );
        setCustomSites(updated);
        localStorage.setItem('customSites', JSON.stringify(updated));
      } else {
        // Create new custom override
        const updated = [...customSites, updatedSite];
        setCustomSites(updated);
        localStorage.setItem('customSites', JSON.stringify(updated));
      }
    } else {
      // Update custom site
      const updated = customSites.map(s => 
        s.building === updatedSite.building ? updatedSite : s
      );
      setCustomSites(updated);
      localStorage.setItem('customSites', JSON.stringify(updated));
    }

    toast({
      title: "Success",
      description: `Site "${updatedSite.building}" has been updated`,
    });
  }, [customSites, csvSites, isApi, refetch]);

  const deleteSite = useCallback(async (building: string) => {
    try {
      // VALIDATE building name before deletion
      if (!building || building.trim().length === 0) {
        console.error('[useSiteManagement] Invalid building name for deletion:', building);
        toast({
          title: "Error",
          description: "Invalid site name",
          variant: "destructive",
        });
        return;
      }

      if (isApi) {
        await sitesApi.delete(building);
        toast({
          title: "Success",
          description: `Site "${building}" has been permanently deleted`,
        });
        refetch?.();
        return;
      }

      // Try to call backend DELETE endpoint if available
      // In local development with CSV data, this endpoint may not exist
      try {
        const response = await fetch('/api/sites/delete', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          },
          body: JSON.stringify({ siteId: building }),
        });

        if (response.ok) {
          // Backend deletion successful
          const data = await response.json();
          console.log('[useSiteManagement] Site deleted via backend API:', data);
        } else {
          // Backend returned error - continue with local deletion tracking
          console.warn('[useSiteManagement] Backend returned error, falling back to local deletion tracking');
        }
      } catch (fetchError) {
        // API endpoint doesn't exist or network error - use local deletion tracking
        console.log('[useSiteManagement] No backend API available, using local deletion tracking');
      }

      // Track deleted site codes in localStorage (for CSV data filtering in local dev mode)
      const deleted = (() => {
        try {
          const stored = localStorage.getItem('_deletedSiteCodes');
          return stored ? JSON.parse(stored) : [];
        } catch (e) {
          return [];
        }
      })();

      if (!deleted.includes(building)) {
        deleted.push(building);
        localStorage.setItem('_deletedSiteCodes', JSON.stringify(deleted));
      }

      // Remove from custom sites if it exists there
      const updated = customSites.filter(s => s.building !== building);
      if (updated.length !== customSites.length) {
        setCustomSites(updated);
        localStorage.setItem('customSites', JSON.stringify(updated));
      }

      toast({
        title: "Success",
        description: `Site "${building}" has been permanently deleted`,
      });

      // Refetch to get updated data from backend (will filter by _deletedSiteCodes)
      refetch?.();
    } catch (error: any) {
      console.error('[useSiteManagement] Error deleting site:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to delete site',
        variant: "destructive",
      });
    }
  }, [customSites, refetch, isApi]);

  // Get merged sites (CSV sites with custom overrides)
  const getMergedSites = useCallback((): Site[] => {
    if (isApi) {
      return csvSites;
    }

    const merged: Site[] = [];
    const customMap = new Map(customSites.map(s => [s.building, s]));

    // Add CSV sites, using custom overrides if they exist
    csvSites.forEach(csvSite => {
      const customOverride = customMap.get(csvSite.building);
      if (customOverride) {
        // Merge: use custom override but keep CSV projects/assets
        merged.push({
          ...customOverride,
          projects: csvSite.projects || [],
          assets: csvSite.assets || [],
        });
        customMap.delete(csvSite.building);
      } else {
        merged.push(csvSite);
      }
    });

    // Add remaining custom sites (newly added ones)
    customMap.forEach(site => merged.push(site));

    return merged;
  }, [csvSites, customSites, isApi]);

  return {
    sites: getMergedSites(),
    addSite,
    updateSite,
    deleteSite,
    refetch,
  };
};

