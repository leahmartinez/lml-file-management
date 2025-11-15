import { useState, useEffect, useMemo, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface Asset {
  id: string;
  status: "Active" | "Maintenance" | "Offline" | "Operational" | "Warranty Active";
  contractor: "TKE" | "KONE" | "Schindler" | "Otis";
  building: string;
  nickname: string;
  lastService: string;
  type: "Elevator" | "Escalator" | "Moving Walkway";
}

interface AssetTableProps {
  onAssetSelect: (asset: Asset) => void;
  selectedAssetId?: string;
  data: Asset[];
}

const AssetTableComponent = ({ onAssetSelect, selectedAssetId, data }: AssetTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search term (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Memoize filtered results to avoid recalculation on every render
  const filteredAssets = useMemo(() => {
    if (!debouncedSearch) return data;
    const lowerSearch = debouncedSearch.toLowerCase();
    return data.filter(
      (asset) =>
        (asset.nickname && asset.nickname.toLowerCase().includes(lowerSearch)) ||
        (asset.building && asset.building.toLowerCase().includes(lowerSearch)) ||
        (asset.contractor && asset.contractor.toLowerCase().includes(lowerSearch))
    );
  }, [data, debouncedSearch]);

  const getStatusColor = (status: Asset["status"]) => {
    switch (status) {
      case "Active":
      case "Operational":
      case "Warranty Active":
        return "status-active";
      case "Maintenance":
        return "bg-warning/10 text-warning border-warning/20";
      case "Offline":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted/10 text-muted-foreground border-muted/20";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Asset Portfolio</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredAssets.length} asset{filteredAssets.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className={`flex items-center justify-between p-4 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50 ${
                selectedAssetId === asset.id ? "bg-primary/5 border-primary/20" : "border-border"
              }`}
              onClick={() => onAssetSelect(asset)}
            >
              <div className="flex flex-1 items-center space-x-4">
                <div className="w-1/6 flex-shrink-0">
                  <Badge variant="outline" className={getStatusColor(asset.status)}>
                    {asset.status}
                  </Badge>
                </div>
                <div className="w-1/6 flex-shrink-0">
                  <Badge variant="outline">{asset.contractor}</Badge>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{asset.building}</p>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{asset.nickname}</p>
                  <p className="text-xs text-muted-foreground">{asset.type}</p>
                </div>
                <div className="w-1/6 flex-shrink-0">
                  <p className="text-sm text-muted-foreground">{asset.lastService}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Export memoized component to prevent unnecessary re-renders when parent updates
export const AssetTable = memo(AssetTableComponent, (prevProps, nextProps) => {
  // Return true if props are equal (no re-render), false if different (re-render)
  return (
    prevProps.selectedAssetId === nextProps.selectedAssetId &&
    prevProps.data === nextProps.data &&
    prevProps.onAssetSelect === nextProps.onAssetSelect
  );
});