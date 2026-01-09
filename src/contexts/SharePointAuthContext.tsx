/**
 * SharePoint Authentication Context
 * Manages MSAL authentication and provides access tokens for Graph API calls
 */

import React, { createContext, useCallback, useEffect, useState } from 'react';
import { msalInstance, loginRequest, graphScopes } from '@/lib/msalConfig';
import { AccountInfo } from '@azure/msal-browser';

interface SharePointAuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  account: AccountInfo | null;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string>;
}

export const SharePointAuthContext = createContext<SharePointAuthContextType | undefined>(
  undefined
);

interface SharePointAuthProviderProps {
  children: React.ReactNode;
}

export const SharePointAuthProvider: React.FC<SharePointAuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize MSAL and check for existing account
  useEffect(() => {
    const initializeMsal = async () => {
      try {
        await msalInstance.initialize();

        const accounts = msalInstance.getAllAccounts();
        if (accounts.length > 0) {
          const cachedAccount = accounts[0];
          setAccount(cachedAccount);
          setIsAuthenticated(true);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize MSAL';
        console.error('MSAL initialization error:', errorMessage);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    initializeMsal();
  }, []);

  // Handle redirect after login
  useEffect(() => {
    const handleRedirect = async () => {
      try {
        // This handles the redirect from Azure AD login
        const result = await msalInstance.handleRedirectPromise();
        if (result) {
          setAccount(result.account);
          setIsAuthenticated(true);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Redirect handling failed';
        console.error('Redirect handling error:', errorMessage);
        setError(errorMessage);
      }
    };

    handleRedirect();
  }, []);

  const login = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);

      // Use popup login for better UX
      const response = await msalInstance.loginPopup(loginRequest);
      setAccount(response.account);
      setIsAuthenticated(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      console.error('Login error:', errorMessage);
      setError(errorMessage);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);

      await msalInstance.logoutPopup();
      setAccount(null);
      setIsAuthenticated(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Logout failed';
      console.error('Logout error:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getAccessToken = useCallback(async (): Promise<string> => {
    try {
      if (!account) {
        throw new Error('No authenticated account found');
      }

      // Try to acquire token silently first
      const response = await msalInstance.acquireTokenSilent({
        scopes: graphScopes,
        account,
      });

      return response.accessToken;
    } catch (err) {
      // If silent token acquisition fails, use popup
      try {
        const response = await msalInstance.acquireTokenPopup({
          scopes: graphScopes,
        });
        return response.accessToken;
      } catch (popupErr) {
        const errorMessage = popupErr instanceof Error ? popupErr.message : 'Token acquisition failed';
        console.error('Token acquisition error:', errorMessage);
        throw new Error(`Failed to get access token: ${errorMessage}`);
      }
    }
  }, [account]);

  const value: SharePointAuthContextType = {
    isAuthenticated,
    isLoading,
    account,
    error,
    login,
    logout,
    getAccessToken,
  };

  return (
    <SharePointAuthContext.Provider value={value}>
      {children}
    </SharePointAuthContext.Provider>
  );
};
