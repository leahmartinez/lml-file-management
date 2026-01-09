/**
 * User Portal - Assigned Work Table
 * Displays stages assigned to the current user with filtering and actions
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserAssignedWork } from '@/hooks/useUserPortal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, MapPin } from 'lucide-react';
import { formatDate } from '@/components/dashboard/utils/formatters';

interface AssignedWorkTableProps {
  rows: UserAssignedWork[];
  loading?: boolean;
}

export const AssignedWorkTable: React.FC<AssignedWorkTableProps> = (props) => {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');

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
        row.address.toLowerCase().includes(searchLower);

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
    navigate(`/sites?building=${building}&projectCode=${projectCode}`);
  };

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search by project code, building, stage name, or address..."
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        className="h-9 text-sm"
      />

      <div className="text-xs text-muted-foreground">
        {filteredRows.length} of {rows.length} assigned stages
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table className="border-collapse w-full">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="border-b border-r border-border/30 w-20">Project</TableHead>
              <TableHead className="border-b border-r border-border/30">Building</TableHead>
              <TableHead className="border-b border-r border-border/30">Stage</TableHead>
              <TableHead className="border-b border-r border-border/30">Location</TableHead>
              <TableHead className="border-b border-r border-border/30 w-32">Assigned Date</TableHead>
              <TableHead className="border-b border-border/30 w-20 text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
                  <TableCell className="border-r border-border/30">{row.stageName}</TableCell>
                  <TableCell className="border-r border-border/30">
                    <div className="flex items-center gap-1 text-sm">
                      <MapPin className="h-3 w-3" />
                      {row.suburb}, {row.state}
                    </div>
                  </TableCell>
                  <TableCell className="border-r border-border/30 text-sm">
                    {row.assignmentDate ? formatDate(row.assignmentDate) : 'Recently assigned'}
                  </TableCell>
                  <TableCell className="text-center">
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
