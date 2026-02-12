import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Project, ProjectStage, ProjectStageStatus } from '@/types/data';
import { useProjects } from './useData';
import { toast } from '@/hooks/use-toast';
import { dataSourceConfig } from '@/config/dataSource';
import { projectsApi } from '@/services/apiService';
import { graphService } from '@/services/graphService';

export interface SharePointRenameSummary {
  renamed?: boolean;
  created?: boolean;
  migrated?: boolean;
  deletedOld?: boolean;
  usedCopyFallback?: boolean;
  error?: string;
}

export interface ProjectRenameSummary {
  projectCode: string;
  newProjectCode: string;
  stagesMigrated: number;
  sitesUpdated: number;
  sharepoint?: SharePointRenameSummary;
}

export interface ProjectRenameResult {
  ok: boolean;
  summary?: ProjectRenameSummary;
  error?: string;
}

/**
 * Hook for managing projects (edit code, description, status, etc.)
 * Stores custom projects in localStorage and merges with data source
 */
export const useProjectManagement = () => {
  const { data: sourceProjects, refetch } = useProjects();
  const isApi = dataSourceConfig.type === 'api';
  const [customProjects, setCustomProjects] = useState<Project[]>(() => {
    const stored = localStorage.getItem('customProjects');
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored);
      // Filter out null/undefined projects from stored data
      return Array.isArray(parsed) ? parsed.filter((p): p is Project => p !== null && p !== undefined && !!p.projectCode) : [];
    } catch (error) {
      console.error('[useProjectManagement] Error parsing customProjects from localStorage:', error);
      return [];
    }
  });
  // No longer tracking soft-deleted projects - all deletions are permanent on backend
  const persistCustomProjects = useCallback((updated: Project[]) => {
    if (isApi) {
      return;
    }
    setCustomProjects(updated);
    localStorage.setItem('customProjects', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('customProjectsUpdated'));
  }, [isApi]);
  const getProjectForUpdate = useCallback((projectCode: string) => {
    return (
      customProjects.find(p => p.projectCode === projectCode) ||
      sourceProjects.find(p => p.projectCode === projectCode)
    );
  }, [customProjects, sourceProjects]);

  // Update project code
  const updateProjectCode = useCallback(async (projectCode: string, newCode: string): Promise<ProjectRenameResult> => {
    if (isApi) {
      try {
        const renameResult = await projectsApi.rename(projectCode, newCode);

        const keysToMove = [
          `projectUnits_${projectCode}`,
          `projectFiles_${projectCode}`,
          `projectComments_${projectCode}`,
          `stageUpdates_${projectCode}`,
        ];
        keysToMove.forEach((key) => {
          const value = localStorage.getItem(key);
          if (value !== null) {
            localStorage.setItem(key.replace(projectCode, newCode), value);
            localStorage.removeItem(key);
          }
        });

        let sharepointSummary: SharePointRenameSummary | undefined;
        try {
          sharepointSummary = await graphService.migrateProjectFolder(projectCode, newCode);
        } catch (error: any) {
          console.warn('SharePoint folder migration failed:', error);
          sharepointSummary = { error: error?.message || 'SharePoint migration failed' };
        }

        await refetch?.();
        return {
          ok: true,
          summary: {
            projectCode: renameResult.projectCode || projectCode,
            newProjectCode: renameResult.newProjectCode || newCode,
            stagesMigrated: renameResult.stagesMigrated ?? 0,
            sitesUpdated: renameResult.sitesUpdated ?? 0,
            sharepoint: sharepointSummary,
          },
        };
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to rename project",
          variant: "destructive",
        });
        return { ok: false, error: error.message || "Failed to rename project" };
      }
    }

    const project = sourceProjects.find(p => p.projectCode === projectCode) ||
                    customProjects.find(p => p.projectCode === projectCode);
    if (!project) return { ok: false, error: "Project not found" };

    const updated: Project = {
      ...project,
      projectCode: newCode,
      // Track the original project code for proper merging
      _originalProjectCode: (project as any)._originalProjectCode || projectCode,
    };

    // Track renamed project codes so we can filter out the old source project
    const renamedCodes = (() => {
      try {
        const stored = localStorage.getItem('_renamedProjectCodes');
        return stored ? JSON.parse(stored) : {};
      } catch (e) {
        return {};
      }
    })();
    // Map original code to new code
    const originalCode = (project as any)._originalProjectCode || projectCode;
    renamedCodes[originalCode] = newCode;
    localStorage.setItem('_renamedProjectCodes', JSON.stringify(renamedCodes));

    const existingCustom = customProjects.find(p => p.projectCode === projectCode);
    if (existingCustom) {
      const updated_list = customProjects.map(p =>
        p.projectCode === projectCode ? updated : p
      );
      persistCustomProjects(updated_list);
    } else {
      persistCustomProjects([...customProjects, updated]);
    }

    toast({
      title: "Success",
      description: `Project code updated to ${newCode}`,
    });
    return {
      ok: true,
      summary: {
        projectCode,
        newProjectCode: newCode,
        stagesMigrated: 0,
        sitesUpdated: 0,
      },
    };
  }, [customProjects, sourceProjects, persistCustomProjects, isApi, refetch]);

  // Update project description
  const updateProjectDescription = useCallback((projectCode: string, newDescription: string) => {
    if (isApi) {
      (async () => {
        try {
          await projectsApi.update({ projectCode, description: newDescription });
          await refetch?.();
          toast({
            title: "Success",
            description: "Project description updated",
          });
        } catch (error: any) {
          toast({
            title: "Error",
            description: error.message || 'Failed to update project description',
            variant: "destructive",
          });
        }
      })();
      return;
    }

    const project = sourceProjects.find(p => p.projectCode === projectCode);
    if (!project) return;

    const updated: Project = {
      ...project,
      description: newDescription,
    };

    const existingCustom = customProjects.find(p => p.projectCode === projectCode);
    if (existingCustom) {
      const updated_list = customProjects.map(p =>
        p.projectCode === projectCode ? updated : p
      );
      persistCustomProjects(updated_list);
    } else {
      persistCustomProjects([...customProjects, updated]);
    }

    toast({
      title: "Success",
      description: "Project description updated",
    });
  }, [customProjects, sourceProjects, persistCustomProjects, isApi, refetch]);

  // Update project status
  const updateProjectStatus = useCallback((projectCode: string, newStatus: string) => {
    if (isApi) {
      (async () => {
        try {
          await projectsApi.update({ projectCode, status: newStatus });
          await refetch?.();
          toast({
            title: "Success",
            description: `Project status updated to ${newStatus}`,
          });
        } catch (error: any) {
          toast({
            title: "Error",
            description: error.message || 'Failed to update project status',
            variant: "destructive",
          });
        }
      })();
      return;
    }

    const project = sourceProjects.find(p => p.projectCode === projectCode);
    if (!project) return;

    const updated: Project = {
      ...project,
      status: newStatus as any,
    };

    const existingCustom = customProjects.find(p => p.projectCode === projectCode);
    if (existingCustom) {
      const updated_list = customProjects.map(p =>
        p.projectCode === projectCode ? updated : p
      );
      persistCustomProjects(updated_list);
    } else {
      persistCustomProjects([...customProjects, updated]);
    }

    toast({
      title: "Success",
      description: `Project status updated to ${newStatus}`,
    });
  }, [customProjects, sourceProjects, persistCustomProjects, isApi, refetch]);

  // Update stage status
  const updateStageStatus = useCallback((projectCode: string, stageId: string, newStatus: ProjectStageStatus) => {
    const project = getProjectForUpdate(projectCode);
    if (!project) return;

    const updated: Project = {
      ...project,
      stages: project.stages.map(stage =>
        stage.id === stageId ? { ...stage, status: newStatus } : stage
      ),
    };

    if (isApi) {
      (async () => {
        try {
          await projectsApi.update({ projectCode, stages: updated.stages });
          await refetch?.();
          toast({
            title: "Success",
            description: `Stage status updated to ${newStatus}`,
          });
        } catch (error: any) {
          toast({
            title: "Error",
            description: error.message || 'Failed to update stage status',
            variant: "destructive",
          });
        }
      })();
      return;
    }

    const existingCustom = customProjects.find(p => p.projectCode === projectCode);
    if (existingCustom) {
      const updated_list = customProjects.map(p =>
        p.projectCode === projectCode ? updated : p
      );
      persistCustomProjects(updated_list);
    } else {
      persistCustomProjects([...customProjects, updated]);
    }

    toast({
      title: "Success",
      description: `Stage status updated to ${newStatus}`,
    });
  }, [customProjects, getProjectForUpdate, persistCustomProjects, isApi, refetch]);

  // Update stage planned site visit date
  const updateStageSiteVisitDate = useCallback((projectCode: string, stageId: string, newDate: string) => {
    const project = getProjectForUpdate(projectCode);
    if (!project) return;

    const updated: Project = {
      ...project,
      stages: project.stages.map(stage =>
        stage.id === stageId ? { ...stage, plannedSiteVisitDate: newDate || undefined } : stage
      ),
    };

    if (isApi) {
      (async () => {
        try {
          await projectsApi.update({ projectCode, stages: updated.stages });
          await refetch?.();
          toast({
            title: "Success",
            description: newDate ? "Site visit date updated" : "Site visit date cleared",
          });
        } catch (error: any) {
          toast({
            title: "Error",
            description: error.message || 'Failed to update site visit date',
            variant: "destructive",
          });
        }
      })();
      return;
    }

    const existingCustom = customProjects.find(p => p.projectCode === projectCode);
    if (existingCustom) {
      const updated_list = customProjects.map(p =>
        p.projectCode === projectCode ? updated : p
      );
      persistCustomProjects(updated_list);
    } else {
      persistCustomProjects([...customProjects, updated]);
    }

    toast({
      title: "Success",
      description: newDate ? "Site visit date updated" : "Site visit date cleared",
    });
  }, [customProjects, getProjectForUpdate, persistCustomProjects, isApi, refetch]);

  // Get merged projects (source projects with custom overrides)
  const getMergedProjects = useCallback((): Project[] => {
    if (isApi) {
      return sourceProjects;
    }

    const merged: Project[] = [];
    // Filter out null/undefined projects before creating map
    const customMap = new Map(
      customProjects
        .filter((p): p is Project => p !== null && p !== undefined && !!p.projectCode)
        .map(p => [p.projectCode, p])
    );

    // Get renamed project codes to filter out old source projects
    const renamedCodes: Record<string, string> = (() => {
      try {
        const stored = localStorage.getItem('_renamedProjectCodes');
        return stored ? JSON.parse(stored) : {};
      } catch (e) {
        return {};
      }
    })();

    // Add source projects, using custom overrides if they exist
    sourceProjects.forEach(sourceProject => {
      // Skip source projects that have been renamed (we'll use the custom one with new code)
      if (renamedCodes[sourceProject.projectCode]) {
        return;
      }

      const customOverride = customMap.get(sourceProject.projectCode);
      if (customOverride) {
        merged.push(customOverride);
        customMap.delete(sourceProject.projectCode);
      } else {
        merged.push(sourceProject);
      }
    });

    // Add remaining custom projects (includes renamed projects with new codes)
    customMap.forEach(project => {
      merged.push(project);
    });

    return merged;
  }, [sourceProjects, customProjects, isApi]);

  // Add a new project
  const addProject = useCallback((project: Project) => {
    // Check if project already exists
    const allProjects = getMergedProjects();
    if (allProjects.some(p => p.projectCode === project.projectCode)) {
      toast({
        title: "Error",
        description: `A project with code "${project.projectCode}" already exists`,
        variant: "destructive",
      });
      return false;
    }

    if (isApi) {
      (async () => {
        try {
          const payload: any = { ...project };
          if (Array.isArray(payload.stages) && payload.stages.length === 0) {
            delete payload.stages;
          }
          await projectsApi.create(payload);
          await refetch?.();
          toast({
            title: "Success",
            description: `Project "${project.projectCode}" has been added`,
          });
        } catch (error: any) {
          toast({
            title: "Error",
            description: error.message || 'Failed to add project',
            variant: "destructive",
          });
        }
      })();
      return true;
    }

    const updated = [...customProjects, project];
    persistCustomProjects(updated);

    toast({
      title: "Success",
      description: `Project "${project.projectCode}" has been added`,
    });
    return true;
  }, [customProjects, getMergedProjects, persistCustomProjects, isApi, refetch]);

  // Update entire project (useful for stages, files, etc.)
  const updateProject = useCallback((projectCode: string, updatedProject: Project) => {
    if (isApi) {
      (async () => {
        try {
          const payload: any = { projectCode, ...updatedProject };
          if (Array.isArray(payload.stages) && payload.stages.length === 0) {
            delete payload.stages;
          }
          await projectsApi.update(payload);
          await refetch?.();
        } catch (error: any) {
          toast({
            title: "Error",
            description: error.message || 'Failed to update project',
            variant: "destructive",
          });
        }
      })();
      return;
    }

    const existingCustom = customProjects.find(p => p.projectCode === projectCode);
    if (existingCustom) {
      const updated_list = customProjects.map(p =>
        p.projectCode === projectCode ? updatedProject : p
      );
      persistCustomProjects(updated_list);
    } else {
      // Project doesn't exist in custom, add it
      persistCustomProjects([...customProjects, updatedProject]);
    }
  }, [customProjects, persistCustomProjects, isApi, refetch, toast]);

  // Delete a project (permanent backend deletion)
  const deleteProject = useCallback(async (projectCode: string) => {
    // VALIDATE project code before deletion
    if (!projectCode || projectCode.trim().length === 0) {
      console.error('[useProjectManagement] Invalid project code for deletion:', projectCode);
      toast({
        title: "Error",
        description: "Invalid project code",
        variant: "destructive",
      });
      return false;
    }

    try {
      if (isApi) {
        await projectsApi.delete(projectCode);
      } else {
        // Call backend DELETE endpoint
        const response = await fetch('/api/projects/delete', {
          method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('jwt_token') || ''}`,
            },
          body: JSON.stringify({ projectCode }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to delete project');
        }
      }

      // Track deleted project codes in localStorage (for mock data filtering in local dev mode)
      const deleted = (() => {
        try {
          const stored = localStorage.getItem('_deletedProjectCodes');
          return stored ? JSON.parse(stored) : [];
        } catch (e) {
          return [];
        }
      })();
      if (!deleted.includes(projectCode)) {
        deleted.push(projectCode);
        localStorage.setItem('_deletedProjectCodes', JSON.stringify(deleted));
      }

      // Clean up renamed codes tracking if this project was renamed
      const renamedCodes = (() => {
        try {
          const stored = localStorage.getItem('_renamedProjectCodes');
          return stored ? JSON.parse(stored) : {};
        } catch (e) {
          return {};
        }
      })();
      // Find and remove any rename entry that points to this project code
      const originalCode = Object.keys(renamedCodes).find(k => renamedCodes[k] === projectCode);
      if (originalCode) {
        delete renamedCodes[originalCode];
        localStorage.setItem('_renamedProjectCodes', JSON.stringify(renamedCodes));
      }

      if (!isApi) {
        // Remove from custom projects if it exists there
        const customUpdated = customProjects.filter(p => p.projectCode !== projectCode);
        if (customUpdated.length !== customProjects.length) {
          persistCustomProjects(customUpdated);
        }
      }

      toast({
        title: "Success",
        description: `Project "${projectCode}" has been permanently deleted`,
      });

      // Refetch to get updated data from backend
      refetch?.();
      return true;
    } catch (error: any) {
      console.error('[useProjectManagement] Error deleting project:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to delete project',
        variant: "destructive",
      });
      return false;
    }
  }, [customProjects, refetch, persistCustomProjects, isApi]);

  // Clean up old deletedProjects from localStorage (for backward compatibility)
  // This can be removed in a future version
  useEffect(() => {
    if (isApi) return;
    const stored = localStorage.getItem('deletedProjects');
    if (stored) {
      localStorage.removeItem('deletedProjects');
      console.log('[useProjectManagement] Cleaned up legacy soft-delete tracking');
    }
  }, [isApi]);

  // Clean up customProjects that don't exist in sourceProjects
  // This removes stale mock projects when using real CSV data
  // Use a ref to track if we've already cleaned up to prevent infinite loops
  const cleanupDoneRef = useRef(false);

  useEffect(() => {
    if (isApi) return;
    if (sourceProjects.length === 0 || cleanupDoneRef.current) return;

    const sourceProjectCodes = new Set(sourceProjects.map(p => p.projectCode));

    // Read latest customProjects from localStorage (don't rely on state which may be stale)
    const storedCustomProjects = (() => {
      try {
        const stored = localStorage.getItem('customProjects');
        if (!stored) return [];
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed.filter((p): p is Project => p !== null && p !== undefined && !!p.projectCode) : [];
      } catch (e) {
        return [];
      }
    })();

    const cleanedCustomProjects = storedCustomProjects.filter(p => {
      // Keep only projects that:
      // 1. Exist in the source (CSV), OR
      // 2. Start with 'NEW_' prefix (user-created new projects)
      const isSourceProject = sourceProjectCodes.has(p.projectCode);
      const isNewProject = p.projectCode.startsWith('NEW_');
      return isSourceProject || isNewProject;
    });

    // If we filtered anything out, update both state and localStorage
    if (cleanedCustomProjects.length !== storedCustomProjects.length) {
      persistCustomProjects(cleanedCustomProjects);
      console.log(
        `[useProjectManagement] Cleaned up ${storedCustomProjects.length - cleanedCustomProjects.length} stale customProjects. ` +
        `Source has ${sourceProjects.length} projects, customProjects now has ${cleanedCustomProjects.length}`
      );
    }

    cleanupDoneRef.current = true;
  }, [sourceProjects, persistCustomProjects, isApi]);

  useEffect(() => {
    if (isApi) return;
    const handleCustomProjectsUpdate = () => {
      try {
        const stored = localStorage.getItem('customProjects');
        if (!stored) return;
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setCustomProjects(parsed.filter((p): p is Project => p !== null && p !== undefined && !!p.projectCode));
        }
      } catch (error) {
        console.error('[useProjectManagement] Error syncing customProjects from localStorage:', error);
      }
    };

    window.addEventListener('customProjectsUpdated', handleCustomProjectsUpdate);
    return () => window.removeEventListener('customProjectsUpdated', handleCustomProjectsUpdate);
  }, [isApi]);

  // Memoize merged projects so downstream useMemo dependencies work correctly
  // and deleted projects are immediately filtered out
  const mergedProjects = useMemo(() => getMergedProjects(), [getMergedProjects]);

  return {
    projects: mergedProjects,
    addProject,
    updateProject,
    deleteProject,
    updateProjectCode,
    updateProjectDescription,
    updateProjectStatus,
    updateStageStatus,
    updateStageSiteVisitDate,
    refetch,
  };
};
