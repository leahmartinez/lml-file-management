import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { ProjectState } from '@/types/data';

export interface ProposalFilters {
  proposalNumber: string;
  buildingName: string;
  siteName: string;
  address: string;
  suburb: string;
  state: ProjectState[];
  postcode: string;
}

interface FilterPanelProps {
  filters: ProposalFilters;
  onFilterChange: (filters: ProposalFilters) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const STATE_OPTIONS: ProjectState[] = ['VIC', 'NSW', 'South Australia', 'Queensland', 'Western Australia', 'Tasmania', 'Northern Territory', 'ACT'];

// Map full state names to abbreviations for display
const STATE_DISPLAY_MAP: Record<string, string> = {
  'Victoria': 'VIC',
  'VIC': 'VIC',
  'NSW': 'NSW',
  'South Australia': 'SA',
  'Queensland': 'QLD',
  'Western Australia': 'WA',
  'Tasmania': 'TAS',
  'Northern Territory': 'NT',
  'ACT': 'ACT',
};

export const FilterPanel = ({ filters, onFilterChange, isOpen, onToggle }: FilterPanelProps) => {
  // Count active filters
  const activeFilterCount = [
    filters.proposalNumber,
    filters.buildingName,
    filters.siteName,
    filters.address,
    filters.suburb,
    filters.state.length > 0 ? 'state' : '',
    filters.postcode,
  ].filter(Boolean).length;

  const handleClearAll = () => {
    onFilterChange({
      proposalNumber: '',
      buildingName: '',
      siteName: '',
      address: '',
      suburb: '',
      state: [],
      postcode: '',
    });
    onToggle(); // Collapse panel after clearing
  };

  const handleStateToggle = (state: ProjectState) => {
    const newStates = filters.state.includes(state)
      ? filters.state.filter(s => s !== state)
      : [...filters.state, state];
    onFilterChange({ ...filters, state: newStates });
  };

  return (
    <div className="space-y-2">
      {/* Filter Toggle Button */}
      <Button
        variant={activeFilterCount > 0 ? 'default' : 'outline'}
        size="sm"
        onClick={onToggle}
        className="gap-2"
      >
        <Filter className="h-4 w-4" />
        Filters
        {activeFilterCount > 0 && (
          <Badge variant="secondary" className="ml-1 h-5 min-w-5 rounded-full bg-white text-primary">
            {activeFilterCount}
          </Badge>
        )}
        {isOpen ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
      </Button>

      {/* Collapsible Filter Panel */}
      {isOpen && (
        <Card className="border-2 border-primary/20 shadow-sm">
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Filter Header */}
              <div className="flex items-center justify-between pb-2 border-b">
                <h3 className="text-sm font-semibold text-foreground">Filter Proposals</h3>
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    className="h-8 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>

              {/* Filter Fields Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Proposal Number */}
                <div className="space-y-2">
                  <Label htmlFor="filter-proposal-number" className="text-xs font-medium">
                    Proposal No
                  </Label>
                  <Input
                    id="filter-proposal-number"
                    placeholder="Search proposal number..."
                    value={filters.proposalNumber}
                    onChange={(e) => onFilterChange({ ...filters, proposalNumber: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>

                {/* Building Name */}
                <div className="space-y-2">
                  <Label htmlFor="filter-building-name" className="text-xs font-medium">
                    Building Name
                  </Label>
                  <Input
                    id="filter-building-name"
                    placeholder="Search building name..."
                    value={filters.buildingName}
                    onChange={(e) => onFilterChange({ ...filters, buildingName: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>

                {/* Site Name */}
                <div className="space-y-2">
                  <Label htmlFor="filter-site-name" className="text-xs font-medium">
                    Site Name
                  </Label>
                  <Input
                    id="filter-site-name"
                    placeholder="Search site name..."
                    value={filters.siteName}
                    onChange={(e) => onFilterChange({ ...filters, siteName: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="filter-address" className="text-xs font-medium">
                    Address
                  </Label>
                  <Input
                    id="filter-address"
                    placeholder="Search address..."
                    value={filters.address}
                    onChange={(e) => onFilterChange({ ...filters, address: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>

                {/* Suburb */}
                <div className="space-y-2">
                  <Label htmlFor="filter-suburb" className="text-xs font-medium">
                    Suburb
                  </Label>
                  <Input
                    id="filter-suburb"
                    placeholder="Search suburb..."
                    value={filters.suburb}
                    onChange={(e) => onFilterChange({ ...filters, suburb: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>

                {/* Postcode */}
                <div className="space-y-2">
                  <Label htmlFor="filter-postcode" className="text-xs font-medium">
                    Postcode
                  </Label>
                  <Input
                    id="filter-postcode"
                    placeholder="Search postcode..."
                    value={filters.postcode}
                    onChange={(e) => onFilterChange({ ...filters, postcode: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              {/* State Multi-Select */}
              <div className="space-y-2 pt-2">
                <Label className="text-xs font-medium">State</Label>
                <div className="flex flex-wrap gap-2">
                  {STATE_OPTIONS.map((state) => {
                    const isSelected = filters.state.includes(state);
                    const displayName = STATE_DISPLAY_MAP[state] || state;
                    return (
                      <button
                        key={state}
                        type="button"
                        onClick={() => handleStateToggle(state)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-foreground border-border hover:bg-muted'
                        }`}
                      >
                        {displayName}
                      </button>
                    );
                  })}
                </div>
                {filters.state.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {filters.state.length} state{filters.state.length !== 1 ? 's' : ''} selected
                  </p>
                )}
              </div>

              {/* Active Filters Summary */}
              {activeFilterCount > 0 && (
                <div className="pt-3 border-t">
                  <div className="flex flex-wrap gap-2">
                    {filters.proposalNumber && (
                      <Badge variant="secondary" className="gap-1">
                        Proposal: {filters.proposalNumber}
                        <button
                          onClick={() => onFilterChange({ ...filters, proposalNumber: '' })}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                    {filters.buildingName && (
                      <Badge variant="secondary" className="gap-1">
                        Building: {filters.buildingName}
                        <button
                          onClick={() => onFilterChange({ ...filters, buildingName: '' })}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                    {filters.siteName && (
                      <Badge variant="secondary" className="gap-1">
                        Site: {filters.siteName}
                        <button
                          onClick={() => onFilterChange({ ...filters, siteName: '' })}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                    {filters.address && (
                      <Badge variant="secondary" className="gap-1">
                        Address: {filters.address}
                        <button
                          onClick={() => onFilterChange({ ...filters, address: '' })}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                    {filters.suburb && (
                      <Badge variant="secondary" className="gap-1">
                        Suburb: {filters.suburb}
                        <button
                          onClick={() => onFilterChange({ ...filters, suburb: '' })}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                    {filters.postcode && (
                      <Badge variant="secondary" className="gap-1">
                        Postcode: {filters.postcode}
                        <button
                          onClick={() => onFilterChange({ ...filters, postcode: '' })}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                    {filters.state.map((state) => (
                      <Badge key={state} variant="secondary" className="gap-1">
                        State: {STATE_DISPLAY_MAP[state] || state}
                        <button
                          onClick={() => handleStateToggle(state)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
