import { useMemo, useState, useEffect, useRef } from 'react';
import { DashboardRow } from '@/hooks/useDashboardData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { X, ChevronDown } from 'lucide-react';

interface FilterState {
  search: string;
  invoiceStatuses: Set<string>;
  jobStatuses: Set<string>;
  states: Set<string>;
  projectTypes: Set<string>;
  stageNames: Set<string>;
  stageStatuses: Set<string>;
  valueRange: [number, number];
}

interface DashboardFiltersProps {
  rows: DashboardRow[];
  onFilterChange: (filteredRows: DashboardRow[]) => void;
}

const INVOICE_STATUSES = ['Not Ready', 'Ready for Invoice', 'Invoiced'];
const JOB_STATUSES = ['Active', 'On Hold', 'Completed', 'Archived'];
const STATES = ['Victoria', 'NSW', 'South Australia', 'Queensland'];
const PROJECT_TYPES = ['Upgrade', 'MACA', 'CMA', 'Desktop Review', 'Other'];
const STAGE_NAMES = ['Feasibility', 'Technical Specification', 'Tender', 'Contract Draft', 'Project Management'];
const STAGE_STATUSES = ['Not Started', 'In Progress', 'Ready for Invoice', 'Complete'];

export const DashboardFilters = ({ rows, onFilterChange }: DashboardFiltersProps) => {
  const [filterState, setFilterState] = useState<FilterState>({
    search: '',
    invoiceStatuses: new Set(),
    jobStatuses: new Set(),
    states: new Set(),
    projectTypes: new Set(),
    stageNames: new Set(),
    stageStatuses: new Set(),
    valueRange: [0, 100000],
  });

  // Calculate value range from data
  const [minValue, maxValue] = useMemo(() => {
    const values = rows.map((r) => r.value || 0).filter((v) => v > 0);
    if (values.length === 0) return [0, 100000];
    return [Math.min(...values), Math.max(...values)];
  }, [rows]);

  // Apply filters
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      // Search filter
      if (filterState.search && !row.searchableText.includes(filterState.search.toLowerCase())) {
        return false;
      }

      // Invoice status filter
      if (filterState.invoiceStatuses.size > 0 && row.invoiceStatus) {
        if (!filterState.invoiceStatuses.has(row.invoiceStatus)) {
          return false;
        }
      }

      // Job status filter
      if (filterState.jobStatuses.size > 0) {
        if (!filterState.jobStatuses.has(row.jobStatus)) {
          return false;
        }
      }

      // State filter
      if (filterState.states.size > 0) {
        if (!filterState.states.has(row.state)) {
          return false;
        }
      }

      // Project type filter
      if (filterState.projectTypes.size > 0) {
        const projectType = row.project.customProjectType || row.project.projectType;
        if (!filterState.projectTypes.has(projectType || '')) {
          return false;
        }
      }

      // Stage name filter
      if (filterState.stageNames.size > 0) {
        if (!filterState.stageNames.has(row.stageName)) {
          return false;
        }
      }

      // Stage status filter
      if (filterState.stageStatuses.size > 0) {
        if (!filterState.stageStatuses.has(row.stageStatus)) {
          return false;
        }
      }

      // Value range filter (stage price)
      if (row.value) {
        if (row.value < filterState.valueRange[0] || row.value > filterState.valueRange[1]) {
          return false;
        }
      }

      return true;
    });
  }, [rows, filterState]);

  // Notify parent of filtered results - only when filtered rows actually change
  const previousFilteredRowsRef = useRef<DashboardRow[]>([]);
  useEffect(() => {
    // Only call callback if the filtered results actually changed (by comparing array length and content)
    if (
      filteredRows.length !== previousFilteredRowsRef.current.length ||
      filteredRows.some(
        (row, idx) => row.projectCode !== previousFilteredRowsRef.current[idx]?.projectCode
      )
    ) {
      previousFilteredRowsRef.current = filteredRows;
      onFilterChange(filteredRows);
    }
  }, [filteredRows, onFilterChange]);

  // Toggle filter in set
  const toggleFilter = (set: Set<string>, value: string) => {
    const newSet = new Set(set);
    if (newSet.has(value)) {
      newSet.delete(value);
    } else {
      newSet.add(value);
    }
    return newSet;
  };

  // Check if any filters are active
  const hasActiveFilters =
    filterState.search ||
    filterState.invoiceStatuses.size > 0 ||
    filterState.jobStatuses.size > 0 ||
    filterState.states.size > 0 ||
    filterState.projectTypes.size > 0 ||
    filterState.stageNames.size > 0 ||
    filterState.stageStatuses.size > 0 ||
    filterState.valueRange[0] > 0 ||
    filterState.valueRange[1] < maxValue;

  // Clear all filters
  const handleClearFilters = () => {
    setFilterState({
      search: '',
      invoiceStatuses: new Set(),
      jobStatuses: new Set(),
      states: new Set(),
      projectTypes: new Set(),
      stageNames: new Set(),
      stageStatuses: new Set(),
      valueRange: [0, maxValue],
    });
  };

  // Helper to get selected count for filter display
  const getFilterLabel = (label: string, count: number) => {
    return count > 0 ? `${label} (${count})` : label;
  };

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div>
        <Input
          placeholder="Search by project code, building, client, stage name, address, postcode..."
          value={filterState.search}
          onChange={(e) =>
            setFilterState((prev) => ({
              ...prev,
              search: e.target.value,
            }))
          }
          className="h-9 text-sm"
        />
      </div>

      {/* Clear All Filters Button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearFilters}
          className="w-full justify-start text-xs h-8"
        >
          <X className="h-3 w-3 mr-2" />
          Clear All Filters
        </Button>
      )}

      {/* Invoice Status Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-between h-8 text-xs"
          >
            <span>{getFilterLabel('Invoice Status', filterState.invoiceStatuses.size)}</span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3">
          <div className="space-y-2">
            {INVOICE_STATUSES.map((status) => (
              <div key={status} className="flex items-center space-x-2">
                <Checkbox
                  id={`invoice-${status}`}
                  checked={filterState.invoiceStatuses.has(status)}
                  onCheckedChange={() =>
                    setFilterState((prev) => ({
                      ...prev,
                      invoiceStatuses: toggleFilter(prev.invoiceStatuses, status),
                    }))
                  }
                />
                <label htmlFor={`invoice-${status}`} className="text-sm cursor-pointer">
                  {status}
                </label>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Job Status Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-between h-8 text-xs"
          >
            <span>{getFilterLabel('Job Status', filterState.jobStatuses.size)}</span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3">
          <div className="space-y-2">
            {JOB_STATUSES.map((status) => (
              <div key={status} className="flex items-center space-x-2">
                <Checkbox
                  id={`job-${status}`}
                  checked={filterState.jobStatuses.has(status)}
                  onCheckedChange={() =>
                    setFilterState((prev) => ({
                      ...prev,
                      jobStatuses: toggleFilter(prev.jobStatuses, status),
                    }))
                  }
                />
                <label htmlFor={`job-${status}`} className="text-sm cursor-pointer">
                  {status}
                </label>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* State Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-between h-8 text-xs"
          >
            <span>{getFilterLabel('State', filterState.states.size)}</span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3">
          <div className="space-y-2">
            {STATES.map((state) => (
              <div key={state} className="flex items-center space-x-2">
                <Checkbox
                  id={`state-${state}`}
                  checked={filterState.states.has(state)}
                  onCheckedChange={() =>
                    setFilterState((prev) => ({
                      ...prev,
                      states: toggleFilter(prev.states, state),
                    }))
                  }
                />
                <label htmlFor={`state-${state}`} className="text-sm cursor-pointer">
                  {state}
                </label>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Project Type Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-between h-8 text-xs"
          >
            <span>{getFilterLabel('JW Summary', filterState.projectTypes.size)}</span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3">
          <div className="space-y-2">
            {PROJECT_TYPES.map((type) => (
              <div key={type} className="flex items-center space-x-2">
                <Checkbox
                  id={`project-${type}`}
                  checked={filterState.projectTypes.has(type)}
                  onCheckedChange={() =>
                    setFilterState((prev) => ({
                      ...prev,
                      projectTypes: toggleFilter(prev.projectTypes, type),
                    }))
                  }
                />
                <label htmlFor={`project-${type}`} className="text-sm cursor-pointer">
                  {type}
                </label>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Stage Name Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-between h-8 text-xs"
          >
            <span>{getFilterLabel('Stage Name', filterState.stageNames.size)}</span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3">
          <div className="space-y-2">
            {STAGE_NAMES.map((name) => (
              <div key={name} className="flex items-center space-x-2">
                <Checkbox
                  id={`stage-name-${name}`}
                  checked={filterState.stageNames.has(name)}
                  onCheckedChange={() =>
                    setFilterState((prev) => ({
                      ...prev,
                      stageNames: toggleFilter(prev.stageNames, name),
                    }))
                  }
                />
                <label htmlFor={`stage-name-${name}`} className="text-sm cursor-pointer">
                  {name}
                </label>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Stage Status Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-between h-8 text-xs"
          >
            <span>{getFilterLabel('Stage Status', filterState.stageStatuses.size)}</span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3">
          <div className="space-y-2">
            {STAGE_STATUSES.map((status) => (
              <div key={status} className="flex items-center space-x-2">
                <Checkbox
                  id={`stage-status-${status}`}
                  checked={filterState.stageStatuses.has(status)}
                  onCheckedChange={() =>
                    setFilterState((prev) => ({
                      ...prev,
                      stageStatuses: toggleFilter(prev.stageStatuses, status),
                    }))
                  }
                />
                <label htmlFor={`stage-status-${status}`} className="text-sm cursor-pointer">
                  {status}
                </label>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Value Range Filter */}
      <div className="space-y-2">
        <label className="text-xs font-medium">
          Value Range: ${filterState.valueRange[0].toLocaleString()} - ${filterState.valueRange[1].toLocaleString()}
        </label>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={filterState.valueRange[0]}
            onChange={(e) =>
              setFilterState((prev) => ({
                ...prev,
                valueRange: [parseInt(e.target.value) || 0, prev.valueRange[1]],
              }))
            }
            min={0}
            max={maxValue}
            className="flex-1 h-8 text-xs"
          />
          <Input
            type="number"
            placeholder="Max"
            value={filterState.valueRange[1]}
            onChange={(e) =>
              setFilterState((prev) => ({
                ...prev,
                valueRange: [prev.valueRange[0], parseInt(e.target.value) || maxValue],
              }))
            }
            min={0}
            max={maxValue}
            className="flex-1 h-8 text-xs"
          />
        </div>
      </div>

      {/* Result summary */}
      <div className="text-xs text-muted-foreground pt-2 border-t">
        {filteredRows.length} of {rows.length} stages
      </div>
    </div>
  );
};
