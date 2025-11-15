import { ProjectFile } from "@/types/data";
import { Download, Eye, FileText, ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileUploadButton } from "./FileUploadButton";
import { FilePreviewModal } from "./FilePreviewModal";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

interface ProjectFilesSectionProps {
  files: ProjectFile[];
  projectCode: string;
  onFilesChange?: (files: ProjectFile[]) => void;
  canUpload?: boolean;
}

export const ProjectFilesSection = ({ files, projectCode, onFilesChange, canUpload = false }: ProjectFilesSectionProps) => {
  const { toast } = useToast();
  const [fileToDelete, setFileToDelete] = useState<ProjectFile | null>(null);
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleFilesUploaded = (newFiles: ProjectFile[]) => {
    if (onFilesChange) {
      onFilesChange(newFiles);
    }
  };

  const handleDeleteFile = (file: ProjectFile) => {
    setFileToDelete(file);
  };

  const confirmDelete = () => {
    if (!fileToDelete || !onFilesChange) return;

    const updatedFiles = files.filter(f => f.id !== fileToDelete.id);
    onFilesChange(updatedFiles);

    // Revoke object URL if it's a blob URL
    if (fileToDelete.url.startsWith('blob:')) {
      URL.revokeObjectURL(fileToDelete.url);
    }

    toast({
      title: "File deleted",
      description: `${fileToDelete.name} has been removed`,
    });

    setFileToDelete(null);
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return <FileText className="h-4 w-4 text-muted-foreground" />;
  };

  const getFileTypeBadge = (file: ProjectFile) => {
    if (file.source === 'onedrive') {
      return <Badge variant="outline" className="text-xs">OneDrive</Badge>;
    }
    return <Badge variant="outline" className="text-xs">Uploaded</Badge>;
  };

  if (files.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Project Files</CardTitle>
            {canUpload && onFilesChange && (
              <FileUploadButton
                onFilesUploaded={handleFilesUploaded}
                existingFiles={files}
                projectCode={projectCode}
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No files attached to this project</p>
            {canUpload && onFilesChange && (
              <p className="text-sm mt-2">Click "Upload Files" above to add files</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Project Files</CardTitle>
            {canUpload && onFilesChange && (
              <FileUploadButton
                onFilesUploaded={handleFilesUploaded}
                existingFiles={files}
                projectCode={projectCode}
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {files.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date Uploaded</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {files.map((file, index) => {
                    const isPdf = file.name.toLowerCase().endsWith('.pdf');
                    const isExternal = file.url.startsWith('http');
                    
                    return (
                      <TableRow key={file.id || index}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {getFileIcon(file.name)}
                            <span>{file.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getFileTypeBadge(file)}
                        </TableCell>
                        <TableCell>
                          {file.dateUploaded || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {file.fileSize || 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {(isPdf || file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc') || file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setPreviewFile(file);
                                  setIsPreviewOpen(true);
                                }}
                                className="h-8 w-8"
                                aria-label="Preview file"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              className="h-8 w-8"
                            >
                              <a
                                href={file.url}
                                download
                                target={isExternal ? "_blank" : undefined}
                                rel={isExternal ? "noopener noreferrer" : undefined}
                                aria-label="Download file"
                              >
                                {isExternal ? (
                                  <ExternalLink className="h-4 w-4" />
                                ) : (
                                  <Download className="h-4 w-4" />
                                )}
                              </a>
                            </Button>
                            {canUpload && onFilesChange && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteFile(file)}
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                aria-label="Delete file"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No files attached to this project</p>
              {onFilesChange && (
                <p className="text-xs mt-1">Click "Upload Files" to add files</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!fileToDelete} onOpenChange={(open) => !open && setFileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{fileToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* File Preview Modal */}
      <FilePreviewModal
        file={previewFile}
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
      />
    </>
  );
};

