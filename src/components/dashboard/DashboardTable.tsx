import { useMemo, useState, useCallback, memo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardRow } from '@/hooks/useDashboardData';
import { ViewType } from '@/components/dashboard/views/viewConfigs';
import { EditStageJWSummaryModal } from './EditStageJWSummaryModal';
import { DashboardTableHeader, SortField } from '@/components/dashboard/DashboardTableHeader';
import { DashboardTableRow } from '@/components/dashboard/DashboardTableRow';
import { TimelineGroup } from '@/components/dashboard/TimelineGroup';
import { getDateGroupKey, formatDateForGrouping } from '@/components/dashboard/utils/formatters';
import { Table, TableBody } from '@/components/ui/table';
import { ProjectType } from '@/types/data';

export type SortDirection = 'asc' | 'desc';

interface DashboardTableProps {
  rows: DashboardRow[];
  activeView: ViewType;
  loading?: boolean;
  onRowCount?: (count: number) => void;
  onSelectionChange?: (selectedRows: DashboardRow[]) => void;
  onEditJWSummary?: (projectCode: string) => void;
}

const DashboardTableComponent = ({
  rows,
  activeView,
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

  // Sort rows by the specified field
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

  // Group rows based on view type
  const groupedRows = useMemo(() => {
    if (activeView === 'compact') {
      // Group by project code for compact view
      const groups = new Map<string, { projectCode: string; projectLabel: string; rows: DashboardRow[] }>();
      sortedRows.forEach((row) => {
        const projectCode = row.projectCode;
        if (!groups.has(projectCode)) {
          groups.set(projectCode, {
            projectCode,
            projectLabel: `${projectCode} - ${row.building}`,
            rows: [],
          });
        }
        groups.get(projectCode)!.rows.push(row);
      });
      return Array.from(groups.values());
    } else if (activeView === 'timeline') {
      // Group by date
      const groups = new Map<string, { dateKey: string; dateLabel: string; rows: DashboardRow[] }>();
      sortedRows.forEach((row) => {
        const dateKey = getDateGroupKey(row.orderDate);
        if (!groups.has(dateKey)) {
          groups.set(dateKey, {
            dateKey,
            dateLabel: formatDateForGrouping(row.orderDate),
            rows: [],
          });
        }
        groups.get(dateKey)!.rows.push(row);
      });
      return Array.from(groups.values());
    } else if (activeView === 'by-job-status') {
      // Group by job status
      const groups = new Map<string, DashboardRow[]>();
      sortedRows.forEach((row) => {
        const key = row.jobStatus || 'Unknown';
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(row);
      });
      return Array.from(groups.entries()).map(([status, rows]) => ({
        statusKey: status,
        statusLabel: status,
        rows,
      }));
    } else if (activeView === 'by-invoice') {
      // Group by invoice status
      const groups = new Map<string, DashboardRow[]>();
      sortedRows.forEach((row) => {
        const key = row.invoiceStatus || 'Unknown';
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(row);
      });
      return Array.from(groups.entries()).map(([status, rows]) => ({
        statusKey: status,
        statusLabel: status,
        rows,
      }));
    } else if (activeView === 'by-stage-type') {
      // Group by stage name
      const groups = new Map<string, DashboardRow[]>();
      sortedRows.forEach((row) => {
        const key = row.stageName || 'Unknown';
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(row);
      });
      return Array.from(groups.entries()).map(([stageName, rows]) => ({
        stageKey: stageName,
        stageLabel: stageName,
        rows,
      }));
    } else if (activeView === 'by-consultants') {
      // Group by stage consultants
      const groups = new Map<string, DashboardRow[]>();
      sortedRows.forEach((row) => {
        const consultants = row.stageConsultantNames || 'Unassigned';
        if (!groups.has(consultants)) {
          groups.set(consultants, []);
        }
        groups.get(consultants)!.push(row);
      });
      return Array.from(groups.entries()).map(([consultants, rows]) => ({
        consultantKey: consultants,
        consultantLabel: consultants,
        rows,
      }));
    } else {
      // Flat list for compact and detailed views
      return { rows: sortedRows };
    }
  }, [sortedRows, activeView]);

  // Notify parent of row count
  useEffect(() => {
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

  // Handle individual row selection
  const handleRowSelection = useCallback((stageId: string, selected: boolean) => {
    setSelectedStageIds((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(stageId);
      } else {
        newSet.delete(stageId);
      }
      return newSet;
    });
  }, []);

  // Compute selected rows - memoized for efficiency
  const selectedRowsArray = useMemo(() => {
    if (selectedStageIds.size === 0) return [];
    return sortedRows.filter((row) => selectedStageIds.has(row.stageId));
  }, [selectedStageIds, sortedRows]);

  // Notify parent when selection changes
  useEffect(() => {
    onSelectionChange?.(selectedRowsArray);
  }, [selectedRowsArray, onSelectionChange]);

  // Handle select all
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
  const handleSaveStageJWSummary = useCallback(
    (stageId: string, projectType: ProjectType, customProjectType?: string) => {
      const row = sortedRows.find((r) => r.stage.id === stageId);
      if (row) {
        const stage = row.stage;
        stage.projectType = projectType;
        stage.customProjectType = customProjectType;
        console.log('Updated stage JW Summary:', { stageId, projectType, customProjectType });
      }
      setEditStageJWSummaryOpen(false);
    },
    [sortedRows]
  );

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading projects...</div>;
  }

  if (sortedRows.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No projects found</div>;
  }

  // Render compact view with project grouping
  if (activeView === 'compact') {
    const projectGroups = groupedRows as Array<{
      projectCode: string;
      projectLabel: string;
      rows: DashboardRow[];
    }>;
    return (
      <>
        <div className="border rounded-lg overflow-x-auto">
          <Table className="border-collapse w-full" style={{ borderCollapse: 'collapse' }}>
            <DashboardTableHeader
              activeView={activeView}
              sortField={sortField}
              sortDirection={sortDirection}
              selectedCount={selectedStageIds.size}
              totalCount={sortedRows.length}
              onSort={handleSort}
              onSelectAll={handleSelectAll}
            />
            <TableBody>
              {projectGroups.map((group) => (
                <TimelineGroup
                  key={group.projectCode}
                  dateKey={group.projectCode}
                  dateLabel={group.projectLabel}
                  rows={group.rows}
                  activeView={activeView}
                  selectedStageIds={selectedStageIds}
                  onSelectionChange={handleRowSelection}
                  onViewProject={(row) => {
                    navigate(
                      `/sites?building=${encodeURIComponent(row.project.building)}&projectCode=${row.project.projectCode}`
                    );
                  }}
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
  }

  // Render detailed view as flat list
  if (activeView === 'detailed') {
    const flatGroups = groupedRows as any;
    const rows = Array.isArray(flatGroups) ? [] : (flatGroups.rows || []);
    return (
      <>
        <div className="border rounded-lg overflow-x-auto">
          <Table className="border-collapse w-full" style={{ borderCollapse: 'collapse' }}>
            <DashboardTableHeader
              activeView={activeView}
              sortField={sortField}
              sortDirection={sortDirection}
              selectedCount={selectedStageIds.size}
              totalCount={sortedRows.length}
              onSort={handleSort}
              onSelectAll={handleSelectAll}
            />
            <TableBody>
              {(rows.length > 0 ? rows : sortedRows).map((row) => (
                <DashboardTableRow
                  key={row.stageId}
                  row={row}
                  activeView={activeView}
                  isSelected={selectedStageIds.has(row.stageId)}
                  onSelectionChange={handleRowSelection}
                  onViewProject={(row) => {
                    navigate(
                      `/sites?building=${encodeURIComponent(row.project.building)}&projectCode=${row.project.projectCode}`
                    );
                  }}
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
  }

  // Render timeline view with date grouping
  if (activeView === 'timeline') {
    const timelineGroups = groupedRows as Array<{
      dateKey: string;
      dateLabel: string;
      rows: DashboardRow[];
    }>;
    return (
      <>
        <div className="border rounded-lg overflow-x-auto">
          <Table className="border-collapse w-full" style={{ borderCollapse: 'collapse' }}>
            <DashboardTableHeader
              activeView={activeView}
              sortField={sortField}
              sortDirection={sortDirection}
              selectedCount={selectedStageIds.size}
              totalCount={sortedRows.length}
              onSort={handleSort}
              onSelectAll={handleSelectAll}
            />
            <TableBody>
              {timelineGroups.map((group) => (
                <TimelineGroup
                  key={group.dateKey}
                  dateKey={group.dateKey}
                  dateLabel={group.dateLabel}
                  rows={group.rows}
                  activeView={activeView}
                  selectedStageIds={selectedStageIds}
                  onSelectionChange={handleRowSelection}
                  onViewProject={(row) => {
                    navigate(
                      `/sites?building=${encodeURIComponent(row.project.building)}&projectCode=${row.project.projectCode}`
                    );
                  }}
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
  }

  // Render status-grouped views (by-job-status, by-invoice, by-stage-type, by-consultants)
  const statusGroups = groupedRows as Array<{
    statusKey?: string;
    statusLabel?: string;
    stageKey?: string;
    stageLabel?: string;
    consultantKey?: string;
    consultantLabel?: string;
    rows: DashboardRow[];
  }>;

  return (
    <>
      <div className="border rounded-lg overflow-x-auto">
        <Table className="border-collapse w-full" style={{ borderCollapse: 'collapse' }}>
          <DashboardTableHeader
            activeView={activeView}
            sortField={sortField}
            sortDirection={sortDirection}
            selectedCount={selectedStageIds.size}
            totalCount={sortedRows.length}
            onSort={handleSort}
            onSelectAll={handleSelectAll}
          />
          <TableBody>
            {statusGroups.map((group, idx) => {
              const groupLabel = group.statusLabel || group.stageLabel || group.consultantLabel || `Group ${idx}`;
              return (
                <TimelineGroup
                  key={`${groupLabel}-${idx}`}
                  dateKey={groupLabel}
                  dateLabel={groupLabel}
                  rows={group.rows}
                  activeView={activeView}
                  selectedStageIds={selectedStageIds}
                  onSelectionChange={handleRowSelection}
                  onViewProject={(row) => {
                    navigate(
                      `/sites?building=${encodeURIComponent(row.project.building)}&projectCode=${row.project.projectCode}`
                    );
                  }}
                  onEditStageJWSummary={handleEditStageJWSummary}
                />
              );
            })}
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
