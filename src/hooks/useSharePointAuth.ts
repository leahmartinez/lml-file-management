/**
 * Hook to access SharePoint authentication context
 * Provides convenient access to MSAL authentication methods and state
 */

import { useContext } from 'react';
import { SharePointAuthContext } from '@/contexts/SharePointAuthContext';

/**
 * Custom hook to use SharePoint authentication context
 * @throws Error if used outside of SharePointAuthProvider
 * @returns SharePointAuthContext with authentication state and methods
 */
export const useSharePointAuth = () => {
  const context = useContext(SharePointAuthContext);

  if (!context) {
    throw new Error('useSharePointAuth must be used within a SharePointAuthProvider');
  }

  return context;
};
