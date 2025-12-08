/**
 * Compact Stats Component
 * Displays 2 key statistics: Total Projects and Matching Stages
 * Designed for sidebar display with minimal footprint
 */

import React from 'react';
import { DashboardRow } from '@/hooks/useDashboardData';

interface CompactStatsProps {
  rows: DashboardRow[];
  filteredRows: DashboardRow[];
}

export const CompactStats: React.FC<CompactStatsProps> = ({ rows, filteredRows }) => {
  // Calculate total unique projects
  const totalProjects = React.useMemo(() => {
    const uniqueCodes = new Set(rows.map((r) => r.projectCode));
    return uniqueCodes.size;
  }, [rows]);

  // Count matching stages (after filtering)
  const matchingStages = filteredRows.length;

  return (
    <div className="space-y-3 pb-4 border-b border-border/30">
      <div className="flex justify-between items-center px-2">
        <span className="text-sm text-muted-foreground">Total Projects</span>
        <span className="text-lg font-bold text-primary">{totalProjects}</span>
      </div>
      <div className="flex justify-between items-center px-2">
        <span className="text-sm text-muted-foreground">Matching Stages</span>
        <span className="text-lg font-bold text-primary">{matchingStages}</span>
      </div>
    </div>
  );
};

CompactStats.displayName = 'CompactStats';
