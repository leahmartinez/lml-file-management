/**
 * Timeline Group Component
 * Groups and displays stages by order date (Year/Month)
 */

import React, { useState, memo } from 'react';
import { DashboardRow } from '@/hooks/useDashboardData';
import { ViewType } from '@/components/dashboard/views/viewConfigs';
import { DashboardTableRow } from '@/components/dashboard/DashboardTableRow';
import { TableRow, TableCell } from '@/components/ui/table';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { formatDateForGrouping } from '@/components/dashboard/utils/formatters';

interface TimelineGroupProps {
  dateKey: string;
  dateLabel: string;
  rows: DashboardRow[];
  activeView: ViewType;
  selectedStageIds: Set<string>;
  onSelectionChange: (stageId: string, selected: boolean) => void;
  onViewProject: (row: DashboardRow) => void;
  onEditStageJWSummary: (stage: any) => void;
}

const TimelineGroupComponent: React.FC<TimelineGroupProps> = ({
  dateKey,
  dateLabel,
  rows,
  activeView,
  selectedStageIds,
  onSelectionChange,
  onViewProject,
  onEditStageJWSummary,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Count selected rows in this group
  const selectedInGroup = rows.filter((row) => selectedStageIds.has(row.stageId)).length;

  return (
    <>
      {/* Group Header Row */}
      <TableRow className="bg-muted/50 border-b border-border/30 hover:bg-muted/60">
        <TableCell colSpan={100} className="p-0">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 w-full p-3 text-sm font-medium text-foreground"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span className="flex-1 text-left">{dateLabel}</span>
            <span className="text-xs text-muted-foreground">
              {selectedInGroup > 0 ? `${selectedInGroup}/` : ''}{rows.length} stages
            </span>
          </button>
        </TableCell>
      </TableRow>

      {/* Group Rows */}
      {isExpanded &&
        rows.map((row) => (
          <DashboardTableRow
            key={row.stageId}
            row={row}
            activeView={activeView}
            isSelected={selectedStageIds.has(row.stageId)}
            onSelectionChange={onSelectionChange}
            onViewProject={onViewProject}
            onEditStageJWSummary={onEditStageJWSummary}
          />
        ))}
    </>
  );
};

export const TimelineGroup = memo(TimelineGroupComponent);
TimelineGroup.displayName = 'TimelineGroup';
