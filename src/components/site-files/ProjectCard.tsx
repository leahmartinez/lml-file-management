import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderKanban, Calendar, FileText } from "lucide-react";
import { Project } from "@/types/data";

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
}

const ProjectCard = ({ project, onClick }: ProjectCardProps) => {
  const fileCount = project.files?.length || 0;
  const assetCount = project.assets?.length || 0;

  return (
    <Card 
      onClick={onClick} 
      className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/50"
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-primary" />
              {project.description || `Project ${project.projectCode}`}
            </CardTitle>
            <p className="text-sm font-medium text-muted-foreground mt-1">
              {project.projectCode}
            </p>
          </div>
          {project.status && (
            <Badge variant="outline" className="text-xs">{project.status}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {project.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {project.description}
          </p>
        )}
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
