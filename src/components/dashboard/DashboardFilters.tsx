import { useMemo, useState, useEffect, useRef } from 'react';
import { DashboardRow } from '@/hooks/useDashboardData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, ChevronDown, ChevronUp } from 'lucide-react';

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
  const [isExpanded, setIsExpanded] = useState(false);

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

  const activeFilterCount =
    (filterState.search ? 1 : 0) +
    filterState.invoiceStatuses.size +
    filterState.jobStatuses.size +
    filterState.states.size +
    filterState.projectTypes.size +
    filterState.stageNames.size +
    filterState.stageStatuses.size;

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

  return (
    <div className="space-y-4">
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
          className="h-10"
        />
      </div>

      {/* Filter Toggle Button */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2"
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          More Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            <X className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>

      {/* Expandable Filters */}
      {isExpanded && (
        <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
          {/* Invoice Status Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Invoice Status</label>
            <div className="flex flex-wrap gap-2">
              {INVOICE_STATUSES.map((status) => (
                <Badge
                  key={status}
                  variant={filterState.invoiceStatuses.has(status) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() =>
                    setFilterState((prev) => ({
                      ...prev,
                      invoiceStatuses: toggleFilter(prev.invoiceStatuses, status),
                    }))
                  }
                >
                  {status}
                </Badge>
              ))}
            </div>
          </div>

          {/* Job Status Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Job Status</label>
            <div className="flex flex-wrap gap-2">
              {JOB_STATUSES.map((status) => (
                <Badge
                  key={status}
                  variant={filterState.jobStatuses.has(status) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() =>
                    setFilterState((prev) => ({
                      ...prev,
                      jobStatuses: toggleFilter(prev.jobStatuses, status),
                    }))
                  }
                >
                  {status}
                </Badge>
              ))}
            </div>
          </div>

          {/* State Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">State</label>
            <div className="flex flex-wrap gap-2">
              {STATES.map((state) => (
                <Badge
                  key={state}
                  variant={filterState.states.has(state) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() =>
                    setFilterState((prev) => ({
                      ...prev,
                      states: toggleFilter(prev.states, state),
                    }))
                  }
                >
                  {state}
                </Badge>
              ))}
            </div>
          </div>

          {/* Project Type Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">JW Summary (Project Type)</label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_TYPES.map((type) => (
                <Badge
                  key={type}
                  variant={filterState.projectTypes.has(type) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() =>
                    setFilterState((prev) => ({
                      ...prev,
                      projectTypes: toggleFilter(prev.projectTypes, type),
                    }))
                  }
                >
                  {type}
                </Badge>
              ))}
            </div>
          </div>

          {/* Stage Name Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Stage Name</label>
            <div className="flex flex-wrap gap-2">
              {STAGE_NAMES.map((name) => (
                <Badge
                  key={name}
                  variant={filterState.stageNames.has(name) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() =>
                    setFilterState((prev) => ({
                      ...prev,
                      stageNames: toggleFilter(prev.stageNames, name),
                    }))
                  }
                >
                  {name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Stage Status Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Stage Status</label>
            <div className="flex flex-wrap gap-2">
              {STAGE_STATUSES.map((status) => (
                <Badge
                  key={status}
                  variant={filterState.stageStatuses.has(status) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() =>
                    setFilterState((prev) => ({
                      ...prev,
                      stageStatuses: toggleFilter(prev.stageStatuses, status),
                    }))
                  }
                >
                  {status}
                </Badge>
              ))}
            </div>
          </div>

          {/* Value Range Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Value Range: ${filterState.valueRange[0].toLocaleString()} - $
              {filterState.valueRange[1].toLocaleString()}
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
                className="flex-1 h-9"
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
                className="flex-1 h-9"
              />
            </div>
          </div>
        </div>
      )}

      {/* Result summary */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredRows.length} of {rows.length} stages
      </div>
    </div>
  );
};
