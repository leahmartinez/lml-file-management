/**
 * Hook for managing unit assignments to projects
 * Persists assignments to localStorage
 */

import { useCallback, useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';

export const useProjectUnits = (projectCode: string) => {
  const { toast } = useToast();
  const [assignedUnitIds, setAssignedUnitIds] = useState<string[]>([]);

  // Load assigned units from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(`projectUnits_${projectCode}`);
    if (stored) {
      try {
        const ids = JSON.parse(stored);
        setAssignedUnitIds(Array.isArray(ids) ? ids : []);
      } catch (e) {
        console.error('Error loading project units:', e);
      }
    }
  }, [projectCode]);

  /**
   * Get assigned unit IDs for a project
   */
  const getAssignedUnitIds = useCallback((): string[] => {
    return assignedUnitIds;
  }, [assignedUnitIds]);

  /**
   * Update assigned units for a project
   */
  const updateAssignedUnits = useCallback((unitIds: string[]) => {
    setAssignedUnitIds(unitIds);
    localStorage.setItem(`projectUnits_${projectCode}`, JSON.stringify(unitIds));

    toast({
      title: "Success",
      description: `Updated ${unitIds.length} unit(s) for project`,
    });
  }, [projectCode, toast]);

  /**
   * Add a unit to a project
   */
  const addUnit = useCallback((unitId: string) => {
    if (!assignedUnitIds.includes(unitId)) {
      const updated = [...assignedUnitIds, unitId];
      updateAssignedUnits(updated);
    }
  }, [assignedUnitIds, updateAssignedUnits]);

  /**
   * Remove a unit from a project
   */
  const removeUnit = useCallback((unitId: string) => {
    const updated = assignedUnitIds.filter((id) => id !== unitId);
    updateAssignedUnits(updated);
  }, [assignedUnitIds, updateAssignedUnits]);

  return {
    assignedUnitIds,
    getAssignedUnitIds,
    updateAssignedUnits,
    addUnit,
    removeUnit,
  };
};
