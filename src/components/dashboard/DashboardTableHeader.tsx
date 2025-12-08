/**
 * Dashboard Table Header Component
 * Dynamic column headers based on view configuration
 */

import React from 'react';
import { ViewType, VIEW_CONFIGS, COLUMN_DEFINITIONS } from '@/components/dashboard/views/viewConfigs';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronUp, ChevronDown } from 'lucide-react';

export type SortField =
  | 'projectCode'
  | 'orderDate'
  | 'invoiceStatus'
  | 'jobStatus'
  | 'building'
  | 'state'
  | 'value'
  | 'clientName';

interface DashboardTableHeaderProps {
  activeView: ViewType;
  sortField: SortField;
  sortDirection: 'asc' | 'desc';
  selectedCount: number;
  totalCount: number;
  onSort: (field: SortField) => void;
  onSelectAll: () => void;
}

export const DashboardTableHeader: React.FC<DashboardTableHeaderProps> = ({
  activeView,
  sortField,
  sortDirection,
  selectedCount,
  totalCount,
  onSort,
  onSelectAll,
}) => {
  const viewConfig = VIEW_CONFIGS[activeView];
  const columns = viewConfig.columns.map((colKey) => COLUMN_DEFINITIONS[colKey]);

  const SortIcon = ({ field, isSortable }: { field: SortField; isSortable: boolean }) => {
    if (!isSortable || sortField !== field) {
      return <div className="w-4 h-4" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  return (
    <TableHeader>
      <TableRow className="bg-muted/50">
        {/* Select All Checkbox */}
        <TableHead className="w-12 border-b border-r border-border/30">
          <input
            type="checkbox"
            checked={selectedCount === totalCount && totalCount > 0}
            indeterminate={selectedCount > 0 && selectedCount < totalCount}
            onChange={onSelectAll}
            className="rounded"
            title="Select all stages"
          />
        </TableHead>

        {/* Dynamic Column Headers */}
        {columns.map((column) => {
          const isSortable = column.sortable && column.sortField;
          const fieldToSort = column.sortField as SortField;

          return (
            <TableHead
              key={column.key}
              className={`border-b border-r border-border/30 ${
                isSortable ? 'cursor-pointer' : ''
              }`}
              style={{ width: column.width }}
              onClick={() => isSortable && onSort(fieldToSort)}
            >
              <div className="flex items-center gap-2">
                {column.label}
                {isSortable && <SortIcon field={fieldToSort} isSortable={isSortable} />}
              </div>
            </TableHead>
          );
        })}

        {/* Action Column */}
        <TableHead className="w-12 text-center border-b border-border/30">Action</TableHead>
      </TableRow>
    </TableHeader>
  );
};

DashboardTableHeader.displayName = 'DashboardTableHeader';
