/**
 * File utility functions
 */

/**
 * Format file size to human-readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Format ISO date string to readable format
 */
export const formatDate = (isoString: string): string => {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
};

/**
 * Get file extension from filename
 */
export const getFileExtension = (fileName: string): string => {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
};

/**
 * Check if file is an Office document
 */
export const isOfficeDocument = (fileName: string): boolean => {
  const extension = getFileExtension(fileName);
  return ['docx', 'xlsx', 'pptx'].includes(extension);
};

/**
 * Check if file is a PDF
 */
export const isPdf = (fileName: string): boolean => {
  return getFileExtension(fileName) === 'pdf';
};

/**
 * Get MIME type from file extension
 */
export const getMimeType = (fileName: string): string => {
  const extension = getFileExtension(fileName);

  const mimeTypes: Record<string, string> = {
    // Word
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

    // Excel
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

    // PowerPoint
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

    // PDF
    pdf: 'application/pdf',

    // Text
    txt: 'text/plain',

    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
  };

  return mimeTypes[extension] || 'application/octet-stream';
};
