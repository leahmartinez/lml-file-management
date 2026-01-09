import { useState, useCallback, useMemo, useEffect } from 'react';
import { Project, ProjectStage, ProjectStageStatus } from '@/types/data';
import { useProjects } from './useData';
import { toast } from '@/hooks/use-toast';

/**
 * Hook for managing projects (edit code, description, status, etc.)
 * Stores custom projects in localStorage and merges with data source
 */
export const useProjectManagement = () => {
  const { data: sourceProjects, refetch } = useProjects();
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

  // Update project code
  const updateProjectCode = useCallback((projectCode: string, newCode: string) => {
    const project = sourceProjects.find(p => p.projectCode === projectCode);
    if (!project) return;

    const updated: Project = {
      ...project,
      projectCode: newCode,
    };

    const existingCustom = customProjects.find(p => p.projectCode === projectCode);
    if (existingCustom) {
      const updated_list = customProjects.map(p =>
        p.projectCode === projectCode ? updated : p
      );
      setCustomProjects(updated_list);
      localStorage.setItem('customProjects', JSON.stringify(updated_list));
    } else {
      const updated_list = [...customProjects, updated];
      setCustomProjects(updated_list);
      localStorage.setItem('customProjects', JSON.stringify(updated_list));
    }

    toast({
      title: "Success",
      description: `Project code updated to ${newCode}`,
    });
  }, [customProjects, sourceProjects]);

  // Update project description
  const updateProjectDescription = useCallback((projectCode: string, newDescription: string) => {
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
      setCustomProjects(updated_list);
      localStorage.setItem('customProjects', JSON.stringify(updated_list));
    } else {
      const updated_list = [...customProjects, updated];
      setCustomProjects(updated_list);
      localStorage.setItem('customProjects', JSON.stringify(updated_list));
    }

    toast({
      title: "Success",
      description: "Project description updated",
    });
  }, [customProjects, sourceProjects]);

  // Update project status
  const updateProjectStatus = useCallback((projectCode: string, newStatus: string) => {
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
      setCustomProjects(updated_list);
      localStorage.setItem('customProjects', JSON.stringify(updated_list));
    } else {
      const updated_list = [...customProjects, updated];
      setCustomProjects(updated_list);
      localStorage.setItem('customProjects', JSON.stringify(updated_list));
    }

    toast({
      title: "Success",
      description: `Project status updated to ${newStatus}`,
    });
  }, [customProjects, sourceProjects]);

  // Update stage status
  const updateStageStatus = useCallback((projectCode: string, stageId: string, newStatus: ProjectStageStatus) => {
    const project = sourceProjects.find(p => p.projectCode === projectCode);
    if (!project) return;

    const updated: Project = {
      ...project,
      stages: project.stages.map(stage =>
        stage.id === stageId ? { ...stage, status: newStatus } : stage
      ),
    };

    const existingCustom = customProjects.find(p => p.projectCode === projectCode);
    if (existingCustom) {
      const updated_list = customProjects.map(p =>
        p.projectCode === projectCode ? updated : p
      );
      setCustomProjects(updated_list);
      localStorage.setItem('customProjects', JSON.stringify(updated_list));
    } else {
      const updated_list = [...customProjects, updated];
      setCustomProjects(updated_list);
      localStorage.setItem('customProjects', JSON.stringify(updated_list));
    }

    toast({
      title: "Success",
      description: `Stage status updated to ${newStatus}`,
    });
  }, [customProjects, sourceProjects]);

  // Get merged projects (source projects with custom overrides)
  const getMergedProjects = useCallback((): Project[] => {
    const merged: Project[] = [];
    // Filter out null/undefined projects before creating map
    const customMap = new Map(
      customProjects
        .filter((p): p is Project => p !== null && p !== undefined && !!p.projectCode)
        .map(p => [p.projectCode, p])
    );

    // Add source projects, using custom overrides if they exist
    sourceProjects.forEach(sourceProject => {
      const customOverride = customMap.get(sourceProject.projectCode);
      if (customOverride) {
        merged.push(customOverride);
        customMap.delete(sourceProject.projectCode);
      } else {
        merged.push(sourceProject);
      }
    });

    // Add remaining custom projects
    customMap.forEach(project => {
      merged.push(project);
    });

    return merged;
  }, [sourceProjects, customProjects]);

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

    const updated = [...customProjects, project];
    setCustomProjects(updated);
    localStorage.setItem('customProjects', JSON.stringify(updated));

    toast({
      title: "Success",
      description: `Project "${project.projectCode}" has been added`,
    });
    return true;
  }, [customProjects, getMergedProjects]);

  // Update entire project (useful for stages, files, etc.)
  const updateProject = useCallback((projectCode: string, updatedProject: Project) => {
    const existingCustom = customProjects.find(p => p.projectCode === projectCode);
    if (existingCustom) {
      const updated_list = customProjects.map(p =>
        p.projectCode === projectCode ? updatedProject : p
      );
      setCustomProjects(updated_list);
      localStorage.setItem('customProjects', JSON.stringify(updated_list));
    } else {
      // Project doesn't exist in custom, add it
      const updated_list = [...customProjects, updatedProject];
      setCustomProjects(updated_list);
      localStorage.setItem('customProjects', JSON.stringify(updated_list));
    }
  }, [customProjects]);

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
      // Call backend DELETE endpoint
      const response = await fetch('/api/projects/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({ projectCode }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete project');
      }

      // Remove from custom projects if it exists there
      const customUpdated = customProjects.filter(p => p.projectCode !== projectCode);
      if (customUpdated.length !== customProjects.length) {
        setCustomProjects(customUpdated);
        localStorage.setItem('customProjects', JSON.stringify(customUpdated));
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
  }, [customProjects, refetch]);

  // Clean up old deletedProjects from localStorage (for backward compatibility)
  // This can be removed in a future version
  useEffect(() => {
    const stored = localStorage.getItem('deletedProjects');
    if (stored) {
      localStorage.removeItem('deletedProjects');
      console.log('[useProjectManagement] Cleaned up legacy soft-delete tracking');
    }
  }, []);

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
    refetch,
  };
};
