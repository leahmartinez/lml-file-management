import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useAvailableSites } from '@/hooks/useAvailableSites';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SiteSelectorProps {
  selectedSites: string[];
  onSitesChange: (sites: string[]) => void;
}

const SiteSelector: React.FC<SiteSelectorProps> = ({ selectedSites, onSitesChange }) => {
  const availableSites = useAvailableSites();

  const handleSiteToggle = (site: string) => {
    if (selectedSites.includes(site)) {
      onSitesChange(selectedSites.filter(s => s !== site));
    } else {
      onSitesChange([...selectedSites, site]);
    }
  };

  const handleSelectAll = () => {
    if (selectedSites.length === availableSites.length) {
      onSitesChange([]);
    } else {
      onSitesChange([...availableSites]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Select Sites</Label>
        <button
          type="button"
          onClick={handleSelectAll}
          className="text-sm text-primary hover:underline"
        >
          {selectedSites.length === availableSites.length ? 'Deselect All' : 'Select All'}
        </button>
      </div>
      <ScrollArea className="h-[200px] rounded-md border p-4">
        <div className="space-y-2">
          {availableSites.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sites available</p>
          ) : (
            availableSites.map((site) => (
              <div key={site} className="flex items-center space-x-2">
                <Checkbox
                  id={`site-${site}`}
                  checked={selectedSites.includes(site)}
                  onCheckedChange={() => handleSiteToggle(site)}
                />
                <Label
                  htmlFor={`site-${site}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {site}
                </Label>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
      {selectedSites.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {selectedSites.length} site{selectedSites.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  );
};

export default SiteSelector;

