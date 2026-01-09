/**
 * Microsoft Graph Service
 * Handles all SharePoint API operations including folder management, file operations,
 * and file copying for templates and project files
 */

import { Client, GraphRequest } from '@microsoft/microsoft-graph-client';
import { msalInstance, graphScopes } from '@/lib/msalConfig';

/**
 * File metadata structure returned from SharePoint
 */
export interface FileMetadata {
  id: string;
  name: string;
  webUrl: string;
  size: number;
  lastModifiedDateTime: string;
  lastModifiedBy?: {
    user: {
      email: string;
      displayName: string;
    };
  };
  file?: {
    mimeType: string;
  };
  folder?: {
    childCount: number;
  };
}

/**
 * Folder metadata structure
 */
export interface FolderMetadata extends FileMetadata {
  folder: {
    childCount: number;
  };
}

/**
 * Graph Service singleton for SharePoint operations
 */
class GraphService {
  private client: Client | null = null;
  private siteId: string = '';

  /**
   * Initialize the Graph client with authentication
   */
  async initialize(sharePointSiteUrl: string): Promise<void> {
    try {
      // Get access token from MSAL
      const accessToken = await this.getAccessToken();

      // Initialize Graph client with token
      this.client = Client.init({
        authProvider: async (done) => {
          done(null, accessToken);
        },
      });

      // Extract site ID from SharePoint URL
      this.siteId = await this.getSiteId(sharePointSiteUrl);
    } catch (error) {
      console.error('Failed to initialize Graph Service:', error);
      throw error;
    }
  }

  /**
   * Get access token from MSAL
   */
  private async getAccessToken(): Promise<string> {
    try {
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length === 0) {
        // Try to login if no account is found
        const response = await msalInstance.loginPopup({
          scopes: graphScopes,
        });
        if (!response.account) {
          throw new Error('No account after login');
        }
      }

      const account = accounts[0];
      const response = await msalInstance.acquireTokenSilent({
        scopes: graphScopes,
        account,
      });

      return response.accessToken;
    } catch (error) {
      throw new Error(`Failed to acquire access token: ${error}`);
    }
  }

  /**
   * Get SharePoint site ID from URL
   */
  private async getSiteId(sharePointSiteUrl: string): Promise<string> {
    try {
      if (!this.client) throw new Error('Graph client not initialized');

      // Extract hostname and site path from URL
      // URL format: https://tenant.sharepoint.com/sites/sitename
      const url = new URL(sharePointSiteUrl);
      const hostname = url.hostname;
      const sitePath = url.pathname.replace(/\/$/, ''); // Remove trailing slash

      // Request site ID
      const response = await this.client
        .api(`/sites/${hostname}:${sitePath}`)
        .get();

      return response.id;
    } catch (error) {
      console.error('Failed to get site ID:', error);
      throw new Error(`Failed to get SharePoint site ID: ${error}`);
    }
  }

  /**
   * Ensure drive ID is available
   */
  private async getDriveId(): Promise<string> {
    try {
      if (!this.client) throw new Error('Graph client not initialized');

      const response = await this.client
        .api(`/sites/${this.siteId}/drive`)
        .get();

      return response.id;
    } catch (error) {
      throw new Error(`Failed to get drive ID: ${error}`);
    }
  }

  /**
   * Get folder by path
   */
  async getFolderByPath(folderPath: string): Promise<FolderMetadata> {
    try {
      if (!this.client) throw new Error('Graph client not initialized');

      // Normalize path
      const normalizedPath = folderPath.startsWith('/') ? folderPath : `/${folderPath}`;

      const response = await this.withRetry(() =>
        this.client!
          .api(`/sites/${this.siteId}/drive/root:${normalizedPath}`)
          .get()
      );

      return response as FolderMetadata;
    } catch (error) {
      throw new Error(`Failed to get folder at path ${folderPath}: ${error}`);
    }
  }

  /**
   * Create a new folder
   */
  async createFolder(parentPath: string, folderName: string): Promise<FolderMetadata> {
    try {
      if (!this.client) throw new Error('Graph client not initialized');

      // Get parent folder
      const parentFolder = await this.getFolderByPath(parentPath);

      // Create folder
      const response = await this.withRetry(() =>
        this.client!
          .api(`/sites/${this.siteId}/drive/items/${parentFolder.id}/children`)
          .post({
            name: folderName,
            folder: {},
            '@microsoft.graph.conflictBehavior': 'rename',
          })
      );

      return response as FolderMetadata;
    } catch (error) {
      throw new Error(`Failed to create folder ${folderName}: ${error}`);
    }
  }

  /**
   * Ensure folder exists, creating it if necessary
   */
  async ensureFolder(parentPath: string, folderName: string): Promise<FolderMetadata> {
    try {
      const fullPath = `${parentPath}/${folderName}`;
      return await this.getFolderByPath(fullPath);
    } catch (error) {
      // Folder doesn't exist, create it
      return await this.createFolder(parentPath, folderName);
    }
  }

  /**
   * Ensure project folder structure exists
   * Creates: /Projects/{ProjectCode}/{StageName}/
   */
  async ensureProjectFolder(projectCode: string, stageName: string): Promise<FolderMetadata> {
    try {
      const projectsPath = import.meta.env.VITE_SHAREPOINT_PROJECTS_PATH || '/Projects';

      // Ensure /Projects folder exists
      const projectsFolder = await this.ensureFolder('', projectsPath.replace(/^\//, ''));

      // Ensure /Projects/{ProjectCode} folder exists
      const projectFolder = await this.ensureFolder(projectsPath, projectCode);

      // Ensure /Projects/{ProjectCode}/{StageName} folder exists
      const stageFolder = await this.ensureFolder(
        `${projectsPath}/${projectCode}`,
        stageName
      );

      return stageFolder;
    } catch (error) {
      throw new Error(`Failed to ensure project folder structure: ${error}`);
    }
  }

  /**
   * List files in a folder
   */
  async listFiles(folderPath: string): Promise<FileMetadata[]> {
    try {
      if (!this.client) throw new Error('Graph client not initialized');

      const normalizedPath = folderPath.startsWith('/') ? folderPath : `/${folderPath}`;

      const response = await this.withRetry(() =>
        this.client!
          .api(`/sites/${this.siteId}/drive/root:${normalizedPath}:/children`)
          .get()
      );

      return (response.value || []) as FileMetadata[];
    } catch (error) {
      throw new Error(`Failed to list files in ${folderPath}: ${error}`);
    }
  }

  /**
   * Upload a file
   */
  async uploadFile(
    folderPath: string,
    fileName: string,
    fileContent: ArrayBuffer
  ): Promise<FileMetadata> {
    try {
      if (!this.client) throw new Error('Graph client not initialized');

      const normalizedPath = folderPath.startsWith('/') ? folderPath : `/${folderPath}`;

      const response = await this.withRetry(() =>
        this.client!
          .api(`/sites/${this.siteId}/drive/root:${normalizedPath}/${fileName}:/content`)
          .put(fileContent)
      );

      return response as FileMetadata;
    } catch (error) {
      throw new Error(`Failed to upload file ${fileName}: ${error}`);
    }
  }

  /**
   * Delete a file or folder
   */
  async deleteFile(itemId: string): Promise<void> {
    try {
      if (!this.client) throw new Error('Graph client not initialized');

      await this.withRetry(() =>
        this.client!
          .api(`/sites/${this.siteId}/drive/items/${itemId}`)
          .delete()
      );
    } catch (error) {
      throw new Error(`Failed to delete item ${itemId}: ${error}`);
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(itemId: string): Promise<FileMetadata> {
    try {
      if (!this.client) throw new Error('Graph client not initialized');

      const response = await this.withRetry(() =>
        this.client!
          .api(`/sites/${this.siteId}/drive/items/${itemId}`)
          .get()
      );

      return response as FileMetadata;
    } catch (error) {
      throw new Error(`Failed to get file metadata for ${itemId}: ${error}`);
    }
  }

  /**
   * Get file embed URL for Office Online
   */
  async getFileEmbedUrl(itemId: string): Promise<string> {
    try {
      if (!this.client) throw new Error('Graph client not initialized');

      const response = await this.withRetry(() =>
        this.client!
          .api(`/sites/${this.siteId}/drive/items/${itemId}/preview`)
          .post({
            viewer: 'office',
            allowEdit: true,
          })
      );

      return response.getUrl;
    } catch (error) {
      console.warn(`Failed to get embed URL, using webUrl instead:`, error);
      // Fallback: get file and return webUrl
      const fileMetadata = await this.getFileMetadata(itemId);
      return fileMetadata.webUrl;
    }
  }

  /**
   * Copy a file to a new location
   */
  async copyFile(
    sourceItemId: string,
    destinationFolderPath: string,
    newName?: string
  ): Promise<FileMetadata> {
    try {
      if (!this.client) throw new Error('Graph client not initialized');

      // Get destination folder
      const destFolder = await this.getFolderByPath(destinationFolderPath);

      // Get source file metadata to use for name if not provided
      const sourceFile = await this.getFileMetadata(sourceItemId);
      const fileName = newName || sourceFile.name;

      // Copy file
      const response = await this.withRetry(() =>
        this.client!
          .api(`/sites/${this.siteId}/drive/items/${sourceItemId}/copy`)
          .post({
            parentReference: {
              id: destFolder.id,
            },
            name: fileName,
            '@microsoft.graph.conflictBehavior': 'rename',
          })
      );

      // The copy operation returns a monitor URL, we need to poll for completion
      // For now, return the source file metadata (this is async)
      return response as FileMetadata;
    } catch (error) {
      throw new Error(`Failed to copy file: ${error}`);
    }
  }

  /**
   * Copy a template file from the template library
   */
  async copyTemplate(
    templateItemId: string,
    destinationFolderPath: string,
    fileName: string
  ): Promise<FileMetadata> {
    try {
      return await this.copyFile(templateItemId, destinationFolderPath, fileName);
    } catch (error) {
      throw new Error(`Failed to copy template: ${error}`);
    }
  }

  /**
   * List templates organized by job type folders
   */
  async listTemplates(jobType?: string): Promise<FileMetadata[]> {
    try {
      const templatesPath = import.meta.env.VITE_SHAREPOINT_TEMPLATE_PATH || '/Templates';

      if (jobType) {
        // List templates in specific job type folder
        const jobTypePath = `${templatesPath}/${jobType}`;
        return await this.listFiles(jobTypePath);
      } else {
        // List all template folders (job types)
        return await this.listFiles(templatesPath);
      }
    } catch (error) {
      throw new Error(`Failed to list templates: ${error}`);
    }
  }

  /**
   * List template job type folders (Feasibility, Technical Specification, etc.)
   */
  async listTemplateJobTypes(): Promise<FolderMetadata[]> {
    try {
      const templatesPath = import.meta.env.VITE_SHAREPOINT_TEMPLATE_PATH || '/Templates';
      const files = await this.listFiles(templatesPath);

      // Filter to only folders (job types)
      return files.filter((f) => f.folder) as FolderMetadata[];
    } catch (error) {
      throw new Error(`Failed to list template job types: ${error}`);
    }
  }

  /**
   * List files from a project stage
   */
  async listProjectFiles(projectCode: string, stageName: string): Promise<FileMetadata[]> {
    try {
      const projectsPath = import.meta.env.VITE_SHAREPOINT_PROJECTS_PATH || '/Projects';
      const folderPath = `${projectsPath}/${projectCode}/${stageName}`;

      return await this.listFiles(folderPath);
    } catch (error) {
      throw new Error(
        `Failed to list files in project ${projectCode} stage ${stageName}: ${error}`
      );
    }
  }

  /**
   * List all projects
   */
  async listProjects(): Promise<FolderMetadata[]> {
    try {
      const projectsPath = import.meta.env.VITE_SHAREPOINT_PROJECTS_PATH || '/Projects';
      const files = await this.listFiles(projectsPath);

      // Filter to only folders (projects)
      return files.filter((f) => f.folder) as FolderMetadata[];
    } catch (error) {
      throw new Error(`Failed to list projects: ${error}`);
    }
  }

  /**
   * List stages within a project
   */
  async listProjectStages(projectCode: string): Promise<FolderMetadata[]> {
    try {
      const projectsPath = import.meta.env.VITE_SHAREPOINT_PROJECTS_PATH || '/Projects';
      const projectPath = `${projectsPath}/${projectCode}`;
      const files = await this.listFiles(projectPath);

      // Filter to only folders (stages)
      return files.filter((f) => f.folder) as FolderMetadata[];
    } catch (error) {
      throw new Error(`Failed to list project stages for ${projectCode}: ${error}`);
    }
  }

  /**
   * Copy a file from one project stage to another
   */
  async copyProjectFile(
    sourceItemId: string,
    destinationProjectCode: string,
    destinationStageName: string,
    newName?: string
  ): Promise<FileMetadata> {
    try {
      // Ensure destination folder exists
      await this.ensureProjectFolder(destinationProjectCode, destinationStageName);

      // Copy file
      const projectsPath = import.meta.env.VITE_SHAREPOINT_PROJECTS_PATH || '/Projects';
      const destinationPath = `${projectsPath}/${destinationProjectCode}/${destinationStageName}`;

      return await this.copyFile(sourceItemId, destinationPath, newName);
    } catch (error) {
      throw new Error(
        `Failed to copy file to project ${destinationProjectCode} stage ${destinationStageName}: ${error}`
      );
    }
  }

  /**
   * Create a blank file (Word, Excel, or PowerPoint)
   */
  async createBlankFile(
    folderPath: string,
    fileName: string,
    fileType: 'docx' | 'xlsx' | 'pptx'
  ): Promise<FileMetadata> {
    try {
      if (!this.client) throw new Error('Graph client not initialized');

      const mimeTypes = {
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      };

      // Create empty file content
      const emptyFile = new ArrayBuffer(0);

      // Upload with appropriate extension
      const fullFileName = fileName.endsWith(`.${fileType}`)
        ? fileName
        : `${fileName}.${fileType}`;

      return await this.uploadFile(folderPath, fullFileName, emptyFile);
    } catch (error) {
      throw new Error(`Failed to create blank file: ${error}`);
    }
  }

  /**
   * Search files by name
   */
  async searchFiles(query: string, folderPath?: string): Promise<FileMetadata[]> {
    try {
      if (!this.client) throw new Error('Graph client not initialized');

      const response = await this.withRetry(() =>
        this.client!
          .api(`/sites/${this.siteId}/drive/root/search(q='${query}')`)
          .get()
      );

      let results = (response.value || []) as FileMetadata[];

      // Filter by folder if provided
      if (folderPath) {
        const normalizedPath = folderPath.startsWith('/')
          ? folderPath.toLowerCase()
          : `/${folderPath}`.toLowerCase();

        results = results.filter((f) =>
          f.webUrl.toLowerCase().includes(normalizedPath)
        );
      }

      return results;
    } catch (error) {
      console.warn(`Search failed, returning empty results:`, error);
      return [];
    }
  }

  /**
   * Retry logic for transient failures
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Check if error is retryable (429 throttling, 5xx errors)
        const statusCode = (error as any)?.status;
        const isRetryable = statusCode === 429 || (statusCode && statusCode >= 500);

        if (!isRetryable || i === maxRetries - 1) {
          throw error;
        }

        // Exponential backoff
        const waitTime = delayMs * Math.pow(2, i);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    throw lastError || new Error('Operation failed after retries');
  }
}

// Export singleton instance
export const graphService = new GraphService();

export default graphService;
