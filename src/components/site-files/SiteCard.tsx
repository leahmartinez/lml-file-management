import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, FolderKanban } from "lucide-react";
import { Site } from "@/types/data";

interface SiteCardProps {
  site: Site;
  onClick: () => void;
}

const SiteCard = ({ site, onClick }: SiteCardProps) => {
  const projectCount = site.projects?.length || 0;
  const assetCount = site.assets?.length || 0;

  return (
    <Card 
      onClick={onClick} 
      className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/50"
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {site.building}
            </CardTitle>
            {site.address && (
              <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>{site.address}</span>
              </div>
            )}
          </div>
          {site.state && (
            <Badge variant="outline">{site.state}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <FolderKanban className="h-4 w-4" />
            <span>{projectCount} project{projectCount !== 1 ? 's' : ''}</span>
          </div>
          {assetCount > 0 && (
            <div className="text-muted-foreground">
              {assetCount} unit{assetCount !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SiteCard;