/**
 * Dashboard Table Row Component
 * Renders a single stage row with configurable columns
 */

import React, { memo } from 'react';
import { Eye } from 'lucide-react';
import { DashboardRow } from '@/hooks/useDashboardData';
import { ViewType, VIEW_CONFIGS, COLUMN_DEFINITIONS } from '@/components/dashboard/views/viewConfigs';
import {
  formatJobStatus,
  formatInvoiceStatus,
  formatStageStatus,
  formatProjectType,
  formatState,
  formatCurrency,
  formatDate,
} from '@/components/dashboard/utils/formatters';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

interface DashboardTableRowProps {
  row: DashboardRow;
  activeView: ViewType;
  isSelected: boolean;
  onSelectionChange: (stageId: string, selected: boolean) => void;
  onViewProject: (row: DashboardRow) => void;
  onEditStageJWSummary: (stage: any) => void;
}

const DashboardTableRowComponent: React.FC<DashboardTableRowProps> = ({
  row,
  activeView,
  isSelected,
  onSelectionChange,
  onViewProject,
  onEditStageJWSummary,
}) => {
  const viewConfig = VIEW_CONFIGS[activeView];
  const columns = viewConfig.columns.map((colKey) => COLUMN_DEFINITIONS[colKey]);

  // Render cell content based on column key
  const renderCell = (columnKey: string) => {
    switch (columnKey) {
      case 'projectCode':
        return row.projectCode;

      case 'orderDate':
        return formatDate(row.orderDate);

      case 'invoiceStatus': {
        const formatted = formatInvoiceStatus(row.invoiceStatus);
        return <span className={formatted.className}>{formatted.text}</span>;
      }

      case 'jobStatus': {
        const formatted = formatJobStatus(row.jobStatus);
        return <span className={formatted.className}>{formatted.text}</span>;
      }

      case 'building':
        return row.building;

      case 'address':
        return row.address;

      case 'suburb':
        return row.suburb;

      case 'state': {
        const formatted = formatState(row.state);
        return <span className={formatted.className}>{formatted.text}</span>;
      }

      case 'postcode':
        return row.postcode;

      case 'projectType': {
        const projectType = row.project.customProjectType || row.project.projectType;
        const formatted = formatProjectType(projectType);
        return (
          <button
            onClick={() => onEditStageJWSummary(row.stage)}
            className={`${formatted.className} hover:underline cursor-pointer`}
          >
            {formatted.text}
          </button>
        );
      }

      case 'stageName':
        return row.stageName;

      case 'stageStatus': {
        const formatted = formatStageStatus(row.stageStatus);
        return <span className={formatted.className}>{formatted.text}</span>;
      }

      case 'clientName':
        return row.clientName || '-';

      case 'business':
        return row.project.business || '-';

      case 'value':
        return <span className="text-right block">{formatCurrency(row.value)}</span>;

      case 'stageConsultants':
        // Render stage consultants - this would come from row.stage.consultants or similar
        return row.stage?.consultants?.map((c: any) => c.name).join(', ') || '-';

      default:
        return '-';
    }
  };

  return (
    <TableRow className="border-b border-border/30 hover:bg-muted/30">
      {/* Selection Checkbox */}
      <TableCell className="w-12 border-r border-border/30">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelectionChange(row.stageId, e.target.checked)}
          className="rounded"
        />
      </TableCell>

      {/* Dynamic Column Cells */}
      {columns.map((column) => (
        <TableCell key={column.key} className="border-r border-border/30" style={{ width: column.width }}>
          {renderCell(column.key)}
        </TableCell>
      ))}

      {/* Action Cell - View Project */}
      <TableCell className="w-12 text-center border-border/30">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewProject(row)}
          title="View project details"
          className="h-7 w-7 p-0"
        >
          <Eye className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
};

export const DashboardTableRow = memo(DashboardTableRowComponent);
DashboardTableRow.displayName = 'DashboardTableRow';
