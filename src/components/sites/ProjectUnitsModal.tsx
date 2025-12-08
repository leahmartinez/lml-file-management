/**
 * Project Units Assignment Modal
 * Allows assigning units from the site to the project
 */

import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { X, Plus, Search } from "lucide-react";
import { Unit } from "@/types/data";

interface ProjectUnitsModalProps {
  projectCode: string;
  siteName: string;
  isOpen: boolean;
  onClose: () => void;
  availableUnits?: Unit[];
  assignedUnitIds?: string[];
  onUnitsChange?: (unitIds: string[]) => void;
  canEdit?: boolean;
}

export const ProjectUnitsModal = ({
  projectCode,
  siteName,
  isOpen,
  onClose,
  availableUnits = [],
  assignedUnitIds = [],
  onUnitsChange,
  canEdit = false,
}: ProjectUnitsModalProps) => {
  const [selectedUnits, setSelectedUnits] = useState<Set<string>>(
    new Set(assignedUnitIds || [])
  );
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setSelectedUnits(new Set(assignedUnitIds || []));
  }, [assignedUnitIds]);

  // Filter units based on search
  const filteredUnits = useMemo(() => {
    return availableUnits.filter((unit) => {
      const searchLower = searchQuery.toLowerCase();
      return (
        unit.name.toLowerCase().includes(searchLower) ||
        unit.location?.toLowerCase().includes(searchLower) ||
        unit.description?.toLowerCase().includes(searchLower)
      );
    });
  }, [availableUnits, searchQuery]);

  const handleUnitToggle = (unitId: string) => {
    if (!canEdit) return;

    const updated = new Set(selectedUnits);
    if (updated.has(unitId)) {
      updated.delete(unitId);
    } else {
      updated.add(unitId);
    }
    setSelectedUnits(updated);
  };

  const handleSave = () => {
    onUnitsChange?.(Array.from(selectedUnits));
    onClose();
  };

  const assignedUnitsList = availableUnits.filter((u) => selectedUnits.has(u.id));

  if (availableUnits.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Assign Assets to Project</DialogTitle>
            <DialogDescription>
              Project: {projectCode} | Site: {siteName}
            </DialogDescription>
          </DialogHeader>
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">
                No assets available for this site. Add assets in the site management to assign them to projects.
              </p>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-screen overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Assets to Project</DialogTitle>
          <DialogDescription>
            Project: {projectCode} | Site: {siteName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Assigned Assets Section */}
          {assignedUnitsList.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Assigned Assets ({assignedUnitsList.length})
              </Label>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset Name</TableHead>
                      <TableHead>Asset Type</TableHead>
                      <TableHead>OEM</TableHead>
                      {canEdit && <TableHead className="w-20">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignedUnitsList.map((unit) => (
                      <TableRow key={unit.id}>
                        <TableCell className="font-medium">{unit.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {unit.location || "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {unit.description || "-"}
                        </TableCell>
                        {canEdit && (
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleUnitToggle(unit.id)}
                              className="px-2"
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Search and Assignment Section */}
          {canEdit && (
            <div className="space-y-4">
              <Label className="text-base font-semibold">Add More Assets</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by asset name, type, or OEM..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Available Assets Table */}
              {filteredUnits.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Asset Name</TableHead>
                        <TableHead>Asset Type</TableHead>
                        <TableHead>OEM</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUnits
                        .filter((u) => !selectedUnits.has(u.id))
                        .map((unit) => (
                          <TableRow
                            key={unit.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleUnitToggle(unit.id)}
                          >
                            <TableCell>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="px-2"
                              >
                                <Plus className="h-4 w-4 text-primary" />
                              </Button>
                            </TableCell>
                            <TableCell className="font-medium">
                              {unit.name}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {unit.location || "-"}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {unit.description || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-muted-foreground">
                      {searchQuery
                        ? "No assets match your search"
                        : "All assets are already assigned"}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* View-Only Mode */}
          {!canEdit && assignedUnitsList.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">
                  No assets assigned to this project
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          {canEdit && (
            <Button onClick={handleSave}>Save Assets</Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectUnitsModal;
