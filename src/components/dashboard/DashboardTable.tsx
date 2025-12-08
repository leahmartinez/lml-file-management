import { useMemo, useState, useCallback, memo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardRow } from '@/hooks/useDashboardData';
import { ProjectRowGroup } from './ProjectRowGroup';
import { EditStageJWSummaryModal } from './EditStageJWSummaryModal';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { ProjectType } from '@/types/data';

export type SortField =
  | 'projectCode'
  | 'orderDate'
  | 'invoiceStatus'
  | 'jobStatus'
  | 'building'
  | 'state'
  | 'value'
  | 'clientName';

export type SortDirection = 'asc' | 'desc';

interface DashboardTableProps {
  rows: DashboardRow[];
  loading?: boolean;
  onRowCount?: (count: number) => void;
  onSelectionChange?: (selectedRows: DashboardRow[]) => void;
  onEditJWSummary?: (projectCode: string) => void;
}

const DashboardTableComponent = ({
  rows,
  loading = false,
  onRowCount,
  onSelectionChange,
  onEditJWSummary,
}: DashboardTableProps) => {
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<SortField>('projectCode');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedStageIds, setSelectedStageIds] = useState<Set<string>>(new Set());
  const [editStageJWSummaryOpen, setEditStageJWSummaryOpen] = useState(false);
  const [selectedStageForJWSummary, setSelectedStageForJWSummary] = useState<any>(null);

  // Sort rows by the specified field, maintaining stage order within each project
  const sortedRows = useMemo(() => {
    const sorted = [...rows].sort((a, b) => {
      let aVal: any = a[sortField as keyof DashboardRow];
      let bVal: any = b[sortField as keyof DashboardRow];

      // Handle null/undefined
      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      // Convert to string for comparison if needed
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [rows, sortField, sortDirection]);

  // Group sorted rows by projectCode while maintaining order
  const groupedProjects = useMemo(() => {
    const groups = new Map<string, DashboardRow[]>();
    sortedRows.forEach((row) => {
      if (!groups.has(row.projectCode)) {
        groups.set(row.projectCode, []);
      }
      groups.get(row.projectCode)!.push(row);
    });
    return Array.from(groups.entries());
  }, [sortedRows]);

  // Notify parent of row count (stage count, not project count)
  useMemo(() => {
    onRowCount?.(sortedRows.length);
  }, [sortedRows.length, onRowCount]);

  // Handle sort click
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Handle selection change from ProjectRowGroup
  const handleSelectionChange = useCallback((stageIds: string[]) => {
    setSelectedStageIds(new Set(stageIds));
  }, []);

  // Compute selected rows from selectedStageIds - memoized for efficiency
  const selectedRowsArray = useMemo(() => {
    if (selectedStageIds.size === 0) return [];
    return sortedRows.filter((row) => selectedStageIds.has(row.stageId));
  }, [selectedStageIds, sortedRows]);

  // Notify parent when selection changes - separate effect to avoid callback churn
  useEffect(() => {
    onSelectionChange?.(selectedRowsArray);
  }, [selectedRowsArray, onSelectionChange]);

  // Handle select all - select all stages in all projects
  const handleSelectAll = () => {
    if (selectedStageIds.size === sortedRows.length) {
      setSelectedStageIds(new Set());
      onSelectionChange?.([]);
    } else {
      const allStageIds = new Set(sortedRows.map((row) => row.stageId));
      setSelectedStageIds(allStageIds);
      onSelectionChange?.(sortedRows);
    }
  };

  // Handle stage JW Summary editing
  const handleEditStageJWSummary = useCallback((stage: any) => {
    setSelectedStageForJWSummary(stage);
    setEditStageJWSummaryOpen(true);
  }, []);

  // Handle saving stage JW Summary
  const handleSaveStageJWSummary = useCallback((
    stageId: string,
    projectType: ProjectType,
    customProjectType?: string
  ) => {
    // Find the stage and update it in the project
    const row = sortedRows.find(r => r.stage.id === stageId);
    if (row) {
      const stage = row.stage;
      const project = row.project;

      stage.projectType = projectType;
      stage.customProjectType = customProjectType;

      // Update the project in the backend (mock for now)
      console.log('Updated stage JW Summary:', { stageId, projectType, customProjectType });
    }
    setEditStageJWSummaryOpen(false);
  }, [sortedRows]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <div className="w-4 h-4" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading projects...</div>;
  }

  if (sortedRows.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No projects found</div>;
  }

  return (
    <>
      <div className="border rounded-lg overflow-x-auto">
        <Table
          className="border-collapse w-full"
          style={{
            borderCollapse: 'collapse',
          }}
        >
          <TableHeader>
            <TableRow className="bg-muted/50">
              {/* Expand/Collapse Toggle Header */}
              <TableHead className="w-12 border-b border-r border-border/30" />

              {/* Select All Checkbox */}
              <TableHead className="w-12 border-b border-r border-border/30">
                <input
                  type="checkbox"
                  checked={selectedStageIds.size === sortedRows.length && sortedRows.length > 0}
                  onChange={handleSelectAll}
                  className="rounded"
                  title="Select all stages"
                />
              </TableHead>

              {/* Project Code */}
              <TableHead className="w-24 cursor-pointer border-b border-r border-border/30" onClick={() => handleSort('projectCode')}>
                <div className="flex items-center gap-2">
                  Project Code
                  <SortIcon field="projectCode" />
                </div>
              </TableHead>

              {/* Order Date */}
              <TableHead className="w-28 cursor-pointer border-b border-r border-border/30" onClick={() => handleSort('orderDate')}>
                <div className="flex items-center gap-2">
                  Order Date
                  <SortIcon field="orderDate" />
                </div>
              </TableHead>

              {/* Invoice Status */}
              <TableHead className="w-32 cursor-pointer border-b border-r border-border/30" onClick={() => handleSort('invoiceStatus')}>
                <div className="flex items-center gap-2">
                  Invoice Status
                  <SortIcon field="invoiceStatus" />
                </div>
              </TableHead>

              {/* Job Status */}
              <TableHead className="w-24 cursor-pointer border-b border-r border-border/30" onClick={() => handleSort('jobStatus')}>
                <div className="flex items-center gap-2">
                  Job Status
                  <SortIcon field="jobStatus" />
                </div>
              </TableHead>

              {/* Building */}
              <TableHead className="w-40 cursor-pointer border-b border-r border-border/30" onClick={() => handleSort('building')}>
                <div className="flex items-center gap-2">
                  Building Name
                  <SortIcon field="building" />
                </div>
              </TableHead>

              {/* Address */}
              <TableHead className="border-b border-r border-border/30">Address</TableHead>

              {/* Suburb */}
              <TableHead className="w-24 border-b border-r border-border/30">Suburb</TableHead>

              {/* State */}
              <TableHead className="w-20 cursor-pointer border-b border-r border-border/30" onClick={() => handleSort('state')}>
                <div className="flex items-center gap-2">
                  State
                  <SortIcon field="state" />
                </div>
              </TableHead>

              {/* Postcode */}
              <TableHead className="w-20 border-b border-r border-border/30">Postcode</TableHead>

              {/* JW Summary */}
              <TableHead className="w-28 border-b border-r border-border/30">JW Summary</TableHead>

              {/* Stage Name / Description */}
              <TableHead className="w-32 border-b border-r border-border/30">Stage Name</TableHead>

              {/* Client */}
              <TableHead className="w-32 cursor-pointer border-b border-r border-border/30" onClick={() => handleSort('clientName')}>
                <div className="flex items-center gap-2">
                  Client
                  <SortIcon field="clientName" />
                </div>
              </TableHead>

              {/* Business */}
              <TableHead className="border-b border-r border-border/30">Business</TableHead>

              {/* Stage Price */}
              <TableHead className="w-24 text-right cursor-pointer border-b border-r border-border/30" onClick={() => handleSort('value')}>
                <div className="flex items-center justify-end gap-2">
                  Stage Price
                  <SortIcon field="value" />
                </div>
              </TableHead>

              {/* Action */}
              <TableHead className="w-12 text-center border-b border-border/30">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groupedProjects.map(([projectCode, stages]) => (
              <ProjectRowGroup
                key={projectCode}
                projectCode={projectCode}
                stages={stages}
                selectedRows={selectedStageIds}
                onSelectionChange={handleSelectionChange}
                onViewProject={(row) => {
                  // Navigate to Sites page with the project pre-selected
                  navigate(`/sites?building=${encodeURIComponent(row.project.building)}&projectCode=${row.project.projectCode}`);
                }}
                onEditJWSummary={onEditJWSummary}
                onEditStageJWSummary={handleEditStageJWSummary}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      <EditStageJWSummaryModal
        stage={selectedStageForJWSummary}
        projectType={selectedStageForJWSummary?.project?.projectType}
        isOpen={editStageJWSummaryOpen}
        onClose={() => {
          setEditStageJWSummaryOpen(false);
          setSelectedStageForJWSummary(null);
        }}
        onSave={handleSaveStageJWSummary}
      />
    </>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const DashboardTable = memo(DashboardTableComponent);
