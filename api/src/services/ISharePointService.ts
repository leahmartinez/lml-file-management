/**
 * SharePoint Service Interface
 *
 * This interface defines the contract for SharePoint operations.
 * It can be implemented by either:
 * 1. SandboxSharePointService (Azure Blob/Table Storage backed)
 * 2. SharePointService (Real Microsoft Graph API)
 *
 * The implementation is selected at runtime via the service factory
 * based on the SANDBOX_MODE environment variable.
 */

import { DriveItem, FileMetadata } from './types/sharepoint';

export interface ISharePointService {
  /**
   * Create a new folder
   *
   * @param parentId - Parent folder ID or 'root' for root level
   * @param folderName - Name of the folder to create
   * @returns DriveItem representing the created folder
   * @throws 409 if folder with same name already exists under parent
   */
  createFolder(parentId: string | 'root', folderName: string): Promise<DriveItem>;

  /**
   * Upload a file to a folder
   *
   * @param parentId - Parent folder ID or 'root' for root level
   * @param fileName - Name of the file
   * @param buffer - File contents as Buffer
   * @param mimeType - MIME type of the file
   * @param metadata - Additional metadata (uploadedBy, workOrderId, etc.)
   * @returns DriveItem representing the uploaded file
   */
  uploadFile(
    parentId: string,
    fileName: string,
    buffer: Buffer,
    mimeType: string,
    metadata: FileMetadata
  ): Promise<DriveItem>;

  /**
   * List all children (files and folders) of a folder
   *
   * @param folderId - Folder ID or 'root' for root level
   * @returns Array of DriveItems, sorted by type (folders first) then name
   */
  listFolderChildren(folderId: string | 'root'): Promise<DriveItem[]>;

  /**
   * Get metadata for a specific file or folder
   *
   * @param itemId - Item ID
   * @returns DriveItem representing the file or folder
   * @throws 404 if item not found
   */
  getFolderOrFile(itemId: string): Promise<DriveItem>;

  /**
   * Get a time-limited download URL for a file
   *
   * @param itemId - File ID
   * @returns Download URL (expires in 15 minutes)
   * @throws 404 if file not found
   * @throws 400 if item is a folder, not a file
   */
  getDownloadUrl(itemId: string): Promise<string>;

  /**
   * Delete a file or folder
   *
   * If the item is a folder, all children are deleted recursively.
   *
   * @param itemId - Item ID to delete
   * @throws 404 if item not found
   */
  deleteItem(itemId: string): Promise<void>;
}
