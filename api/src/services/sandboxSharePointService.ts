/**
 * Sandbox SharePoint Service Implementation
 *
 * This service provides a SharePoint-compatible API backed by Azure Blob Storage
 * and Azure Table Storage. It is used during local development when real Microsoft
 * Graph API access is not available.
 *
 * All operations log with [SANDBOX] prefix for visibility.
 * All responses match Microsoft Graph API DriveItem structure exactly.
 */

import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} from '@azure/storage-blob';
import { TableClient, TableEntity } from '@azure/data-tables';
import { v4 as uuidv4 } from 'uuid';
import { ISharePointService } from './ISharePointService';
import { DriveItem, FileMetadata, SandboxDriveItemEntity } from './types/sharepoint';

/**
 * Sandbox SharePoint Service
 *
 * Implements ISharePointService using Azure Storage instead of Graph API
 */
export class SandboxSharePointService implements ISharePointService {
  private readonly driveId: string;
  private readonly containerName = 'sandbox-sharepoint-drive';
  private readonly tableName = 'SandboxDriveItems';
  private blobServiceClient: BlobServiceClient;
  private tableClient: TableClient;
  private storageAccountName: string;
  private storageAccountKey: string;

  constructor() {
    // Validate required environment variables
    const connectionString = process.env.SANDBOX_STORAGE_CONNECTION_STRING;
    const accountName = process.env.SANDBOX_STORAGE_ACCOUNT_NAME;
    const accountKey = process.env.SANDBOX_STORAGE_ACCOUNT_KEY;
    const driveId = process.env.SANDBOX_SP_DRIVE_ID || 'sandbox-drive-001';

    if (!connectionString) {
      throw new Error('[SANDBOX] SANDBOX_STORAGE_CONNECTION_STRING not configured');
    }
    if (!accountName) {
      throw new Error('[SANDBOX] SANDBOX_STORAGE_ACCOUNT_NAME not configured');
    }
    if (!accountKey) {
      throw new Error('[SANDBOX] SANDBOX_STORAGE_ACCOUNT_KEY not configured');
    }

    this.driveId = driveId;
    this.storageAccountName = accountName;
    this.storageAccountKey = accountKey;

    // Initialize blob service client
    this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);

    // Initialize table client with allowInsecureConnection for Azurite support
    this.tableClient = TableClient.fromConnectionString(connectionString, this.tableName, {
      allowInsecureConnection: true,
    });

    console.log(`[SANDBOX] SharePoint service initialized with driveId: ${this.driveId}`);
  }

  /**
   * Create a new folder
   */
  async createFolder(parentId: string | 'root', folderName: string): Promise<DriveItem> {
    console.log(`[SANDBOX] Creating folder: ${folderName} under parent: ${parentId}`);

    // Validate folder name
    if (!folderName || folderName.trim().length === 0) {
      throw new Error('Folder name cannot be empty');
    }

    // Check for invalid characters
    const invalidChars = /[*"\\/:?<>|]/;
    if (invalidChars.test(folderName)) {
      throw new Error('Folder name contains invalid characters: *"\\/:?<>|');
    }

    // Normalize parentId
    const normalizedParentId = parentId === 'root' ? null : parentId;

    // Check for duplicate folder name under parent
    const existingItems = this.tableClient.listEntities<SandboxDriveItemEntity>({
      queryOptions: {
        filter: `PartitionKey eq '${this.driveId}' and parentId eq '${normalizedParentId || 'null'}' and name eq '${folderName}' and type eq 'folder'`,
      },
    });

    for await (const item of existingItems) {
      console.log(`[SANDBOX] Duplicate folder name detected: ${folderName}`);
      const error: any = new Error('A folder with this name already exists');
      error.statusCode = 409;
      throw error;
    }

    // Generate unique ID for the folder
    const itemId = uuidv4();
    const now = new Date().toISOString();

    // Construct web URL (fake URL for sandbox)
    const webUrl = this.constructWebUrl(itemId, folderName);

    // Create entity
    const entity: SandboxDriveItemEntity & TableEntity = {
      partitionKey: this.driveId,
      rowKey: itemId,
      itemId,
      driveId: this.driveId,
      parentId: normalizedParentId,
      name: folderName,
      type: 'folder',
      mimeType: null,
      blobPath: null,
      size: null,
      webUrl,
      createdAt: now,
      updatedAt: now,
      createdBy: 'sandbox-user', // In production, this would come from JWT
    };

    // Insert into Table Storage
    await this.tableClient.createEntity(entity);

    console.log(`[SANDBOX] Folder created successfully: ${itemId}`);

    // Return Graph API-compatible DriveItem
    return this.entityToDriveItem(entity);
  }

  /**
   * Upload a file to a folder
   */
  async uploadFile(
    parentId: string,
    fileName: string,
    buffer: Buffer,
    mimeType: string,
    metadata: FileMetadata
  ): Promise<DriveItem> {
    console.log(`[SANDBOX] Uploading file: ${fileName} to parent: ${parentId}`);

    // Validate inputs
    if (!fileName || fileName.trim().length === 0) {
      throw new Error('File name cannot be empty');
    }

    // Generate unique ID for the file
    const fileId = uuidv4();
    const now = new Date().toISOString();

    // Normalize parentId
    const normalizedParentId = parentId === 'root' ? null : parentId;

    // Construct blob path: {driveId}/{parentId}/{fileId}--{fileName}
    const blobPath = `${this.driveId}/${normalizedParentId || 'root'}/${fileId}--${fileName}`;

    // Upload to Blob Storage
    const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobPath);

    // Set blob metadata
    const blobMetadata = {
      originalName: metadata.originalName || fileName,
      mimeType: mimeType,
      uploadedBy: metadata.uploadedBy,
      workOrderId: metadata.workOrderId || '',
      proposalId: metadata.proposalId || '',
      createdAt: metadata.createdAt || now,
    };

    await blockBlobClient.upload(buffer, buffer.length, {
      blobHTTPHeaders: { blobContentType: mimeType },
      metadata: blobMetadata,
    });

    console.log(`[SANDBOX] File uploaded to blob: ${blobPath}`);

    // Construct web URL
    const webUrl = this.constructWebUrl(fileId, fileName);

    // Create Table Storage entity
    const entity: SandboxDriveItemEntity & TableEntity = {
      partitionKey: this.driveId,
      rowKey: fileId,
      itemId: fileId,
      driveId: this.driveId,
      parentId: normalizedParentId,
      name: fileName,
      type: 'file',
      mimeType,
      blobPath,
      size: buffer.length,
      webUrl,
      createdAt: now,
      updatedAt: now,
      createdBy: metadata.uploadedBy,
    };

    // Insert into Table Storage
    await this.tableClient.createEntity(entity);

    console.log(`[SANDBOX] File metadata saved to table: ${fileId}`);

    // Return Graph API-compatible DriveItem
    return this.entityToDriveItem(entity);
  }

  /**
   * List all children of a folder
   */
  async listFolderChildren(folderId: string | 'root'): Promise<DriveItem[]> {
    console.log(`[SANDBOX] Listing children of folder: ${folderId}`);

    // Normalize folderId
    const normalizedFolderId = folderId === 'root' ? null : folderId;

    // Query for all items with matching parentId
    const entities = this.tableClient.listEntities<SandboxDriveItemEntity>({
      queryOptions: {
        filter: `PartitionKey eq '${this.driveId}' and parentId eq '${normalizedFolderId || 'null'}'`,
      },
    });

    const items: DriveItem[] = [];
    for await (const entity of entities) {
      items.push(this.entityToDriveItem(entity));
    }

    // Sort: folders first, then by name alphabetically
    items.sort((a, b) => {
      // Folders before files
      const aIsFolder = !!a.folder;
      const bIsFolder = !!b.folder;

      if (aIsFolder && !bIsFolder) return -1;
      if (!aIsFolder && bIsFolder) return 1;

      // Then alphabetically by name
      return a.name.localeCompare(b.name);
    });

    console.log(`[SANDBOX] Found ${items.length} children`);
    return items;
  }

  /**
   * Get metadata for a specific file or folder
   */
  async getFolderOrFile(itemId: string): Promise<DriveItem> {
    console.log(`[SANDBOX] Getting item: ${itemId}`);

    try {
      const entity = await this.tableClient.getEntity<SandboxDriveItemEntity>(
        this.driveId,
        itemId
      );

      console.log(`[SANDBOX] Item found: ${entity.name} (${entity.type})`);
      return this.entityToDriveItem(entity);
    } catch (error: any) {
      if (error.statusCode === 404) {
        console.log(`[SANDBOX] Item not found: ${itemId}`);
        const notFoundError: any = new Error('Item not found');
        notFoundError.statusCode = 404;
        throw notFoundError;
      }
      throw error;
    }
  }

  /**
   * Get a time-limited download URL for a file
   */
  async getDownloadUrl(itemId: string): Promise<string> {
    console.log(`[SANDBOX] Generating download URL for: ${itemId}`);

    // Get the item metadata
    const item = await this.getFolderOrFile(itemId);

    // Ensure it's a file, not a folder
    if (item.folder) {
      const error: any = new Error('Cannot generate download URL for a folder');
      error.statusCode = 400;
      throw error;
    }

    // Get the blob path from table storage
    const entity = await this.tableClient.getEntity<SandboxDriveItemEntity>(
      this.driveId,
      itemId
    );

    if (!entity.blobPath) {
      throw new Error('Blob path not found for file');
    }

    // Generate SAS token with 15-minute expiry
    const expiresOn = new Date();
    expiresOn.setMinutes(expiresOn.getMinutes() + 15);

    const credential = new StorageSharedKeyCredential(
      this.storageAccountName,
      this.storageAccountKey
    );

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: this.containerName,
        blobName: entity.blobPath,
        permissions: BlobSASPermissions.parse('r'), // Read-only
        expiresOn,
      },
      credential
    ).toString();

    const downloadUrl = `https://${this.storageAccountName}.blob.core.windows.net/${this.containerName}/${entity.blobPath}?${sasToken}`;

    console.log(`[SANDBOX] Download URL generated, expires at: ${expiresOn.toISOString()}`);
    return downloadUrl;
  }

  /**
   * Delete a file or folder (recursive for folders)
   */
  async deleteItem(itemId: string): Promise<void> {
    console.log(`[SANDBOX] Deleting item: ${itemId}`);

    // Get the item to determine type
    const entity = await this.tableClient.getEntity<SandboxDriveItemEntity>(
      this.driveId,
      itemId
    );

    if (entity.type === 'folder') {
      // Recursively delete all children first
      const children = await this.listFolderChildren(itemId);

      console.log(`[SANDBOX] Deleting ${children.length} children of folder: ${entity.name}`);

      for (const child of children) {
        await this.deleteItem(child.id);
      }
    } else if (entity.type === 'file') {
      // Delete the blob
      if (entity.blobPath) {
        const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(entity.blobPath);

        try {
          await blockBlobClient.delete();
          console.log(`[SANDBOX] Blob deleted: ${entity.blobPath}`);
        } catch (error: any) {
          // Blob might not exist, log but continue
          console.warn(`[SANDBOX] Failed to delete blob (might not exist): ${error.message}`);
        }
      }
    }

    // Delete the Table Storage entity
    await this.tableClient.deleteEntity(this.driveId, itemId);

    console.log(`[SANDBOX] Item deleted: ${itemId}`);
  }

  /**
   * Convert Table Storage entity to Graph API DriveItem
   */
  private entityToDriveItem(entity: SandboxDriveItemEntity): DriveItem {
    const driveItem: DriveItem = {
      id: entity.itemId,
      name: entity.name,
      webUrl: entity.webUrl,
      createdDateTime: entity.createdAt,
      lastModifiedDateTime: entity.updatedAt,
      createdBy: {
        user: {
          id: entity.createdBy,
          displayName: entity.createdBy,
        },
      },
      lastModifiedBy: {
        user: {
          id: entity.createdBy,
          displayName: entity.createdBy,
        },
      },
      parentReference: {
        id: entity.parentId || 'root',
        driveId: entity.driveId,
      },
    };

    // Add type-specific properties
    if (entity.type === 'folder') {
      driveItem.folder = {
        childCount: 0, // We don't track this in real-time
      };
    } else {
      driveItem.file = {
        mimeType: entity.mimeType || 'application/octet-stream',
      };
      driveItem.size = entity.size || 0;
    }

    return driveItem;
  }

  /**
   * Construct a fake web URL for sandbox items
   */
  private constructWebUrl(itemId: string, itemName: string): string {
    return `https://sandbox.sharepoint.com/sites/lml-sandbox/drive/items/${itemId}/${encodeURIComponent(itemName)}`;
  }
}
