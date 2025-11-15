import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderKanban, Calendar, FileText, Edit2, Check, X } from "lucide-react";
import { Project, ProjectStatus } from "@/types/data";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  onEditCode?: (newCode: string) => void;
  onEditDescription?: (newDescription: string) => void;
  onEditStatus?: (newStatus: ProjectStatus) => void;
}

const PROJECT_STATUSES: ProjectStatus[] = ['Active', 'On Hold', 'Completed', 'Archived'];

const ProjectCard = ({ project, onClick, onEditCode, onEditDescription, onEditStatus }: ProjectCardProps) => {
  const fileCount = project.files?.length || 0;
  const assetCount = project.assets?.length || 0;
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editCodeValue, setEditCodeValue] = useState(project.projectCode);
  const [editDescValue, setEditDescValue] = useState(project.description || "");

  const handleSaveCode = () => {
    if (onEditCode && editCodeValue.trim() && editCodeValue !== project.projectCode) {
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
    setEditCodeValue(project.projectCode);
    setIsEditingCode(false);
  };

  const handleCancelDescription = () => {
    setEditDescValue(project.description || "");
    setIsEditingDescription(false);
  };

  return (
    <Card
      onClick={onClick}
      className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/50"
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            {/* Project Code - Primary Heading (Large) */}
            {isEditingCode ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editCodeValue}
                  onChange={(e) => setEditCodeValue(e.target.value)}
                  className="font-bold text-lg"
                  onClick={(e) => e.stopPropagation()}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSaveCode();
                  }}
                  className="h-8 w-8 p-0"
                >
                  <Check className="h-4 w-4 text-green-600" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancelCode();
                  }}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                  <FolderKanban className="h-6 w-6 text-primary" />
                  {project.projectCode}
                </CardTitle>
                {onEditCode && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditingCode(true);
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Edit2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
            )}

            {/* Description - Secondary (Smaller) */}
            <div className="space-y-1">
              {isEditingDescription ? (
                <div className="flex items-start gap-2">
                  <textarea
                    value={editDescValue}
                    onChange={(e) => setEditDescValue(e.target.value)}
                    className="flex-1 text-sm p-2 border rounded bg-background"
                    onClick={(e) => e.stopPropagation()}
                    rows={2}
                  />
                  <div className="flex gap-1 pt-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveDescription();
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancelDescription();
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  {project.description ? (
                    <p className="text-sm text-muted-foreground line-clamp-2 flex-1">
                      {project.description}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No description</p>
                  )}
                  {onEditDescription && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditingDescription(true);
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Status Selector */}
          {project.status && onEditStatus ? (
            <Select value={project.status} onValueChange={(value) => {
              onEditStatus(value as ProjectStatus);
            }}>
              <SelectTrigger className="w-32" onClick={(e) => e.stopPropagation()}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent onClick={(e) => e.stopPropagation()}>
                {PROJECT_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : project.status ? (
            <Badge variant="outline" className="text-xs">{project.status}</Badge>
          ) : null}
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            {assetCount > 0 && (
              <div className="flex items-center gap-1">
                <span>{assetCount} unit{assetCount !== 1 ? 's' : ''}</span>
              </div>
            )}
            {fileCount > 0 && (
              <div className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                <span>{fileCount} file{fileCount !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
          {(project.startDate || project.endDate) && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectCard;
