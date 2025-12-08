/**
 * Hook for managing project stage operations with localStorage persistence
 * Handles stage status updates and file management at the stage level
 */

import { useCallback, useState, useEffect } from 'react';
import { ProjectStage, ProjectStageStatus, ProjectFile } from '@/types/data';
import { useToast } from '@/components/ui/use-toast';

interface StageUpdate {
  status?: ProjectStageStatus;
  description?: string;
  files?: ProjectFile[];
}

export const useStageManagement = (projectCode: string) => {
  const { toast } = useToast();
  const [stageUpdates, setStageUpdates] = useState<Record<string, StageUpdate>>({});

  // Load stage updates from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(`stageUpdates_${projectCode}`);
    if (stored) {
      try {
        setStageUpdates(JSON.parse(stored));
      } catch (e) {
        console.error('Error loading stage updates:', e);
      }
    }
  }, [projectCode]);

  /**
   * Update a stage's status
   */
  const updateStageStatus = useCallback((stageId: string, newStatus: ProjectStageStatus) => {
    setStageUpdates(prev => {
      const updated = {
        ...prev,
        [stageId]: {
          ...prev[stageId],
          status: newStatus,
        }
      };
      localStorage.setItem(`stageUpdates_${projectCode}`, JSON.stringify(updated));
      return updated;
    });

    toast({
      title: "Success",
      description: `Stage status updated to ${newStatus}`,
    });
  }, [projectCode, toast]);

  /**
   * Get the current status of a stage (merged with base data)
   */
  const getStageStatus = useCallback((stage: ProjectStage): ProjectStageStatus => {
    return stageUpdates[stage.id]?.status || stage.status || 'Not Started';
  }, [stageUpdates]);

  /**
   * Get stage files (merged with updates)
   */
  const getStageFiles = useCallback((stage: ProjectStage): ProjectFile[] => {
    return stageUpdates[stage.id]?.files || stage.files || [];
  }, [stageUpdates]);

  /**
   * Update files for a stage
   */
  const updateStageFiles = useCallback((stageId: string, files: ProjectFile[]) => {
    setStageUpdates(prev => {
      const updated = {
        ...prev,
        [stageId]: {
          ...prev[stageId],
          files,
        }
      };
      localStorage.setItem(`stageUpdates_${projectCode}`, JSON.stringify(updated));
      return updated;
    });
  }, [projectCode]);

  /**
   * Get merged stage with updates applied
   */
  const getMergedStage = useCallback((stage: ProjectStage): ProjectStage => {
    const updates = stageUpdates[stage.id];
    if (!updates) return stage;

    return {
      ...stage,
      status: updates.status || stage.status,
      files: updates.files || stage.files,
    };
  }, [stageUpdates]);

  return {
    updateStageStatus,
    getStageStatus,
    getStageFiles,
    updateStageFiles,
    getMergedStage,
    stageUpdates,
  };
};
