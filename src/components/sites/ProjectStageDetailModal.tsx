import { useState } from "react";
import { ProjectStage, ProjectStageStatus, ProjectFile } from "@/types/data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Plus, Trash2, Download } from "lucide-react";

const STAGE_STATUSES: ProjectStageStatus[] = [
  "Not Started",
  "In Progress",
  "Ready for Invoice",
  "Complete",
];

interface ProjectStageDetailModalProps {
  stage: ProjectStage | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (newStatus: ProjectStageStatus) => void;
  onFilesChange?: (files: ProjectFile[]) => void;
  canUpload?: boolean;
}

export const ProjectStageDetailModal = ({
  stage,
  isOpen,
  onClose,
  onStatusChange,
  onFilesChange,
  canUpload = false,
}: ProjectStageDetailModalProps) => {
  const [files, setFiles] = useState<ProjectFile[]>(stage?.files || []);
  const [newFileUrl, setNewFileUrl] = useState("");
  const [newFileName, setNewFileName] = useState("");
  const [isAddingFile, setIsAddingFile] = useState(false);

  // Update files when stage changes
  if (stage && files !== stage.files) {
    setFiles(stage.files || []);
  }

  const handleStatusChange = (newStatus: string) => {
    if (onStatusChange) {
      onStatusChange(newStatus as ProjectStageStatus);
    }
  };

  const handleAddFile = () => {
    if (!newFileName.trim() || !newFileUrl.trim()) return;

    const newFile: ProjectFile = {
      id: `file_${Date.now()}`,
      name: newFileName,
      url: newFileUrl,
      stageId: stage?.id || "",
      projectCode: stage?.projectCode || "",
      dateUploaded: new Date().toISOString(),
      documentType: "external_link",
      uploadedBy: "current-user",
    };

    const updated = [...files, newFile];
    setFiles(updated);
    onFilesChange?.(updated);
    setNewFileName("");
    setNewFileUrl("");
    setIsAddingFile(false);
  };

  const handleDeleteFile = (fileId: string) => {
    const updated = files.filter((f) => f.id !== fileId);
    setFiles(updated);
    onFilesChange?.(updated);
  };

  if (!stage) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-screen overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{stage.name || (stage as any).stage}</DialogTitle>
          <DialogDescription>
            Manage stage details, files, and status
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Section */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Stage Status</Label>
            {onStatusChange ? (
              <Select
                value={stage.status || "Not Started"}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGE_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge variant="outline" className="w-fit">
                {stage.status || "Not Started"}
              </Badge>
            )}
          </div>

          {/* Description Section */}
          {stage.description && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Description</Label>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {stage.description}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Files Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Files</Label>
              {canUpload && !isAddingFile && (
                <Button
                  size="sm"
                  onClick={() => setIsAddingFile(true)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add File
                </Button>
              )}
            </div>

            {isAddingFile && (
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <Label htmlFor="fileName" className="text-sm">
                      File Name *
                    </Label>
                    <Input
                      id="fileName"
                      placeholder="e.g., Technical Specification v1.pdf"
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fileUrl" className="text-sm">
                      File URL or SharePoint Link *
                    </Label>
                    <Input
                      id="fileUrl"
                      placeholder="https://..."
                      value={newFileUrl}
                      onChange={(e) => setNewFileUrl(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={handleAddFile}
                      disabled={!newFileName.trim() || !newFileUrl.trim()}
                    >
                      Save File
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsAddingFile(false);
                        setNewFileName("");
                        setNewFileUrl("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {files.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {files.map((file) => (
                      <TableRow key={file.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span>{file.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {file.documentType}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(file.dateUploaded).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="flex gap-2">
                          {file.url && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (file.url?.startsWith('http')) {
                                  window.open(file.url, '_blank');
                                }
                              }}
                              className="px-2"
                            >
                              <Download className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          )}
                          {canUpload && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteFile(file.id)}
                              className="px-2"
                            >
                              <Trash2 className="h-3 w-3 text-red-600" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">No files added yet</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectStageDetailModal;
