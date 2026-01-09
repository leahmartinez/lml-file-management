import { useState, useCallback } from 'react';
import { Site } from '@/types/data';
import { useSites } from './useData';
import { toast } from '@/hooks/use-toast';

/**
 * Hook for managing sites (add, edit, delete)
 * Stores custom sites in localStorage and merges with CSV data
 */
export const useSiteManagement = () => {
  const { data: csvSites, refetch } = useSites();
  const [customSites, setCustomSites] = useState<Site[]>(() => {
    const stored = localStorage.getItem('customSites');
    return stored ? JSON.parse(stored) : [];
  });

  // Get all sites (CSV + custom)
  const allSites = [...csvSites, ...customSites];

  const addSite = useCallback((site: Omit<Site, 'projects' | 'assets'>) => {
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
  }, [customSites, allSites]);

  const updateSite = useCallback((updatedSite: Site) => {
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
  }, [customSites, csvSites]);

  const deleteSite = useCallback(async (building: string) => {
    try {
      // Call backend DELETE endpoint
      const response = await fetch('/api/sites/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({ siteId: building }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete site');
      }

      // Track deleted site codes in localStorage (for mock data filtering in local dev mode)
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

      // Refetch to get updated data from backend
      refetch?.();
    } catch (error: any) {
      console.error('[useSiteManagement] Error deleting site:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to delete site',
        variant: "destructive",
      });
    }
  }, [customSites, refetch]);

  // Get merged sites (CSV sites with custom overrides)
  const getMergedSites = useCallback((): Site[] => {
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
  }, [csvSites, customSites]);

  return {
    sites: getMergedSites(),
    addSite,
    updateSite,
    deleteSite,
    refetch,
  };
};

