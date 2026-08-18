/**
 * Type definitions for SharePoint Sandbox Storage
 * These types support the sandbox implementation documented in:
 * docs/SCHEMA_SHAREPOINT_SANDBOX.md
 *
 * Used by both frontend and backend to ensure type safety across
 * the sandbox SharePoint adapter service.
 */

import { TableEntity } from '@azure/data-tables';

/**
 * SandboxDriveItem - Table Storage entity representing a file or folder
 * Stored in: SandboxDriveItems table
 * Partition Key: driveId
 * Row Key: itemId (UUID)
 */
export interface SandboxDriveItem extends TableEntity {
  // Partition & Row Keys (Azure Data Tables required fields)
  partitionKey: string; // driveId
  rowKey: string; // itemId (UUID)

  // Core Identity
  itemId: string; // UUID, same as rowKey
  driveId: string; // Drive ID, same as partitionKey
  parentId: string | null; // Parent folder's itemId, null for root items
  name: string; // Display name (filename or folder name)
  type: 'folder' | 'file'; // Item type

  // File-Specific Properties (null for folders)
  mimeType: string | null; // MIME type (e.g., "application/pdf")
  blobPath: string | null; // Full blob path in Azure Blob Storage
  size: number | null; // File size in bytes

  // Graph API Compatibility
  webUrl: string; // Fake URL matching Graph API format

  // Audit Fields (Standard)
  createdAt: string; // ISO 8601 datetime
  updatedAt: string; // ISO 8601 datetime
  createdBy: string; // User email from JWT
}

/**
 * DriveItem - Graph API compatible response shape
 * Returned by sandbox adapter service to match real SharePoint API
 *
 * Reference: https://learn.microsoft.com/en-us/graph/api/resources/driveitem
 */
export interface DriveItem {
  // Core Identity
  id: string; // Same as itemId
  name: string; // Display name
  webUrl: string; // URL for opening in browser (fake for sandbox)

  // Parent Reference
  parentReference?: {
    driveId: string;
    id: string; // Parent folder ID ("root" for root items)
    path?: string; // Folder path (e.g., "/drive/root:/Work Orders")
  };

  // Type Discriminators (exactly one will be present)
  folder?: {
    childCount?: number; // Optional: number of children
  };
  file?: {
    mimeType: string; // e.g., "application/pdf"
    hashes?: {
      quickXorHash?: string; // Optional: file hash
    };
  };

  // Metadata
  size?: number; // File size in bytes (0 for folders)
  createdDateTime: string; // ISO 8601
  lastModifiedDateTime: string; // ISO 8601
  createdBy?: {
    user: {
      email: string;
      displayName?: string;
    };
  };
  lastModifiedBy?: {
    user: {
      email: string;
      displayName?: string;
    };
  };

  // Download URL (files only, NOT stored - generated on demand)
  '@microsoft.graph.downloadUrl'?: string; // SAS URL with 15-minute expiry
}

/**
 * FileMetadata - Metadata stored on blobs in Azure Blob Storage
 * Applied as custom blob metadata during upload
 */
export interface SandboxFileMetadata {
  originalName: string; // Original filename (e.g., "report.pdf")
  mimeType: string; // MIME type (e.g., "application/pdf")
  uploadedBy: string; // User email from JWT
  workOrderId: string; // Parent entity ID (project/proposal)
  createdAt: string; // ISO 8601 datetime
}

/**
 * Sandbox environment configuration
 * Read from environment variables
 */
export interface SandboxConfig {
  mode: boolean; // SANDBOX_MODE env var
  tenantId: string; // SANDBOX_SP_TENANT_ID
  clientId: string; // SANDBOX_SP_CLIENT_ID
  clientSecret: string; // SANDBOX_SP_CLIENT_SECRET
  storageConnectionString: string; // SANDBOX_STORAGE_CONNECTION_STRING
  storageAccountName: string; // SANDBOX_STORAGE_ACCOUNT_NAME
  storageAccountKey: string; // SANDBOX_STORAGE_ACCOUNT_KEY
  driveId: string; // SANDBOX_SP_DRIVE_ID (e.g., "sandbox-drive-001")
  siteId: string; // SANDBOX_SP_SITE_ID (e.g., "sandbox-site-001")
}

/**
 * Create folder request payload
 */
export interface CreateFolderRequest {
  parentId: string; // Parent folder ID or "root"
  folderName: string; // New folder name (1-255 chars)
  workOrderId?: string; // Optional: work order/project association
}

/**
 * Upload file request payload (multipart form)
 */
export interface UploadFileRequest {
  parentId: string; // Parent folder ID
  fileName: string; // File name with extension
  mimeType: string; // MIME type
  workOrderId: string; // Work order/project association
  // file: Buffer (from multipart, not in this interface)
}

/**
 * List folder children response
 */
export interface ListFolderChildrenResponse {
  value: DriveItem[]; // Array of items (folders and files)
  '@odata.nextLink'?: string; // Pagination link (optional)
}

/**
 * Download URL response
 */
export interface DownloadUrlResponse {
  downloadUrl: string; // SAS URL with 15-minute expiry
  expiresAt: string; // ISO 8601 datetime when token expires
}

/**
 * Service interface that both SandboxSharePointService and SharePointService must implement
 * This ensures API compatibility between sandbox and production
 */
export interface ISharePointService {
  /**
   * Create a new folder
   * @param parentId - Parent folder ID or "root"
   * @param folderName - Name of the new folder
   * @returns DriveItem representing the created folder
   * @throws 409 Conflict if folder with same name already exists
   */
  createFolder(parentId: string, folderName: string): Promise<DriveItem>;

  /**
   * Upload a file
   * @param parentId - Parent folder ID
   * @param fileName - File name with extension
   * @param buffer - File content as Buffer
   * @param mimeType - MIME type
   * @param metadata - File metadata
   * @returns DriveItem representing the uploaded file
   */
  uploadFile(
    parentId: string,
    fileName: string,
    buffer: Buffer,
    mimeType: string,
    metadata: SandboxFileMetadata
  ): Promise<DriveItem>;

  /**
   * List all children of a folder
   * @param folderId - Folder ID or "root"
   * @returns Array of DriveItems (folders and files)
   */
  listFolderChildren(folderId: string): Promise<DriveItem[]>;

  /**
   * Get metadata for a specific item (file or folder)
   * @param itemId - Item ID (UUID)
   * @returns DriveItem
   * @throws 404 if item not found
   */
  getItem(itemId: string): Promise<DriveItem>;

  /**
   * Generate a download URL for a file
   * @param itemId - File ID (UUID)
   * @returns SAS URL with 15-minute expiry
   * @throws 404 if file not found
   * @throws 400 if item is a folder (not a file)
   */
  getDownloadUrl(itemId: string): Promise<string>;

  /**
   * Delete an item (file or folder)
   * If item is a folder, recursively deletes all children
   * @param itemId - Item ID (UUID)
   * @throws 404 if item not found
   */
  deleteItem(itemId: string): Promise<void>;
}

/**
 * Helper type for blob path construction
 */
export interface BlobPathComponents {
  driveId: string;
  folderId: string;
  fileId: string;
  originalFileName: string;
}

/**
 * SAS token generation options
 */
export interface SasTokenOptions {
  blobPath: string; // Full blob path
  expiryMinutes?: number; // Default: 15
  permissions?: 'r' | 'rw'; // Default: 'r' (read-only)
}
