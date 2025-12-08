/**
 * Dashboard Sidebar Component
 * Fixed sidebar containing view selector, stats, and filters
 */

import React from 'react';
import { DashboardRow } from '@/hooks/useDashboardData';
import { ViewType } from '@/components/dashboard/views/viewConfigs';
import { ViewSelector } from '@/components/dashboard/ViewSelector';
import { CompactStats } from '@/components/dashboard/CompactStats';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';

interface DashboardSidebarProps {
  rows: DashboardRow[];
  filteredRows: DashboardRow[];
  onFilterChange: (filteredRows: DashboardRow[]) => void;
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  rows,
  filteredRows,
  onFilterChange,
  activeView,
  onViewChange,
}) => {

  return (
    <aside className="w-80 bg-card border-r border-border overflow-y-auto">
      <div className="p-4 space-y-4">
        {/* View Selector */}
        <ViewSelector activeView={activeView} onViewChange={onViewChange} />

        {/* Compact Stats */}
        <CompactStats rows={rows} filteredRows={filteredRows} />

        {/* Filters */}
        <DashboardFilters rows={rows} onFilterChange={onFilterChange} />
      </div>
    </aside>
  );
};

DashboardSidebar.displayName = 'DashboardSidebar';
