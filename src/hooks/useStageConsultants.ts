/**
 * Hook for managing consultant assignments to project stages
 * Only allows assigning consultants from "LML Lift Consultants" category
 * Persists assignments to localStorage
 */

import { useCallback, useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { dataSourceConfig } from '@/config/dataSource';
import { useProjects } from './useData';
import { projectsApi } from '@/services/apiService';

interface StageConsultantAssignments {
  [stageId: string]: string[]; // stageId -> consultant emails[]
}

export const useStageConsultants = () => {
  const { toast } = useToast();
  const { data: projects } = useProjects();
  const isApi = dataSourceConfig.type === 'api';
  const [assignments, setAssignments] = useState<StageConsultantAssignments>({});

  // Load assignments from localStorage on mount
  useEffect(() => {
    if (isApi) {
      const nextAssignments: StageConsultantAssignments = {};
      projects.forEach(project => {
        project.stages?.forEach(stage => {
          if (stage.consultantEmails && stage.consultantEmails.length > 0) {
            nextAssignments[stage.id] = stage.consultantEmails;
          }
        });
      });
      setAssignments(nextAssignments);
      return;
    }

    const stored = localStorage.getItem('stageConsultantAssignments');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setAssignments(parsed);
        console.log('[useStageConsultants] Loaded consultant assignments:', Object.keys(parsed).length > 0 ? parsed : 'empty');
      } catch (e) {
        console.error('Error loading stage consultant assignments:', e);
      }
    } else {
      console.log('[useStageConsultants] No consultant assignments found in localStorage');
    }
  }, [isApi, projects]);

  /**
   * Get assigned consultants for a stage
   */
  const getStageConsultants = useCallback((stageId: string): string[] => {
    return assignments[stageId] || [];
  }, [assignments]);

  /**
   * Update consultants assigned to a stage
   */
  const updateStageConsultants = useCallback((stageId: string, consultantEmails: string[]) => {
    if (isApi) {
      const project = projects.find(p => p.stages?.some(stage => stage.id === stageId));
      if (!project) {
        toast({
          title: "Error",
          description: "Unable to locate project for this stage.",
          variant: "destructive",
        });
        return;
      }

      const updatedStages = project.stages.map(stage =>
        stage.id === stageId ? { ...stage, consultantEmails } : stage
      );

      (async () => {
        try {
          await projectsApi.update({ projectCode: project.projectCode, stages: updatedStages });
          setAssignments(prev => ({
            ...prev,
            [stageId]: consultantEmails,
          }));
          toast({
            title: "Success",
            description: `Updated ${consultantEmails.length} consultant(s) for stage`,
          });
        } catch (error: any) {
          toast({
            title: "Error",
            description: error.message || "Failed to update stage consultants",
            variant: "destructive",
          });
        }
      })();
      return;
    }

    setAssignments(prev => {
      const updated = {
        ...prev,
        [stageId]: consultantEmails,
      };
      localStorage.setItem('stageConsultantAssignments', JSON.stringify(updated));
      return updated;
    });

    toast({
      title: "Success",
      description: `Updated ${consultantEmails.length} consultant(s) for stage`,
    });
  }, [toast, isApi, projects]);

  /**
   * Add a consultant to a stage
   */
  const addStageConsultant = useCallback((stageId: string, consultantEmail: string) => {
    const current = assignments[stageId] || [];
    if (!current.includes(consultantEmail)) {
      const updated = [...current, consultantEmail];
      updateStageConsultants(stageId, updated);
    }
  }, [assignments, updateStageConsultants]);

  /**
   * Remove a consultant from a stage
   */
  const removeStageConsultant = useCallback((stageId: string, consultantEmail: string) => {
    const current = assignments[stageId] || [];
    const updated = current.filter(email => email !== consultantEmail);
    updateStageConsultants(stageId, updated);
  }, [assignments, updateStageConsultants]);

  /**
   * Assign multiple consultants to a stage at once
   */
  const assignConsultantsToStage = useCallback((stageId: string, consultantEmails: string[]) => {
    updateStageConsultants(stageId, consultantEmails);
  }, [updateStageConsultants]);

  return {
    assignments,
    getStageConsultants,
    updateStageConsultants,
    addStageConsultant,
    removeStageConsultant,
    assignConsultantsToStage,
  };
};
