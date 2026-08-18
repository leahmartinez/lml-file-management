/**
 * User Portal - Assigned Work Table
 * Displays stages assigned to the current user with filtering and actions
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserAssignedWork } from '@/hooks/useUserPortal';
import { useProjectManagement } from '@/hooks/useProjectManagement';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, MapPin, CheckCircle, Calendar } from 'lucide-react';
import { formatDate } from '@/components/dashboard/utils/formatters';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

interface AssignedWorkTableProps {
  rows: UserAssignedWork[];
  loading?: boolean;
  compact?: boolean;
}

export const AssignedWorkTable: React.FC<AssignedWorkTableProps> = (props) => {
  const navigate = useNavigate();
  const { updateStageStatus, updateStageSiteVisitDate } = useProjectManagement();
  const [searchText, setSearchText] = useState('');
  const [openCalendarId, setOpenCalendarId] = useState<string | null>(null);

  const rows = props.rows;
  const loading = props.loading || false;

  // Filter rows based on search
  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      const searchLower = searchText.toLowerCase();
      const matchesSearch =
        row.projectCode.toLowerCase().includes(searchLower) ||
        row.building.toLowerCase().includes(searchLower) ||
        row.stageName.toLowerCase().includes(searchLower) ||
        (row.address && row.address.toLowerCase().includes(searchLower)) ||
        (row.suburb && row.suburb.toLowerCase().includes(searchLower)) ||
        row.state.toLowerCase().includes(searchLower);

      return matchesSearch;
    });
  }, [rows, searchText]);

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading assigned work...</div>;
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-2">No work assigned to you yet</p>
        <p className="text-sm text-muted-foreground">Contact your administrator to assign you to a project stage</p>
      </div>
    );
  }

  const handleViewProject = (row: UserAssignedWork) => {
    const building = encodeURIComponent(row.project.building);
    const projectCode = row.project.projectCode;
    navigate(`/sites?building=${building}&projectCode=${projectCode}`, { state: { from: '/my-work' } });
  };

  const handleMarkAsComplete = (row: UserAssignedWork, e: React.MouseEvent) => {
    e.stopPropagation();
    updateStageStatus(row.project.projectCode, row.stageId, 'Ready for Invoice');
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      <Input
        placeholder="Search by project code, building, stage name, or address..."
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        className="h-9 text-sm"
      />

      <div className="text-xs text-muted-foreground">
        {filteredRows.length} of {rows.length} assigned stages
      </div>

      <div className="border rounded-lg overflow-auto flex-1">
        <Table className="border-collapse w-full">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="border-b border-r border-border/30 w-20">Project</TableHead>
              <TableHead className="border-b border-r border-border/30">Building</TableHead>
              <TableHead className="border-b border-r border-border/30">Stage</TableHead>
              <TableHead className="border-b border-r border-border/30 w-36">Status</TableHead>
              <TableHead className="border-b border-r border-border/30">Address</TableHead>
              <TableHead className="border-b border-r border-border/30 w-32">Site Visit</TableHead>
              <TableHead className="border-b border-r border-border/30 w-32">Assigned Date</TableHead>
              <TableHead className="border-b border-border/30 w-32 text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No matching results
                </TableCell>
              </TableRow>
            ) : (
              filteredRows.map(row => (
                <TableRow
                  key={row.stageId}
                  onClick={() => handleViewProject(row)}
                  className="border-b border-border/30 hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <TableCell className="border-r border-border/30 font-medium">{row.projectCode}</TableCell>
                  <TableCell className="border-r border-border/30">{row.building}</TableCell>
                  <TableCell className="border-r border-border/30">
                    <div className="flex items-center gap-2">
                      <span>{row.stageName}</span>
                      {row.pairedConsultantName && !row.assignedToCurrentUser && (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          {row.pairedConsultantName}'s job
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="border-r border-border/30">
                    <Badge
                      variant={
                        row.stageStatus === 'Complete'
                          ? 'default'
                          : row.stageStatus === 'Ready for Invoice'
                          ? 'secondary'
                          : row.stageStatus === 'In Progress'
                          ? 'outline'
                          : 'outline'
                      }
                      className="text-xs"
                    >
                      {row.stageStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="border-r border-border/30">
                    <div className="flex items-center gap-1 text-sm">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate" title={row.address || `${row.suburb}, ${row.state}`}>
                        {row.address || `${row.suburb}, ${row.state}`}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="border-r border-border/30 text-sm" onClick={(e) => e.stopPropagation()}>
                    <Popover open={openCalendarId === row.stageId} onOpenChange={(open) => setOpenCalendarId(open ? row.stageId : null)}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs gap-1 w-full justify-start font-normal"
                        >
                          <Calendar className="h-3 w-3" />
                          {row.plannedSiteVisitDate ? formatDate(row.plannedSiteVisitDate) : 'Set date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={row.plannedSiteVisitDate ? new Date(row.plannedSiteVisitDate) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              updateStageSiteVisitDate(row.projectCode, row.stageId, date.toISOString());
                            }
                            setOpenCalendarId(null);
                          }}
                          initialFocus
                        />
                        {row.plannedSiteVisitDate && (
                          <div className="p-2 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full text-xs text-destructive"
                              onClick={() => {
                                updateStageSiteVisitDate(row.projectCode, row.stageId, '');
                                setOpenCalendarId(null);
                              }}
                            >
                              Clear date
                            </Button>
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  <TableCell className="border-r border-border/30 text-sm">
                    {row.assignmentDate ? formatDate(row.assignmentDate) : 'Recently assigned'}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {row.stageStatus !== 'Ready for Invoice' && row.stageStatus !== 'Complete' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => handleMarkAsComplete(row, e)}
                          title="Mark as complete (Ready for Invoice)"
                          className="h-7 px-2 text-xs gap-1"
                        >
                          <CheckCircle className="h-3 w-3" />
                          Complete
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewProject(row);
                        }}
                        title="View project details"
                        className="h-7 w-7 p-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

AssignedWorkTable.displayName = 'AssignedWorkTable';
