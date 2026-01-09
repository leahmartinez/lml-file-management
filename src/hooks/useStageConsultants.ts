/**
 * Hook for managing consultant assignments to project stages
 * Only allows assigning consultants from "LML Lift Consultants" category
 * Persists assignments to localStorage
 */

import { useCallback, useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';

interface StageConsultantAssignments {
  [stageId: string]: string[]; // stageId -> consultant emails[]
}

export const useStageConsultants = () => {
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<StageConsultantAssignments>({});

  // Load assignments from localStorage on mount
  useEffect(() => {
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
  }, []);

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
  }, [toast]);

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
