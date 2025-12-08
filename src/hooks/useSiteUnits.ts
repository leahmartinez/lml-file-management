import { useState, useCallback, useEffect } from 'react';
import { Unit } from '@/types/data';
import { toast } from '@/hooks/use-toast';

/**
 * Hook for managing site units/properties
 * Stores units in localStorage
 */
export const useSiteUnits = (siteName: string) => {
  const [units, setUnits] = useState<Unit[]>(() => {
    if (!siteName) return [];
    const stored = localStorage.getItem(`siteUnits_${siteName}`);
    return stored ? JSON.parse(stored) : [];
  });

  // Refresh units from localStorage when siteName changes
  useEffect(() => {
    if (!siteName) {
      setUnits([]);
      return;
    }
    const stored = localStorage.getItem(`siteUnits_${siteName}`);
    setUnits(stored ? JSON.parse(stored) : []);
  }, [siteName]);

  const addUnit = useCallback((unit: Omit<Unit, 'id' | 'siteName' | 'createdAt'>) => {
    const newUnit: Unit = {
      ...unit,
      id: `unit_${Date.now()}`,
      siteName,
      createdAt: new Date().toISOString(),
    };

    const updated = [...units, newUnit];
    setUnits(updated);
    localStorage.setItem(`siteUnits_${siteName}`, JSON.stringify(updated));

    toast({
      title: "Success",
      description: `Unit "${unit.name}" has been added`,
    });

    return newUnit;
  }, [units, siteName]);

  const updateUnit = useCallback((unitId: string, updates: Partial<Unit>) => {
    const updated = units.map(u =>
      u.id === unitId ? { ...u, ...updates, updatedAt: new Date().toISOString() } : u
    );
    setUnits(updated);
    localStorage.setItem(`siteUnits_${siteName}`, JSON.stringify(updated));

    toast({
      title: "Success",
      description: "Unit has been updated",
    });
  }, [units, siteName]);

  const deleteUnit = useCallback((unitId: string) => {
    const unitToDelete = units.find(u => u.id === unitId);
    const updated = units.filter(u => u.id !== unitId);
    setUnits(updated);
    localStorage.setItem(`siteUnits_${siteName}`, JSON.stringify(updated));

    toast({
      title: "Success",
      description: `Unit "${unitToDelete?.name}" has been deleted`,
    });
  }, [units, siteName]);

  return {
    units,
    addUnit,
    updateUnit,
    deleteUnit,
  };
};
