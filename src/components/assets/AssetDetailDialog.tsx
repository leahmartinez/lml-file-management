import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Asset } from "./AssetTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, Wrench, FolderKanban, Building, FileText } from "lucide-react";
import { useProjects } from "@/hooks/useData";
import { useMemo } from "react";
import { Project } from "@/types/data";

interface AssetDetailDialogProps {
  asset: Asset | null;
  open: boolean;
  onClose: () => void;
  mode?: 'details' | 'service-history';
}

interface ServiceRecord {
  id: string;
  date: string;
  technician: string;
  description: string;
  type: "Routine" | "Emergency" | "Preventive";
  duration: string;
}

const mockServiceHistory: ServiceRecord[] = [
  {
    id: "SRV-001",
    date: "2024-01-15",
    technician: "John Smith",
    description: "Monthly preventive maintenance completed. All systems functioning normally. Cleaned and lubricated cables, tested emergency systems.",
    type: "Preventive",
    duration: "2.5 hours"
  },
  {
    id: "SRV-002", 
    date: "2024-01-02",
    technician: "Sarah Johnson",
    description: "Emergency repair - Door sensor malfunction resolved. Replaced faulty sensor and recalibrated system.",
    type: "Emergency",
    duration: "1.5 hours"
  },
  {
    id: "SRV-003",
    date: "2023-12-18",
    technician: "Mike Davis",
    description: "Routine inspection and minor adjustments. Updated control panel firmware to latest version.",
    type: "Routine",
    duration: "1 hour"
  }
];

export const AssetDetailDialog = ({ asset, open, onClose, mode = 'details' }: AssetDetailDialogProps) => {
  const { data: allProjects } = useProjects();

  const attachedProjects = useMemo(() => {
    if (!asset || !asset.projectCode) return [];
    return allProjects.filter(project => project.projectCode === asset.projectCode);
  }, [asset, allProjects]);

  if (!asset) return null;

  const getServiceTypeColor = (type: ServiceRecord["type"]) => {
    switch (type) {
      case "Routine":
        return "bg-primary/10 text-primary border-primary/20";
      case "Emergency":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "Preventive":
        return "bg-accent/10 text-accent border-accent/20";
      default:
        return "bg-muted/10 text-muted-foreground border-muted/20";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'service-history' 
              ? `Service History - ${asset.nickname || asset.name || `Asset ${asset.id}`}`
              : `Asset Details - ${asset.nickname || asset.name || `Asset ${asset.id}`}`
            }
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          {mode === 'service-history' ? (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {mockServiceHistory.map((record) => (
                    <div key={record.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{record.date}</span>
                          <Badge variant="outline" className={getServiceTypeColor(record.type)}>
                            {record.type}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">{record.duration}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{record.technician}</span>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">
                        {record.description}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Asset Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Asset Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Asset ID</p>
                      <p className="text-sm font-medium">{asset.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Type</p>
                      <p className="text-sm font-medium">{asset.type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Building</p>
                      <p className="text-sm font-medium">{asset.building}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Contractor</p>
                      <Badge variant="outline">{asset.contractor}</Badge>
                    </div>
                    {asset.floor && (
                      <div>
                        <p className="text-sm text-muted-foreground">Floor</p>
                        <p className="text-sm font-medium">{asset.floor}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge variant="outline">{asset.status}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Attached Projects */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FolderKanban className="h-5 w-5" />
                    <CardTitle className="text-lg">Attached Projects</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {attachedProjects.length > 0 ? (
                    <div className="space-y-4">
                      {attachedProjects.map((project) => (
                        <div key={project.projectCode} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-base font-semibold">{project.name}</h3>
                                <Badge variant="outline">{project.projectCode}</Badge>
                              </div>
                              {project.description && (
                                <p className="text-sm text-muted-foreground">{project.description}</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                            <div className="flex items-center gap-2 text-sm">
                              <Building className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Site:</span>
                              <span className="font-medium">{project.building}</span>
                            </div>
                            {project.status && (
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">Status:</span>
                                <Badge variant="outline">{project.status}</Badge>
                              </div>
                            )}
                            {project.startDate && (
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Start:</span>
                                <span className="font-medium">{project.startDate}</span>
                              </div>
                            )}
                            {project.endDate && (
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">End:</span>
                                <span className="font-medium">{project.endDate}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FolderKanban className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No projects attached to this asset</p>
                      {asset.projectCode && (
                        <p className="text-xs mt-1">Project Code: {asset.projectCode} (not found in projects data)</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

