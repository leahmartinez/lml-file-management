/**
 * Custom hook for managing dashboard view state
 * Handles view switching with localStorage persistence
 */

import { useState, useCallback, useMemo } from 'react';
import { ViewType, ViewConfig, VIEW_CONFIGS } from '@/components/dashboard/views/viewConfigs';

const STORAGE_KEY = 'lml-dashboard-active-view';

export interface DashboardViewState {
  activeView: ViewType;
  viewConfig: ViewConfig;
  setView: (view: ViewType) => void;
}

/**
 * Hook to manage dashboard view state
 * Persists view preference to localStorage
 */
export function useDashboardView(): DashboardViewState {
  // Initialize from localStorage or default to 'compact'
  const [activeView, setActiveViewState] = useState<ViewType>(() => {
    if (typeof window === 'undefined') return 'compact';

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && stored in VIEW_CONFIGS) {
        return stored as ViewType;
      }
    } catch {
      // localStorage not available
    }

    return 'compact';
  });

  // Get current view configuration
  const viewConfig = useMemo(() => VIEW_CONFIGS[activeView], [activeView]);

  // Update view and persist to localStorage
  const setView = useCallback((view: ViewType) => {
    if (view in VIEW_CONFIGS) {
      setActiveViewState(view);
      try {
        localStorage.setItem(STORAGE_KEY, view);
      } catch {
        // localStorage not available
      }
    }
  }, []);

  return {
    activeView,
    viewConfig,
    setView,
  };
}
