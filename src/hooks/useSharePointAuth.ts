/**
 * Hook to access SharePoint authentication context
 * Provides convenient access to MSAL authentication methods and state
 */

import { useContext } from 'react';
import { SharePointAuthContext } from '@/contexts/SharePointAuthContext';

/**
 * Custom hook to use SharePoint authentication context
 * @throws Error if used outside of SharePointAuthProvider (unless SharePoint is disabled)
 * @returns SharePointAuthContext with authentication state and methods
 */
export const useSharePointAuth = () => {
  // Check if SharePoint is enabled
  const sharePointEnabled = import.meta.env.VITE_ENABLE_SHAREPOINT !== 'false';

  const context = useContext(SharePointAuthContext);

  // If SharePoint is disabled, return a no-op context
  if (!sharePointEnabled) {
    return {
      isAuthenticated: false,
      user: null,
      login: async () => {},
      logout: async () => {},
      getAccessToken: async () => '',
      error: null,
      isLoading: false,
    };
  }

  if (!context) {
    throw new Error('useSharePointAuth must be used within a SharePointAuthProvider');
  }

  return context;
};
