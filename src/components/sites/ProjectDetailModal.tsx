import { useState, useEffect } from "react";
import { Project, ProjectStatus, POFile } from "@/types/data";
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
import { RichTextEditor } from "@/components/RichTextEditor";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, X, Edit2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProjectDetailModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onEditCode?: (newCode: string) => void;
  onEditDescription?: (newDescription: string) => void;
  onEditStatus?: (newStatus: ProjectStatus) => void;
  onAddPOFile?: (file: POFile) => void;
  onDeletePOFile?: (fileId: string) => void;
  proposalNumber?: string; // Show proposal number if available
  onProposalClick?: () => void; // Handle proposal link click
}

const PROJECT_STATUSES: ProjectStatus[] = [
  "Active",
  "On Hold",
  "Completed",
  "Archived",
];

export const ProjectDetailModal = ({
  project,
  isOpen,
  onClose,
  onEditCode,
  onEditDescription,
  onEditStatus,
  onAddPOFile,
  onDeletePOFile,
  proposalNumber,
  onProposalClick,
}: ProjectDetailModalProps) => {
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editCodeValue, setEditCodeValue] = useState(project?.projectCode || "");
  const [editDescValue, setEditDescValue] = useState(
    project?.description || ""
  );

  const handlePOFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAddPOFile) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newPOFile: POFile = {
          id: `po_${Date.now()}`,
          name: file.name,
          url: event.target?.result as string,
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'current-user', // Should get from auth context in real scenario
          fileSize: `${(file.size / 1024).toFixed(2)} KB`,
        };
        onAddPOFile(newPOFile);
      };
      reader.readAsDataURL(file);
    }
    // Reset input
    e.target.value = '';
  };

  // Update state when project changes
  useEffect(() => {
    if (project && !isEditingCode) {
      setEditCodeValue(project.projectCode);
    }
  }, [project, isEditingCode]);

  useEffect(() => {
    if (project && !isEditingDescription) {
      setEditDescValue(project.description || "");
    }
  }, [project, isEditingDescription]);

  const handleSaveCode = () => {
    if (onEditCode && editCodeValue.trim() && editCodeValue !== project?.projectCode) {
      onEditCode(editCodeValue.trim());
    }
    setIsEditingCode(false);
  };

  const handleSaveDescription = () => {
    if (onEditDescription && editDescValue.trim()) {
      onEditDescription(editDescValue.trim());
    }
    setIsEditingDescription(false);
  };

  const handleCancelCode = () => {
    setEditCodeValue(project?.projectCode || "");
    setIsEditingCode(false);
  };

  const handleCancelDescription = () => {
    setEditDescValue(project?.description || "");
    setIsEditingDescription(false);
  };

  if (!project) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Project Details</DialogTitle>
          <DialogDescription>
            Edit project information below
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Project Code Section */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Project Code</Label>
            {isEditingCode ? (
              <div className="flex gap-2">
                <Input
                  value={editCodeValue}
                  onChange={(e) => setEditCodeValue(e.target.value)}
                  className="flex-1 text-lg font-bold"
                  placeholder="Enter project code..."
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSaveCode}
                  className="px-3"
                >
                  <Check className="h-4 w-4 text-green-600" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelCode}
                  className="px-3"
                >
                  <X className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-2xl font-bold">{project.projectCode}</span>
                {onEditCode && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditingCode(true)}
                    className="px-3"
                  >
                    <Edit2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Description Section */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Description</Label>
            {isEditingDescription ? (
              <div className="space-y-2">
                <RichTextEditor
                  value={editDescValue}
                  onChange={(html, text) => setEditDescValue(html)}
                  placeholder="Enter project description..."
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveDescription}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelDescription}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4 p-3 bg-muted rounded-lg">
                <div className="prose prose-sm max-w-none flex-1 text-foreground">
                  {editDescValue ? (
                    <div dangerouslySetInnerHTML={{ __html: editDescValue }} />
                  ) : (
                    <span className="text-muted-foreground italic">
                      No description added
                    </span>
                  )}
                </div>
                {onEditDescription && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditingDescription(true)}
                    className="px-3"
                  >
                    <Edit2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Status Section */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Status</Label>
            {onEditStatus ? (
              <Select value={project.status} onValueChange={onEditStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge variant="outline">{project.status}</Badge>
            )}
          </div>

          {/* Proposal Link Section */}
          {proposalNumber && (
            <div
              className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors"
              onClick={onProposalClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onProposalClick?.();
                }
              }}
            >
              <Label className="text-base font-semibold">Linked Proposal</Label>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">{proposalNumber}</span>
                <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                  Proposal
                </Badge>
              </div>
              <p className="text-xs text-blue-700">This project was created from a proposal</p>
            </div>
          )}

          {/* Info Section */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <Label className="text-xs text-muted-foreground">
                Files
              </Label>
              <p className="text-lg font-semibold">
                {project.files?.length || 0}
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                Units
              </Label>
              <p className="text-lg font-semibold">
                {project.assets?.length || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-6">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
