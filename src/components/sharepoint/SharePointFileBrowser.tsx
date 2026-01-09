/**
 * SharePoint File Browser Component
 * Displays files in a folder with options to open, download, or delete
 */

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FileMetadata } from '@/services/graphService';
import {
  Download,
  Trash2,
  FileText,
  FileSpreadsheet,
  FilePresentation,
  File,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { formatFileSize, formatDate } from '@/utils/fileUtils';

interface SharePointFileBrowserProps {
  files: FileMetadata[];
  isLoading?: boolean;
  error?: string | null;
  onOpenFile?: (file: FileMetadata) => void;
  onDeleteFile?: (itemId: string) => Promise<void>;
  onDownloadFile?: (file: FileMetadata) => void;
}

const getFileIcon = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'docx':
    case 'doc':
    case 'txt':
      return <FileText className="h-4 w-4 text-blue-500" />;
    case 'xlsx':
    case 'xls':
    case 'csv':
      return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
    case 'pptx':
    case 'ppt':
      return <FilePresentation className="h-4 w-4 text-orange-500" />;
    case 'pdf':
      return <File className="h-4 w-4 text-red-500" />;
    default:
      return <File className="h-4 w-4 text-gray-500" />;
  }
};

export const SharePointFileBrowser: React.FC<SharePointFileBrowserProps> = ({
  files,
  isLoading = false,
  error,
  onOpenFile,
  onDeleteFile,
  onDownloadFile,
}) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (itemId: string) => {
    if (!onDeleteFile) return;

    if (!confirm('Are you sure you want to delete this file?')) {
      return;
    }

    try {
      setDeletingId(itemId);
      await onDeleteFile(itemId);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = (file: FileMetadata) => {
    if (onDownloadFile) {
      onDownloadFile(file);
    } else {
      // Fallback: open in new tab
      window.open(file.webUrl, '_blank');
    }
  };

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
        <AlertCircle className="h-5 w-5 text-red-600" />
        <div>
          <p className="font-medium text-red-900">Error loading files</p>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
        <p className="text-muted-foreground">Loading files...</p>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No files in this folder</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-8"></TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="hidden sm:table-cell">Size</TableHead>
            <TableHead className="hidden md:table-cell">Modified</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map((file) => (
            <TableRow key={file.id} className="hover:bg-muted/50">
              <TableCell className="w-8">{getFileIcon(file.name)}</TableCell>
              <TableCell>
                <button
                  onClick={() => onOpenFile?.(file)}
                  className="font-medium text-blue-600 hover:underline truncate"
                  title={file.name}
                >
                  {file.name}
                </button>
              </TableCell>
              <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                {formatFileSize(file.size)}
              </TableCell>
              <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                {formatDate(file.lastModifiedDateTime)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(file)}
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {onDeleteFile && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(file.id)}
                      disabled={deletingId === file.id}
                      title="Delete"
                    >
                      {deletingId === file.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-red-600" />
                      )}
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
