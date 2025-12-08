/**
 * ProjectRowGroup Component
 * Displays a project header with expandable stage rows
 * Allows selection of individual stages and the entire project group
 */

import { useState, useCallback, memo, useMemo, useRef, useEffect } from 'react';
import { DashboardRow } from '@/hooks/useDashboardData';
import { Table, TableCell, TableHead, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import { ProjectTypeBadge } from './ProjectTypeBadge';
import { ChevronRight, ChevronDown, Eye } from 'lucide-react';

interface ProjectRowGroupProps {
  projectCode: string;
  stages: DashboardRow[];
  selectedRows: Set<string>; // stageId strings
  onSelectionChange: (stageIds: string[]) => void;
  onViewProject: (row: DashboardRow) => void;
  onEditJWSummary?: (projectCode: string) => void;
  onEditStageJWSummary?: (stage: any) => void;
}

const ProjectRowGroupComponent = ({
  projectCode,
  stages,
  selectedRows,
  onSelectionChange,
  onViewProject,
  onEditJWSummary,
  onEditStageJWSummary,
}: ProjectRowGroupProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const projectCheckboxRef = useRef<HTMLInputElement>(null);

  // Memoize stage IDs to avoid recomputation
  const stageIds = useMemo(() => stages.map((s) => s.stageId), [stages]);

  // Check if all/some stages in this project are selected
  const allStagesSelected = useMemo(
    () => stages.length > 0 && stageIds.every((id) => selectedRows.has(id)),
    [stages.length, stageIds, selectedRows]
  );
  const someStagesSelected = useMemo(
    () => stageIds.some((id) => selectedRows.has(id)),
    [stageIds, selectedRows]
  );

  // Update indeterminate state on checkbox
  useEffect(() => {
    if (projectCheckboxRef.current) {
      projectCheckboxRef.current.indeterminate = someStagesSelected && !allStagesSelected;
    }
  }, [someStagesSelected, allStagesSelected]);

  // Handle project header checkbox
  const handleProjectSelect = useCallback(() => {
    // Check current selection state inline
    const isCurrentlyAllSelected = stages.length > 0 && stageIds.every((id) => selectedRows.has(id));

    if (isCurrentlyAllSelected) {
      // Deselect all stages in this project
      const newSelected = Array.from(selectedRows).filter((id) => !stageIds.includes(id));
      onSelectionChange(newSelected);
    } else {
      // Select all stages in this project
      const newSelected = Array.from(new Set([...selectedRows, ...stageIds]));
      onSelectionChange(newSelected);
    }
  }, [stageIds, selectedRows, stages.length, onSelectionChange]);

  // Handle individual stage selection
  const handleStageSelect = useCallback((stageId: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(stageId)) {
      newSelected.delete(stageId);
    } else {
      newSelected.add(stageId);
    }
    onSelectionChange(Array.from(newSelected));
  }, [selectedRows, onSelectionChange]);

  if (stages.length === 0) return null;

  const firstStage = stages[0];
  const rowKey = `project-${projectCode}`;

  return (
    <>
      {/* Project Header Row */}
      <TableRow className="hover:bg-muted/50 border-b-2 font-semibold bg-muted/20">
        {/* Expand/Collapse Toggle */}
        <TableCell className="w-12 cursor-pointer border-r border-border/30" onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </TableCell>

        {/* Project Selection Checkbox */}
        <TableCell className="w-12 border-r border-border/30">
          <input
            ref={projectCheckboxRef}
            type="checkbox"
            checked={allStagesSelected}
            onChange={handleProjectSelect}
            className="rounded"
            title={allStagesSelected ? 'Deselect all stages' : 'Select all stages'}
          />
        </TableCell>

        {/* Project Code - Clickable */}
        <TableCell
          className="font-mono text-sm font-bold text-primary border-r border-border/30 cursor-pointer hover:underline hover:opacity-80 transition-opacity"
          onClick={() => onViewProject(firstStage)}
          title="Click to view project details"
        >
          {projectCode}
        </TableCell>

        {/* Order Date */}
        <TableCell className="text-sm border-r border-border/30">
          {firstStage.orderDate ? new Date(firstStage.orderDate).toLocaleDateString('en-AU') : '—'}
        </TableCell>

        {/* Invoice Status */}
        <TableCell className="border-r border-border/30">
          <InvoiceStatusBadge status={firstStage.invoiceStatus as any} />
        </TableCell>

        {/* Job Status */}
        <TableCell className="border-r border-border/30">
          <Badge
            variant={
              firstStage.jobStatus === 'Active'
                ? 'default'
                : firstStage.jobStatus === 'Completed'
                  ? 'secondary'
                  : 'outline'
            }
          >
            {firstStage.jobStatus}
          </Badge>
        </TableCell>

        {/* Building */}
        <TableCell className="font-medium text-sm border-r border-border/30">{firstStage.building}</TableCell>

        {/* Address */}
        <TableCell className="text-sm text-muted-foreground border-r border-border/30">{firstStage.address || '—'}</TableCell>

        {/* Suburb */}
        <TableCell className="text-sm border-r border-border/30">{firstStage.suburb || '—'}</TableCell>

        {/* State */}
        <TableCell className="border-r border-border/30">
          <Badge variant="outline">{firstStage.state}</Badge>
        </TableCell>

        {/* Postcode */}
        <TableCell className="text-sm border-r border-border/30">{firstStage.postcode || '—'}</TableCell>

        {/* JW Summary - Clickable */}
        <TableCell
          className="cursor-pointer hover:opacity-80 transition-opacity border-r border-border/30"
          onClick={() => onEditJWSummary?.(projectCode)}
          title="Click to edit JW Summary"
        >
          <ProjectTypeBadge
            type={firstStage.project.projectType}
            customType={firstStage.project.customProjectType}
          />
        </TableCell>

        {/* Description (not shown in project header, placeholder) */}
        <TableCell className="text-sm text-muted-foreground border-r border-border/30">—</TableCell>

        {/* Client */}
        <TableCell className="text-sm border-r border-border/30">{firstStage.clientName || '—'}</TableCell>

        {/* Business */}
        <TableCell className="text-sm text-muted-foreground border-r border-border/30">{firstStage.clientBusiness || '—'}</TableCell>

        {/* Value (not shown for project header) */}
        <TableCell className="text-right font-semibold text-sm border-r border-border/30">—</TableCell>

        {/* Action */}
        <TableCell className="text-center">—</TableCell>
      </TableRow>

      {/* Stage Rows (shown when expanded) */}
      {isExpanded &&
        stages.map((stage, index) => (
          <TableRow
            key={stage.stageId}
            className={`hover:bg-muted/50 ${selectedRows.has(stage.stageId) ? 'bg-blue-50' : ''}`}
          >
            {/* Indentation indicator */}
            <TableCell className="w-12 pl-8 border-r border-border/30">
              <div className="text-xs text-muted-foreground">{index + 1}</div>
            </TableCell>

            {/* Stage Selection Checkbox */}
            <TableCell className="w-12 border-r border-border/30">
              <input
                type="checkbox"
                checked={selectedRows.has(stage.stageId)}
                onChange={() => handleStageSelect(stage.stageId)}
                className="rounded"
                title={`Select ${stage.stageName}`}
              />
            </TableCell>

            {/* Project Code (repeated for clarity) */}
            <TableCell className="font-mono text-sm text-muted-foreground border-r border-border/30">
              {stage.projectCode}
            </TableCell>

            {/* Order Date */}
            <TableCell className="text-sm border-r border-border/30">
              {stage.orderDate ? new Date(stage.orderDate).toLocaleDateString('en-AU') : '—'}
            </TableCell>

            {/* Invoice Status (project-level) */}
            <TableCell className="border-r border-border/30">
              <InvoiceStatusBadge status={stage.invoiceStatus as any} />
            </TableCell>

            {/* Job Status (project-level) */}
            <TableCell className="border-r border-border/30">
              <Badge
                variant={
                  stage.jobStatus === 'Active'
                    ? 'default'
                    : stage.jobStatus === 'Completed'
                      ? 'secondary'
                      : 'outline'
                }
              >
                {stage.jobStatus}
              </Badge>
            </TableCell>

            {/* Building */}
            <TableCell className="font-medium text-sm border-r border-border/30">{stage.building}</TableCell>

            {/* Address */}
            <TableCell className="text-sm text-muted-foreground border-r border-border/30">{stage.address || '—'}</TableCell>

            {/* Suburb */}
            <TableCell className="text-sm border-r border-border/30">{stage.suburb || '—'}</TableCell>

            {/* State */}
            <TableCell className="border-r border-border/30">
              <Badge variant="outline">{stage.state}</Badge>
            </TableCell>

            {/* Postcode */}
            <TableCell className="text-sm border-r border-border/30">{stage.postcode || '—'}</TableCell>

            {/* JW Summary - Clickable for stage editing */}
            <TableCell
              className="border-r border-border/30 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => onEditStageJWSummary?.(stage)}
              title="Click to edit JW Summary for this stage"
            >
              <ProjectTypeBadge
                type={stage.stage.projectType || stage.project.projectType}
                customType={stage.stage.customProjectType || stage.project.customProjectType}
              />
            </TableCell>

            {/* Stage Name */}
            <TableCell className="text-sm font-medium border-r border-border/30" title={stage.stageName}>
              {stage.stageName}
            </TableCell>

            {/* Client */}
            <TableCell className="text-sm border-r border-border/30">{stage.clientName || '—'}</TableCell>

            {/* Business */}
            <TableCell className="text-sm text-muted-foreground border-r border-border/30">{stage.clientBusiness || '—'}</TableCell>

            {/* Stage Price */}
            <TableCell className="text-right font-semibold text-sm border-r border-border/30">
              {stage.stagePrice ? `$${stage.stagePrice.toLocaleString()}` : '—'}
            </TableCell>

            {/* Action - View Details */}
            <TableCell className="text-center">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onViewProject(stage)}
                title="View project details"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
    </>
  );
};

// Memoize to prevent unnecessary re-renders when props haven't changed
export const ProjectRowGroup = memo(ProjectRowGroupComponent);
