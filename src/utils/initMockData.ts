/**
 * Utility to initialize mock project unit assignments
 * Populates localStorage with project-to-unit mappings for demo purposes
 */

import { mockProjectUnitAssignments } from '@/test/mockData';

/**
 * Initialize mock project unit assignments in localStorage
 * Should be called once on app startup
 */
export function initializeMockProjectUnits() {
  try {
    Object.entries(mockProjectUnitAssignments).forEach(([projectCode, unitIds]) => {
      const key = `projectUnits_${projectCode}`;

      // Only initialize if not already set (don't overwrite existing assignments)
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(unitIds));
      }
    });
  } catch (error) {
    console.error('[initMockData] Error initializing mock project units:', error);
  }
}
