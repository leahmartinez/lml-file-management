import { useMemo, memo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useMasterData } from "@/hooks/useMasterData";

interface SiteFilterProps {
  onSiteChange: (site: string) => void;
  selectedSite: string;
}

const SiteFilterComponent = ({ onSiteChange, selectedSite }: SiteFilterProps) => {
  const masterData = useMasterData();

  // Memoize sites transformation to avoid recalculating on every render
  const sites = useMemo(() => {
    const seen = new Set<string>();
    return masterData.reduce((acc, asset) => {
      if (!asset.building || seen.has(asset.building)) return acc;
      seen.add(asset.building);
      acc.push({ value: asset.building, label: asset.building });
      return acc;
    }, [{ value: "all", label: "All Sites" }]);
  }, [masterData]);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">Overview of</label>
      <Select value={selectedSite} onValueChange={onSiteChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a site" />
        </SelectTrigger>
        <SelectContent>
          {sites.map((site) => (
            <SelectItem key={site.value} value={site.value}>
              {site.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

// Export memoized component to prevent unnecessary re-renders
export const SiteFilter = memo(SiteFilterComponent, (prevProps, nextProps) => {
  // Return true if props are equal (no re-render), false if different (re-render)
  return (
    prevProps.selectedSite === nextProps.selectedSite &&
    prevProps.onSiteChange === nextProps.onSiteChange
  );
});