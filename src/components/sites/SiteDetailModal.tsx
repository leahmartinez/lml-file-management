import { useState, useEffect } from "react";
import { Site, Unit } from "@/types/data";
import { useSiteUnits } from "@/hooks/useSiteUnits";
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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2, Edit2, Plus, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SiteDetailModalProps {
  site: Site | null;
  isOpen: boolean;
  onClose: () => void;
  onEditDescription?: (newDescription: string) => void;
  onEditStatus?: (newStatus: string) => void;
  onUnitsChange?: (units: Unit[]) => void;
}

export const SiteDetailModal = ({
  site,
  isOpen,
  onClose,
  onEditDescription,
  onEditStatus,
  onUnitsChange,
}: SiteDetailModalProps) => {
  const { units, addUnit, updateUnit, deleteUnit } = useSiteUnits(site?.building || "");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editDescValue, setEditDescValue] = useState(site?.description || "");
  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [newUnitName, setNewUnitName] = useState("");
  const [newUnitDescription, setNewUnitDescription] = useState("");
  const [newUnitLocation, setNewUnitLocation] = useState("");
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [editingUnitData, setEditingUnitData] = useState<Partial<Unit>>({});

  // Update state when site changes
  useEffect(() => {
    if (site && !isEditingDescription) {
      setEditDescValue(site.description || "");
    }
  }, [site, isEditingDescription]);

  const handleSaveDescription = () => {
    if (onEditDescription && editDescValue.trim()) {
      onEditDescription(editDescValue.trim());
    }
    setIsEditingDescription(false);
  };

  const handleAddUnit = () => {
    if (!newUnitName.trim()) return;
    const newUnit = addUnit({
      name: newUnitName,
      description: newUnitDescription,
      location: newUnitLocation,
    });
    setNewUnitName("");
    setNewUnitDescription("");
    setNewUnitLocation("");
    setIsAddingUnit(false);
    // Notify parent of units change
    if (onUnitsChange) {
      onUnitsChange([...units, newUnit]);
    }
  };

  const handleSaveUnit = (unitId: string) => {
    updateUnit(unitId, editingUnitData);
    setEditingUnitId(null);
    setEditingUnitData({});
    // Notify parent of units change
    if (onUnitsChange) {
      const updatedUnits = units.map(u =>
        u.id === unitId ? { ...u, ...editingUnitData } : u
      );
      onUnitsChange(updatedUnits);
    }
  };

  const handleDeleteUnit = (unitId: string) => {
    deleteUnit(unitId);
    // Notify parent of units change
    if (onUnitsChange) {
      const updatedUnits = units.filter(u => u.id !== unitId);
      onUnitsChange(updatedUnits);
    }
  };

  if (!site) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-screen overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{site.building}</DialogTitle>
          <DialogDescription>
            {site.address && `${site.address} • ${site.state}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Description Section */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Description</Label>
            {isEditingDescription ? (
              <div className="flex gap-2">
                <Textarea
                  value={editDescValue}
                  onChange={(e) => setEditDescValue(e.target.value)}
                  placeholder="Enter site description..."
                  rows={4}
                  className="flex-1"
                />
                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSaveDescription}
                    className="px-3"
                  >
                    <Check className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditDescValue(site.description || "");
                      setIsEditingDescription(false);
                    }}
                    className="px-3"
                  >
                    <X className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4 p-3 bg-muted rounded-lg">
                <p className="text-sm whitespace-pre-wrap flex-1">
                  {site.description || (
                    <span className="text-muted-foreground italic">
                      No description added
                    </span>
                  )}
                </p>
                {onEditDescription && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditingDescription(true)}
                    className="px-3"
                  >
                    <Edit2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Status Section */}
          {site.status && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Status</Label>
              <Badge variant="outline">{site.status}</Badge>
            </div>
          )}

          {/* Units Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Units</Label>
              {!isAddingUnit && (
                <Button
                  size="sm"
                  onClick={() => setIsAddingUnit(true)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Unit
                </Button>
              )}
            </div>

            {isAddingUnit && (
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <Label htmlFor="unitName" className="text-sm">
                      Unit Name *
                    </Label>
                    <Input
                      id="unitName"
                      placeholder="e.g., Unit 1A, Floor 3, Level 5"
                      value={newUnitName}
                      onChange={(e) => setNewUnitName(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="unitLocation" className="text-sm">
                      Location
                    </Label>
                    <Input
                      id="unitLocation"
                      placeholder="e.g., North Wing, Building A"
                      value={newUnitLocation}
                      onChange={(e) => setNewUnitLocation(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="unitDesc" className="text-sm">
                      Description
                    </Label>
                    <Textarea
                      id="unitDesc"
                      placeholder="Additional details about this unit..."
                      value={newUnitDescription}
                      onChange={(e) => setNewUnitDescription(e.target.value)}
                      rows={3}
                      className="mt-2"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={handleAddUnit}
                      disabled={!newUnitName.trim()}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Save Unit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsAddingUnit(false);
                        setNewUnitName("");
                        setNewUnitDescription("");
                        setNewUnitLocation("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {units.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {units.map((unit) => (
                      <TableRow key={unit.id}>
                        {editingUnitId === unit.id ? (
                          <>
                            <TableCell>
                              <Input
                                value={editingUnitData.name || unit.name}
                                onChange={(e) =>
                                  setEditingUnitData({
                                    ...editingUnitData,
                                    name: e.target.value,
                                  })
                                }
                                className="text-sm"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={editingUnitData.location || unit.location || ""}
                                onChange={(e) =>
                                  setEditingUnitData({
                                    ...editingUnitData,
                                    location: e.target.value,
                                  })
                                }
                                className="text-sm"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={editingUnitData.description || unit.description || ""}
                                onChange={(e) =>
                                  setEditingUnitData({
                                    ...editingUnitData,
                                    description: e.target.value,
                                  })
                                }
                                className="text-sm"
                              />
                            </TableCell>
                            <TableCell className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSaveUnit(unit.id)}
                                className="px-2"
                              >
                                <Check className="h-3 w-3 text-green-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingUnitId(null);
                                  setEditingUnitData({});
                                }}
                                className="px-2"
                              >
                                <X className="h-3 w-3 text-red-600" />
                              </Button>
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="font-medium">{unit.name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {unit.location || "-"}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {unit.description || "-"}
                            </TableCell>
                            <TableCell className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingUnitId(unit.id);
                                  setEditingUnitData({ ...unit });
                                }}
                                className="px-2"
                              >
                                <Edit2 className="h-3 w-3 text-muted-foreground" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteUnit(unit.id)}
                                className="px-2"
                              >
                                <Trash2 className="h-3 w-3 text-red-600" />
                              </Button>
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">No units added yet</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SiteDetailModal;
