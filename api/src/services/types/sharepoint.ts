/**
 * SharePoint Service Type Definitions
 * Compatible with Microsoft Graph API DriveItem structure
 */

/**
 * File metadata structure compatible with Graph API
 */
export interface FileMetadata {
  originalName: string;
  mimeType: string;
  uploadedBy: string;
  workOrderId?: string;
  proposalId?: string;
  createdAt: string;
}

/**
 * DriveItem structure matching Microsoft Graph API
 * https://learn.microsoft.com/en-us/graph/api/resources/driveitem
 */
export interface DriveItem {
  id: string;
  name: string;
  webUrl: string;
  size?: number;
  createdDateTime: string;
  lastModifiedDateTime: string;
  createdBy?: {
    user: {
      id: string;
      displayName: string;
    };
  };
  lastModifiedBy?: {
    user: {
      id: string;
      displayName: string;
    };
  };
  parentReference?: {
    id: string;
    driveId: string;
    path?: string;
  };
  // Exactly one of these will be present
  file?: {
    mimeType: string;
    hashes?: {
      quickXorHash?: string;
      sha1Hash?: string;
    };
  };
  folder?: {
    childCount: number;
  };
  // Additional Graph API properties for compatibility
  '@microsoft.graph.downloadUrl'?: string;
  cTag?: string;
  eTag?: string;
}

/**
 * Azure Table Storage entity for sandbox drive items
 */
export interface SandboxDriveItemEntity {
  partitionKey: string; // driveId
  rowKey: string; // itemId
  itemId: string;
  driveId: string;
  parentId: string | null; // null for root items
  name: string;
  type: 'folder' | 'file';
  mimeType: string | null; // null for folders
  blobPath: string | null; // null for folders
  size: number | null; // null for folders
  webUrl: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  createdBy: string; // userId
}

/**
 * Response from getDownloadUrl method
 */
export interface DownloadUrlResponse {
  downloadUrl: string;
  expiresAt: string;
}
