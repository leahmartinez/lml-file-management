/**
 * Dashboard Sidebar Component
 * Fixed sidebar containing view selector, stats, and filters
 */

import React from 'react';
import { DashboardRow } from '@/hooks/useDashboardData';
import { ViewSelector } from '@/components/dashboard/ViewSelector';
import { CompactStats } from '@/components/dashboard/CompactStats';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { useDashboardView } from '@/hooks/useDashboardView';

interface DashboardSidebarProps {
  rows: DashboardRow[];
  filteredRows: DashboardRow[];
  onFilterChange: (filteredRows: DashboardRow[]) => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  rows,
  filteredRows,
  onFilterChange,
}) => {
  const { activeView, setView } = useDashboardView();

  return (
    <aside className="w-80 bg-card border-r border-border overflow-y-auto">
      <div className="p-4 space-y-4">
        {/* View Selector */}
        <ViewSelector activeView={activeView} onViewChange={setView} />

        {/* Compact Stats */}
        <CompactStats rows={rows} filteredRows={filteredRows} />

        {/* Filters */}
        <DashboardFilters rows={rows} onFilterChange={onFilterChange} />
      </div>
    </aside>
  );
};

DashboardSidebar.displayName = 'DashboardSidebar';
