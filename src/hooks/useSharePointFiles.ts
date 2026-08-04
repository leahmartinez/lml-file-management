/**
 * Hook for managing SharePoint files in a folder
 * Handles file listing, upload, delete, and refresh operations
 */

import { useState, useCallback, useEffect } from 'react';
import { graphService, FileMetadata } from '@/services/graphService';
import { useSharePointAuth } from './useSharePointAuth';

interface UseSharePointFilesOptions {
  folderPath?: string;
  autoFetch?: boolean;
}

export const useSharePointFiles = (options: UseSharePointFilesOptions = {}) => {
  const { autoFetch = true, folderPath } = options;

  // Check if SharePoint is enabled
  const sharePointEnabled = import.meta.env.VITE_ENABLE_SHAREPOINT !== 'false';

  const { isAuthenticated, getAccessToken } = useSharePointAuth();

  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch files from SharePoint
   */
  const fetchFiles = useCallback(
    async (path?: string) => {
      // Skip if SharePoint is disabled
      if (!sharePointEnabled) {
        console.log('SharePoint integration disabled - skipping file fetch');
        return;
      }

      if (!isAuthenticated || !path) return;

      try {
        setIsLoading(true);
        setError(null);

        // Get fresh access token
        await getAccessToken();

        // Fetch files
        const filesList = await graphService.listFiles(path);
        setFiles(filesList);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch files';
        setError(errorMessage);
        console.error('Error fetching files:', errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated, getAccessToken, sharePointEnabled]
  );

  /**
   * Auto-fetch files when path or authentication changes
   */
  useEffect(() => {
    if (autoFetch && folderPath && isAuthenticated) {
      fetchFiles(folderPath);
    }
  }, [folderPath, isAuthenticated, autoFetch, fetchFiles]);

  /**
   * Upload a file
   */
  const uploadFile = useCallback(
    async (fileName: string, fileContent: ArrayBuffer): Promise<FileMetadata | null> => {
      if (!isAuthenticated || !folderPath) {
        setError('Not authenticated or folder not specified');
        return null;
      }

      try {
        setIsLoading(true);
        setError(null);

        const fileMetadata = await graphService.uploadFile(folderPath, fileName, fileContent);

        // Refresh file list
        await fetchFiles(folderPath);

        return fileMetadata;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to upload file';
        setError(errorMessage);
        console.error('Error uploading file:', errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated, folderPath, fetchFiles]
  );

  /**
   * Delete a file
   */
  const deleteFile = useCallback(
    async (itemId: string): Promise<boolean> => {
      if (!isAuthenticated || !folderPath) {
        setError('Not authenticated or folder not specified');
        return false;
      }

      try {
        setIsLoading(true);
        setError(null);

        await graphService.deleteFile(itemId);

        // Refresh file list
        await fetchFiles(folderPath);

        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete file';
        setError(errorMessage);
        console.error('Error deleting file:', errorMessage);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated, folderPath, fetchFiles]
  );

  /**
   * Copy a file to the current folder
   */
  const copyFileHere = useCallback(
    async (sourceItemId: string, newName?: string): Promise<FileMetadata | null> => {
      if (!isAuthenticated || !folderPath) {
        setError('Not authenticated or folder not specified');
        return null;
      }

      try {
        setIsLoading(true);
        setError(null);

        const copiedFile = await graphService.copyFile(sourceItemId, folderPath, newName);

        // Refresh file list
        await fetchFiles(folderPath);

        return copiedFile;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to copy file';
        setError(errorMessage);
        console.error('Error copying file:', errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated, folderPath, fetchFiles]
  );

  /**
   * Create a blank file
   */
  const createBlankFile = useCallback(
    async (fileName: string, fileType: 'docx' | 'xlsx' | 'pptx'): Promise<FileMetadata | null> => {
      if (!isAuthenticated || !folderPath) {
        setError('Not authenticated or folder not specified');
        return null;
      }

      try {
        setIsLoading(true);
        setError(null);

        const newFile = await graphService.createBlankFile(folderPath, fileName, fileType);

        // Refresh file list
        await fetchFiles(folderPath);

        return newFile;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create file';
        setError(errorMessage);
        console.error('Error creating file:', errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated, folderPath, fetchFiles]
  );

  /**
   * Refresh file list
   */
  const refresh = useCallback(async () => {
    if (folderPath) {
      await fetchFiles(folderPath);
    }
  }, [folderPath, fetchFiles]);

  return {
    files,
    isLoading,
    error,
    fetchFiles,
    uploadFile,
    deleteFile,
    copyFileHere,
    createBlankFile,
    refresh,
  };
};
