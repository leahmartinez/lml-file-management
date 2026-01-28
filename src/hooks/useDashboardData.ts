/**
 * Hook for dashboard data preparation
 * Flattens projects into individual stage rows, merging projects, sites, contacts, and stage consultants
 */

import { useMemo } from 'react';
import { Project, Site, DirectoryContact, ProjectStage } from '@/types/data';
import { useProjectManagement } from './useProjectManagement';
import { useSites } from './useData';
import { useContacts } from './useContacts';
import { useStageConsultants } from './useStageConsultants';
import { useAuth } from './useAuth';

export interface DashboardRow {
  // Original data
  project: Project;
  stage: ProjectStage;
  site?: Site;
  primaryContact?: DirectoryContact;

  // Project-level fields (shared across all stages for same project)
  projectCode: string;
  building: string;
  address?: string;
  suburb?: string;
  state: string;
  postcode?: string;
  orderDate?: string;
  invoiceStatus?: string;
  jobStatus: string;
  jwSummary?: string; // Project type or custom type (JW Summary)
  lifts?: string; // Count and list of assets
  clientName?: string;
  clientBusiness?: string;

  // Stage-level fields (unique to each stage)
  stageId: string;
  stageName: string;
  stageStatus: string;
  stagePrice?: number; // Individual stage price (not project total)
  stageConsultantEmails?: string[]; // Consultant emails assigned to this stage
  stageConsultantNames?: string; // Display string of consultant names
  plannedSiteVisitDate?: string; // When consultant plans to visit site

  // For sorting/display purposes
  description?: string; // Stage name for display
  value?: number; // Stage price for sorting and stats

  // For searching/filtering
  searchableText: string;
}

export function useDashboardData() {
  const { projects: allProjects, loading: projectsLoading } = useProjectManagement();
  const { data: sites = [] } = useSites();
  const { contacts = [] } = useContacts() || {};
  const { getStageConsultants } = useStageConsultants();
  const { user } = useAuth();

  // Memoize contact lookup map for O(1) access instead of O(n) .find()
  const contactsByEmail = useMemo(() => {
    const map = new Map<string, typeof contacts[0]>();
    for (const contact of contacts) {
      map.set(contact.email, contact);
    }
    return map;
  }, [contacts]);

  // Flatten projects into individual stage rows, merging with site and contact data
  const dashboardRows = useMemo(() => {
    if (!allProjects || allProjects.length === 0) {
      return [];
    }

    const allRows = allProjects.flatMap((project) => {
      // Find corresponding site
      const site = sites && sites.length > 0
        ? sites.find((s) => s.building === project.building)
        : undefined;

      // Find primary contact using memoized map (O(1) instead of O(n))
      const primaryContactEmail = project.primaryClientEmail || project.contacts?.[0];
      const primaryContact = primaryContactEmail ? contactsByEmail.get(primaryContactEmail) : undefined;

      // Get assigned assets/lifts for this project (not all site units)
      // Retrieve assigned unit IDs from localStorage
      const assignedUnitIds: string[] = (() => {
        try {
          const stored = localStorage.getItem(`projectUnits_${project.projectCode}`);
          return stored ? JSON.parse(stored) : [];
        } catch (e) {
          console.error(`Error loading assigned units for ${project.projectCode}:`, e);
          return [];
        }
      })();

      // Filter site units to only show assigned ones
      const assignedUnits = site?.units?.filter((u) => assignedUnitIds.includes(u.id)) || [];
      const assetCount = assignedUnits.length;
      const assetNames = assignedUnits.map((u) => u.name).join(', ');
      const liftsDisplay = assetCount > 0 ? `${assetCount} lifts: ${assetNames}` : 'No lifts assigned';

      // Determine JW Summary display (project-level)
      const jwSummary = project.customProjectType || project.projectType || 'Unspecified';

      // Create a row for each stage
      return project.stages.map((stage) => {
        // Get stage-specific consultants using memoized map (O(1) lookups)
        const stageConsultantEmails = getStageConsultants(stage.id);
        const stageConsultantNames = stageConsultantEmails.length > 0
          ? stageConsultantEmails
            .map((email) => {
              const contact = contactsByEmail.get(email);
              if (contact && contact.firstName && contact.lastName) {
                return `${contact.firstName} ${contact.lastName}`;
              } else if (contact && contact.firstName) {
                return contact.firstName;
              } else {
                // Fallback to first part of email if no name is set
                return email.split('@')[0];
              }
            })
            .join(', ')
          : undefined;

        // Get JW Summary - prefer stage-level, fall back to project-level
        const stageJwSummary = stage.customProjectType || stage.projectType || jwSummary;

        // Build searchable text for filtering
        const searchableText = [
          project.projectCode,
          project.building,
          site?.address || '',
          site?.city || '',
          site?.postcode || '',
          project.status || '',
          project.invoiceStatus || '',
          stageJwSummary,
          primaryContact ? `${primaryContact.firstName} ${primaryContact.lastName}` : '',
          stage.name,
          stage.status || '',
          stageConsultantNames || '',
        ]
          .join(' ')
          .toLowerCase();

        return {
          // Original data
          project,
          stage,
          site,
          primaryContact,

          // Project-level fields (shared across all stages)
          projectCode: project.projectCode,
          building: project.building,
          address: site?.address,
          suburb: site?.city,
          state: project.state,
          postcode: site?.postcode,
          orderDate: project.orderDate,
          invoiceStatus: project.invoiceStatus,
          jobStatus: project.status,
          jwSummary,
          lifts: liftsDisplay,
          clientName: primaryContact
            ? `${primaryContact.firstName} ${primaryContact.lastName}`
            : undefined,
          clientBusiness: primaryContact?.category,

          // Stage-level fields (unique to each stage)
          stageId: stage.id,
          stageName: stage.name,
          stageStatus: stage.status,
          stagePrice: stage.price,
          stageConsultantEmails,
          stageConsultantNames,
          plannedSiteVisitDate: stage.plannedSiteVisitDate,

          // For sorting/display
          description: stage.name, // Stage name for display
          value: stage.price, // Stage price for sorting and stats

          searchableText,
        };
      });
    });
    if (user?.role === 'subconsultant' && user.email) {
      return allRows.filter((row) => row.stageConsultantEmails?.includes(user.email));
    }

    return allRows;
  }, [allProjects, sites, contactsByEmail, getStageConsultants, user?.email, user?.role]);

  return {
    rows: dashboardRows,
    loading: projectsLoading,
    totalCount: dashboardRows.length,
  };
}
