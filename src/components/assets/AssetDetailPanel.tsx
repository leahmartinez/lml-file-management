import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Calendar, User, Wrench, AlertCircle, X } from "lucide-react";
import { Asset } from "./AssetTable";

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

interface AssetDetailPanelProps {
  asset: Asset;
  onClose?: () => void;
}

export const AssetDetailPanel = ({ asset, onClose }: AssetDetailPanelProps) => {
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
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold">{asset.nickname || asset.name || `Asset ${asset.id}`}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {asset.building} • {asset.type} • ID: {asset.id}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{asset.contractor}</Badge>
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8"
                aria-label="Close asset details"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Ongoing Activities */}
        <div>
          <h3 className="flex items-center gap-2 text-sm font-medium mb-3">
            <AlertCircle className="h-4 w-4" />
            Ongoing Activities
          </h3>
          {asset.status === "Maintenance" ? (
            <div className="p-3 border rounded-lg bg-warning/5 border-warning/20">
              <p className="text-sm font-medium text-warning">Scheduled Maintenance in Progress</p>
              <p className="text-xs text-muted-foreground mt-1">
                Estimated completion: Today at 4:00 PM
              </p>
            </div>
          ) : asset.status === "Offline" ? (
            <div className="p-3 border rounded-lg bg-destructive/5 border-destructive/20">
              <p className="text-sm font-medium text-destructive">Unit Offline - Repair Required</p>
              <p className="text-xs text-muted-foreground mt-1">
                Technician dispatched - ETA 2 hours
              </p>
            </div>
          ) : (
            <div className="p-3 border rounded-lg bg-accent/5 border-accent/20">
              <p className="text-sm font-medium text-accent">All Systems Operational</p>
              <p className="text-xs text-muted-foreground mt-1">
                Next scheduled maintenance: February 15, 2024
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Service History */}
        <div>
          <h3 className="flex items-center gap-2 text-sm font-medium mb-4">
            <Wrench className="h-4 w-4" />
            Service History
          </h3>
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
        </div>
      </CardContent>
    </Card>
  );
};