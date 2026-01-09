import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/Header';
import { Navigation } from '@/components/Navigation';
import { useDashboardData, DashboardRow } from '@/hooks/useDashboardData';
import { useProjectManagement } from '@/hooks/useProjectManagement';
import { useDashboardView } from '@/hooks/useDashboardView';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardTable } from '@/components/dashboard/DashboardTable';
import { EditJWSummaryModal } from '@/components/dashboard/EditJWSummaryModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Download, Copy, LayoutGrid, RefreshCw, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportToCSV, exportToExcel, copyToClipboard } from '@/utils/exportToCSV';
import { ProjectType } from '@/types/data';

const STATES = ['Victoria', 'NSW', 'South Australia', 'Queensland'];

const Dashboard = () => {
  const queryClient = useQueryClient();
  const { rows: allRows = [], loading } = useDashboardData();
  const { projects = [], updateProject, refetch, deleteProject } = useProjectManagement();
  const { activeView, setView } = useDashboardView();
  const [selectedState, setSelectedState] = useState('Victoria');
  const [filteredRows, setFilteredRows] = useState<DashboardRow[]>([]);
  const [selectedRows, setSelectedRows] = useState<DashboardRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [editJWSummaryOpen, setEditJWSummaryOpen] = useState(false);
  const [selectedProjectForEdit, setSelectedProjectForEdit] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDeletedProjects, setShowDeletedProjects] = useState(false);
  const [deletedProjectCodes, setDeletedProjectCodes] = useState<string[]>([]);

  // Load deleted project codes from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('deletedProjects');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setDeletedProjectCodes(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        console.error('Error loading deleted projects:', e);
      }
    }
  }, []);

  // Filter rows by selected state - memoized to prevent infinite loop in DashboardFilters
  const stateFilteredRows = useMemo(
    () => allRows.filter((row) => row.state === selectedState),
    [allRows, selectedState]
  );

  // Calculate unique project count from state-filtered rows
  const totalProjects = new Set(stateFilteredRows.map((row) => row.projectCode)).size;

  // Calculate unique project count from further filtered rows
  const filteredProjects = new Set(filteredRows.map((row) => row.projectCode)).size;

  // Sync filteredRows when state-filtered rows change
  useEffect(() => {
    setFilteredRows(stateFilteredRows);
    setSelectedRows([]);
  }, [stateFilteredRows, selectedState]);

  const handleFilterChange = useCallback((newFilteredRows: DashboardRow[]) => {
    setFilteredRows(newFilteredRows);
    setSelectedRows([]);
  }, []);

  const handleEditJWSummary = (projectCode: string) => {
    const project = projects.find((p) => p.projectCode === projectCode);
    if (project) {
      setSelectedProjectForEdit(project);
      setEditJWSummaryOpen(true);
    }
  };

  const handleSaveJWSummary = (
    projectCode: string,
    projectType: ProjectType,
    customProjectType?: string
  ) => {
    const project = projects.find((p) => p.projectCode === projectCode);
    if (project) {
      updateProject(projectCode, {
        ...project,
        projectType,
        customProjectType: customProjectType || undefined,
      });
      setEditJWSummaryOpen(false);
    }
  };

  const handleExportCSV = () => {
    exportToCSV({
      filename: `projects-dashboard-${new Date().toISOString().split('T')[0]}.csv`,
      selectedRows: selectedRows.length > 0 ? selectedRows : undefined,
      allRows: filteredRows,
    });
  };

  const handleExportExcel = () => {
    exportToExcel({
      filename: `projects-dashboard-${new Date().toISOString().split('T')[0]}.xlsx`,
      selectedRows: selectedRows.length > 0 ? selectedRows : undefined,
      allRows: filteredRows,
    });
  };

  const handleCopyToClipboard = () => {
    const rowsToCopy = selectedRows.length > 0 ? selectedRows : filteredRows;
    if (rowsToCopy.length === 0) {
      alert('No rows to copy');
      return;
    }
    copyToClipboard(rowsToCopy);
    alert(`Copied ${rowsToCopy.length} row(s) to clipboard`);
  };

  const handleRefreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Invalidate all relevant query caches to force fresh fetch
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      await queryClient.invalidateQueries({ queryKey: ['sites'] });
      await queryClient.invalidateQueries({ queryKey: ['contacts'] });
      await queryClient.invalidateQueries({ queryKey: ['assets'] });

      // Also refetch projects
      refetch?.();

      console.log('[Dashboard] Data refreshed successfully');
    } catch (error) {
      console.error('[Dashboard] Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient, refetch]);

  const handleRestoreProject = useCallback((projectCode: string) => {
    // Create a new array without the restored project
    const updated = deletedProjectCodes.filter(code => code !== projectCode);
    setDeletedProjectCodes(updated);
    localStorage.setItem('deletedProjects', JSON.stringify(updated));

    console.log(`[Dashboard] Restored project: ${projectCode}`);
  }, [deletedProjectCodes]);

  const handleClearAllDeletions = useCallback(() => {
    if (confirm('Are you sure you want to restore all deleted projects? This action cannot be undone.')) {
      setDeletedProjectCodes([]);
      localStorage.removeItem('deletedProjects');
      console.log('[Dashboard] Cleared all deleted projects');
      setShowDeletedProjects(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />

      <main className="flex flex-col">
        {/* Page Header */}
        <div className="py-6 px-4">
          <div className="mb-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">Projects Dashboard</h1>
                <p className="text-muted-foreground mt-1">
                  Manage and track all projects with filtering, sorting, and export options
                </p>
              </div>
              <LayoutGrid className="h-12 w-12 text-muted-foreground" />
            </div>
          </div>

          {/* State Tabs */}
          <div className="flex gap-2 mb-8 border-b">
            {STATES.map((state) => (
              <button
                key={state}
                onClick={() => setSelectedState(state)}
                className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                  selectedState === state
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {state}
                <span className="ml-2 text-xs font-semibold">
                  ({new Set(allRows.filter(r => r.state === state).map(r => r.projectCode)).size})
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area with Sidebar */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <DashboardSidebar
            rows={stateFilteredRows}
            filteredRows={filteredRows}
            onFilterChange={handleFilterChange}
            activeView={activeView}
            onViewChange={setView}
          />

          {/* Main Content */}
          <div className="flex-1 overflow-auto">
            <div className="container mx-auto py-6 px-4 space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Total Projects Card */}
                <div className="rounded-lg border border-border bg-card p-6 hover:shadow-md transition-shadow">
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Projects</p>
                    <div className="text-4xl font-bold text-foreground">{totalProjects}</div>
                  </div>
                </div>

                {/* Matching Stages Card */}
                <div className="rounded-lg border border-border bg-card p-6 hover:shadow-md transition-shadow">
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Matching Stages</p>
                    <div className="text-4xl font-bold text-foreground">{filteredRows.length}</div>
                  </div>
                </div>

                {/* Selected Stages Card */}
                <div className="rounded-lg border border-border bg-card p-6 hover:shadow-md transition-shadow">
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Selected Stages</p>
                    <div className="text-4xl font-bold text-primary">{selectedRows.length}</div>
                  </div>
                </div>

                {/* Selected Value Card */}
                <div className="rounded-lg border border-border bg-card p-6 hover:shadow-md transition-shadow">
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Selected Value</p>
                    <div className="text-3xl font-bold text-primary">
                      ${selectedRows.reduce((sum, row) => sum + (row.value || 0), 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Bar */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="text-sm text-muted-foreground">
                  {selectedRows.length > 0 && (
                    <span>
                      {selectedRows.length} row{selectedRows.length !== 1 ? 's' : ''} selected
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  {/* Show Deleted Projects Button */}
                  {deletedProjectCodes.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDeletedProjects(true)}
                      title={`${deletedProjectCodes.length} deleted project(s)`}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Deleted ({deletedProjectCodes.length})
                    </Button>
                  )}

                  {/* Refresh Data Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshData}
                    disabled={isRefreshing || loading}
                    title="Refresh data from server"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                    {isRefreshing ? 'Refreshing...' : 'Refresh'}
                  </Button>

                  {/* Copy Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyToClipboard}
                    disabled={filteredRows.length === 0}
                    title="Copy selected or all filtered rows to clipboard"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>

                  {/* Export Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={filteredRows.length === 0}
                        title="Export filtered data"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleExportCSV}>
                        <span>Export as CSV</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleExportExcel}>
                        <span>Export as Excel</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Table Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Projects</CardTitle>
                </CardHeader>
                <CardContent>
                  <DashboardTable
                    rows={filteredRows}
                    loading={loading}
                    activeView={activeView}
                    onSelectionChange={setSelectedRows}
                    onRowCount={setTotalCount}
                    onEditJWSummary={handleEditJWSummary}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Edit JW Summary Modal */}
      <EditJWSummaryModal
        project={selectedProjectForEdit}
        isOpen={editJWSummaryOpen}
        onClose={() => {
          setEditJWSummaryOpen(false);
          setSelectedProjectForEdit(null);
        }}
        onSave={handleSaveJWSummary}
      />

      {/* Deleted Projects Dialog */}
      <Dialog open={showDeletedProjects} onOpenChange={setShowDeletedProjects}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Deleted Projects</DialogTitle>
            <DialogDescription>
              These projects are hidden from the dashboard. You can restore them individually or clear all deletions.
            </DialogDescription>
          </DialogHeader>

          {deletedProjectCodes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No deleted projects
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {deletedProjectCodes.map(projectCode => {
                const project = projects.find(p => p.projectCode === projectCode);
                return (
                  <div
                    key={projectCode}
                    className="flex items-center justify-between p-3 border rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{projectCode}</p>
                      {project && (
                        <p className="text-sm text-muted-foreground">{project.building}</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestoreProject(projectCode)}
                      className="ml-2 flex-shrink-0"
                    >
                      Restore
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeletedProjects(false)}
            >
              Close
            </Button>
            {deletedProjectCodes.length > 0 && (
              <Button
                variant="destructive"
                onClick={handleClearAllDeletions}
              >
                Restore All
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
