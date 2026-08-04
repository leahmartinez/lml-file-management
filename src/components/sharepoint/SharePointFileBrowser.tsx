/**
 * SharePoint File Browser Component
 * Displays the contents of one folder - files AND subfolders - with options to
 * navigate into folders, open/download/delete/copy/rename files.
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
  File,
  Folder,
  Loader2,
  AlertCircle,
  Pencil,
  Copy,
} from 'lucide-react';
import { formatFileSize, formatDate } from '@/utils/fileUtils';
import { InlineNameInput } from './InlineNameInput';

interface SharePointFileBrowserProps {
  files: FileMetadata[];
  isLoading?: boolean;
  error?: string | null;
  onOpenFile?: (file: FileMetadata) => void;
  onOpenFolder?: (file: FileMetadata) => void;
  onDeleteFile?: (itemId: string) => Promise<void>;
  onDownloadFile?: (file: FileMetadata) => void;
  onRenameFile?: (itemId: string, newName: string) => Promise<void> | void;
  onCopyFile?: (file: FileMetadata) => void;
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
      return <File className="h-4 w-4 text-orange-500" />;
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
  onOpenFolder,
  onDeleteFile,
  onDownloadFile,
  onRenameFile,
  onCopyFile,
}) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);

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

  const handleRenameConfirm = async (file: FileMetadata, newName: string) => {
    if (!onRenameFile) return;
    await onRenameFile(file.id, newName);
    setRenamingId(null);
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

  // Folders first, files after - matches how every native file explorer sorts a listing.
  const sortedFiles = [...files].sort((a, b) => {
    const aIsFolder = Boolean(a.folder);
    const bIsFolder = Boolean(b.folder);
    if (aIsFolder !== bIsFolder) return aIsFolder ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

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
          {sortedFiles.map((file) => {
            const isFolder = Boolean(file.folder);
            const isRenaming = renamingId === file.id;

            return (
              <TableRow key={file.id} className="hover:bg-muted/50">
                <TableCell className="w-8">
                  {isFolder ? <Folder className="h-4 w-4 text-amber-500" /> : getFileIcon(file.name)}
                </TableCell>
                <TableCell>
                  {isRenaming ? (
                    <InlineNameInput
                      initialValue={file.name}
                      onConfirm={(newName) => handleRenameConfirm(file, newName)}
                      onCancel={() => setRenamingId(null)}
                    />
                  ) : (
                    <button
                      onClick={() => (isFolder ? onOpenFolder?.(file) : onOpenFile?.(file))}
                      className="font-medium text-blue-600 hover:underline truncate text-left"
                      title={file.name}
                    >
                      {file.name}
                    </button>
                  )}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                  {isFolder ? '—' : formatFileSize(file.size)}
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  {formatDate(file.lastModifiedDateTime)}
                </TableCell>
                <TableCell className="text-right">
                  {!isRenaming && (
                    <div className="flex justify-end gap-1">
                      {!isFolder && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(file)}
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      {!isFolder && onCopyFile && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onCopyFile(file)}
                          title="Copy"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                      {onRenameFile && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRenamingId(file.id)}
                          title="Rename"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
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
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
