/**
 * MSAL Configuration for SharePoint Integration
 * Manages Azure AD authentication for accessing SharePoint resources
 */

import { Configuration, PublicClientApplication } from '@azure/msal-browser';

const clientId = import.meta.env.VITE_AZURE_AD_CLIENT_ID || '';
const tenantId = import.meta.env.VITE_AZURE_AD_TENANT_ID || '';

export const isMsalConfigured = Boolean(clientId && tenantId);

export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: tenantId ? `https://login.microsoftonline.com/${tenantId}` : '',
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return;
        }
        console.log(`[MSAL] ${message}`);
      },
      piiLoggingEnabled: false,
      logLevel: 'Info',
    },
  },
};

/**
 * MSAL instance for handling authentication
 * Used globally for token acquisition and user management
 */
export const msalInstance = new PublicClientApplication(msalConfig);

/**
 * Scopes required for SharePoint file access
 */
export const loginRequest = {
  scopes: ['Files.ReadWrite.All', 'Sites.ReadWrite.All', 'User.Read'],
};

/**
 * Scopes for accessing Graph API endpoints
 */
export const graphScopes = ['Files.ReadWrite.All', 'Sites.ReadWrite.All'];
