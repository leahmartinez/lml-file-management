/**
 * SharePoint Service Factory
 *
 * This factory provides the appropriate SharePoint service implementation
 * based on the SANDBOX_MODE environment variable.
 *
 * When SANDBOX_MODE=true:
 *   Returns SandboxSharePointService (Azure Blob/Table Storage backed)
 *
 * When SANDBOX_MODE=false:
 *   Returns SharePointService (Real Microsoft Graph API)
 *
 * All Azure Function endpoints should import from this factory,
 * never directly from either service implementation.
 */

import { ISharePointService } from './ISharePointService';
import { SandboxSharePointService } from './sandboxSharePointService';
// import { SharePointService } from './sharePointService'; // Real Graph API implementation (to be implemented)

let cachedService: ISharePointService | null = null;

/**
 * Get the appropriate SharePoint service implementation
 *
 * The service is cached after first creation for performance.
 * To reset the cache (e.g., in tests), set cachedService to null.
 */
export function getSharePointService(): ISharePointService {
  // Return cached instance if available
  if (cachedService) {
    return cachedService;
  }

  // Determine which implementation to use based on environment
  const isSandboxMode = process.env.SANDBOX_MODE === 'true';

  if (isSandboxMode) {
    console.log('[SANDBOX] Using SandboxSharePointService');
    cachedService = new SandboxSharePointService();
  } else {
    // Production mode - use real Graph API
    console.log('[PRODUCTION] Using real SharePointService (Graph API)');
    // TODO: Implement SharePointService when org credentials are available
    // cachedService = new SharePointService();
    throw new Error(
      'Production SharePoint service not yet implemented. Set SANDBOX_MODE=true for development.'
    );
  }

  return cachedService;
}

/**
 * Reset the cached service instance
 * Useful for testing or when switching modes at runtime
 */
export function resetServiceCache(): void {
  cachedService = null;
}
