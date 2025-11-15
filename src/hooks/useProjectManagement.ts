import { useState, useCallback } from 'react';
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
    return stored ? JSON.parse(stored) : [];
  });

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
    const customMap = new Map(customProjects.map(p => [p.projectCode, p]));

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
    customMap.forEach(project => merged.push(project));

    return merged;
  }, [sourceProjects, customProjects]);

  return {
    projects: getMergedProjects(),
    updateProjectCode,
    updateProjectDescription,
    updateProjectStatus,
    updateStageStatus,
    refetch,
  };
};
