/**
 * SharePoint Service Exports
 *
 * Central export point for all SharePoint service components.
 * Always import from this file, never from individual service files.
 */

// Factory (primary export - use this in endpoints)
export { getSharePointService, resetServiceCache } from './sharePointServiceFactory';

// Interface (for type annotations)
export type { ISharePointService } from './ISharePointService';

// Types (for request/response typing)
export type {
  DriveItem,
  FileMetadata,
  SandboxDriveItemEntity,
  DownloadUrlResponse,
} from './types/sharepoint';

// Individual implementations (for testing only - don't use in production code)
export { SandboxSharePointService } from './sandboxSharePointService';
// export { SharePointService } from './sharePointService'; // Not yet implemented
