/**
 * Hook for managing contact assignments to sites and projects
 * Persists assignments to localStorage
 */

import { useCallback, useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { dataSourceConfig } from '@/config/dataSource';
import { useSites, useProjects } from './useData';
import { projectsApi, sitesApi } from '@/services/apiService';

interface ContactAssignments {
  sites: Record<string, string[]>; // siteName -> email[]
  projects: Record<string, string[]>; // projectCode -> email[]
}

export const useContactAssignments = () => {
  const { toast } = useToast();
  const { data: sites } = useSites();
  const { data: projects } = useProjects();
  const isApi = dataSourceConfig.type === 'api';
  const [assignments, setAssignments] = useState<ContactAssignments>({
    sites: {},
    projects: {},
  });

  // Load assignments from localStorage on mount
  useEffect(() => {
    if (isApi) {
      const nextAssignments: ContactAssignments = { sites: {}, projects: {} };
      sites.forEach(site => {
        if (site.contacts && site.contacts.length > 0) {
          nextAssignments.sites[site.building] = site.contacts;
        }
      });
      projects.forEach(project => {
        if (project.contacts && project.contacts.length > 0) {
          nextAssignments.projects[project.projectCode] = project.contacts;
        }
      });
      setAssignments(nextAssignments);
      return;
    }

    const stored = localStorage.getItem('contactAssignments');
    if (stored) {
      try {
        setAssignments(JSON.parse(stored));
      } catch (e) {
        console.error('Error loading contact assignments:', e);
      }
    }
  }, [isApi, sites, projects]);

  /**
   * Get assigned contacts for a site
   */
  const getSiteContacts = useCallback((siteName: string): string[] => {
    return assignments.sites[siteName] || [];
  }, [assignments.sites]);

  /**
   * Get assigned contacts for a project
   */
  const getProjectContacts = useCallback((projectCode: string): string[] => {
    return assignments.projects[projectCode] || [];
  }, [assignments.projects]);

  /**
   * Update contacts assigned to a site
   */
  const updateSiteContacts = useCallback((siteName: string, contactEmails: string[]) => {
    if (isApi) {
      (async () => {
        try {
          await sitesApi.update({
            siteId: siteName,
            building: siteName,
            contacts: contactEmails,
          });
          setAssignments(prev => ({
            ...prev,
            sites: {
              ...prev.sites,
              [siteName]: contactEmails,
            },
          }));
          toast({
            title: "Success",
            description: `Updated ${contactEmails.length} contact(s) for site`,
          });
        } catch (error: any) {
          toast({
            title: "Error",
            description: error.message || 'Failed to update site contacts',
            variant: "destructive",
          });
        }
      })();
      return;
    }

    setAssignments(prev => {
      const updated = {
        ...prev,
        sites: {
          ...prev.sites,
          [siteName]: contactEmails,
        }
      };
      localStorage.setItem('contactAssignments', JSON.stringify(updated));
      return updated;
    });

    toast({
      title: "Success",
      description: `Updated ${contactEmails.length} contact(s) for site`,
    });
  }, [toast, isApi]);

  /**
   * Update contacts assigned to a project
   */
  const updateProjectContacts = useCallback((projectCode: string, contactEmails: string[]) => {
    if (isApi) {
      (async () => {
        try {
          await projectsApi.update({
            projectCode,
            contacts: contactEmails,
          });
          setAssignments(prev => ({
            ...prev,
            projects: {
              ...prev.projects,
              [projectCode]: contactEmails,
            },
          }));
          toast({
            title: "Success",
            description: `Updated ${contactEmails.length} contact(s) for project`,
          });
        } catch (error: any) {
          toast({
            title: "Error",
            description: error.message || 'Failed to update project contacts',
            variant: "destructive",
          });
        }
      })();
      return;
    }

    setAssignments(prev => {
      const updated = {
        ...prev,
        projects: {
          ...prev.projects,
          [projectCode]: contactEmails,
        }
      };
      localStorage.setItem('contactAssignments', JSON.stringify(updated));
      return updated;
    });

    toast({
      title: "Success",
      description: `Updated ${contactEmails.length} contact(s) for project`,
    });
  }, [toast, isApi]);

  /**
   * Add a contact to a site
   */
  const addSiteContact = useCallback((siteName: string, contactEmail: string) => {
    const current = assignments.sites[siteName] || [];
    if (!current.includes(contactEmail)) {
      const updated = [...current, contactEmail];
      updateSiteContacts(siteName, updated);
    }
  }, [assignments.sites, updateSiteContacts]);

  /**
   * Remove a contact from a site
   */
  const removeSiteContact = useCallback((siteName: string, contactEmail: string) => {
    const current = assignments.sites[siteName] || [];
    const updated = current.filter(email => email !== contactEmail);
    updateSiteContacts(siteName, updated);
  }, [assignments.sites, updateSiteContacts]);

  /**
   * Add a contact to a project
   */
  const addProjectContact = useCallback((projectCode: string, contactEmail: string) => {
    const current = assignments.projects[projectCode] || [];
    if (!current.includes(contactEmail)) {
      const updated = [...current, contactEmail];
      updateProjectContacts(projectCode, updated);
    }
  }, [assignments.projects, updateProjectContacts]);

  /**
   * Remove a contact from a project
   */
  const removeProjectContact = useCallback((projectCode: string, contactEmail: string) => {
    const current = assignments.projects[projectCode] || [];
    const updated = current.filter(email => email !== contactEmail);
    updateProjectContacts(projectCode, updated);
  }, [assignments.projects, updateProjectContacts]);

  return {
    assignments,
    getSiteContacts,
    getProjectContacts,
    updateSiteContacts,
    updateProjectContacts,
    addSiteContact,
    removeSiteContact,
    addProjectContact,
    removeProjectContact,
  };
};
