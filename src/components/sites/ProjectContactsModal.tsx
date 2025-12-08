/**
 * Project Contacts Management Modal
 * Allows adding/removing contacts from a project
 */

import { useState, useMemo } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useContacts } from "@/hooks/useContacts";
import { X, Plus, Search, Mail, Phone } from "lucide-react";
import { DirectoryContact } from "@/types/data";

interface ProjectContactsModalProps {
  projectCode: string;
  projectName?: string;
  isOpen: boolean;
  onClose: () => void;
  assignedContacts?: string[];
  onContactsChange?: (contactEmails: string[]) => void;
  canEdit?: boolean;
}

export const ProjectContactsModal = ({
  projectCode,
  projectName,
  isOpen,
  onClose,
  assignedContacts = [],
  onContactsChange,
  canEdit = false,
}: ProjectContactsModalProps) => {
  const { fetchContacts } = useContacts();
  const [contacts, setContacts] = useState<DirectoryContact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(
    new Set(assignedContacts || [])
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(false);

  // Load contacts when modal opens
  if (isOpen && contacts.length === 0) {
    setIsLoading(true);
    fetchContacts().then((data) => {
      setContacts(data);
      setIsLoading(false);
    });
  }

  // Filter contacts based on search and category
  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      const matchesSearch =
        contact.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        categoryFilter === "all" || contact.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [contacts, searchQuery, categoryFilter]);

  const handleContactToggle = (email: string) => {
    if (!canEdit) return;

    const updated = new Set(selectedContacts);
    if (updated.has(email)) {
      updated.delete(email);
    } else {
      updated.add(email);
    }
    setSelectedContacts(updated);
  };

  const handleSave = () => {
    onContactsChange?.(Array.from(selectedContacts));
    onClose();
  };

  const assignedContactsList = contacts.filter((c) => selectedContacts.has(c.id));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-screen overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Project Contacts</DialogTitle>
          <DialogDescription>
            {projectCode && `Managing contacts for project ${projectCode}`}
            {projectName && ` - ${projectName}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Assigned Contacts Section */}
          {assignedContactsList.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Assigned Contacts ({assignedContactsList.length})
              </Label>
              <div className="space-y-2">
                {assignedContactsList.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium">
                        {contact.firstName} {contact.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground flex gap-3">
                        {contact.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {contact.email}
                          </div>
                        )}
                        {contact.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {contact.phone}
                          </div>
                        )}
                      </div>
                    </div>
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleContactToggle(contact.id)}
                        className="px-2"
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search and Filter Section */}
          {canEdit && (
            <div className="space-y-4">
              <Label className="text-base font-semibold">Add More Contacts</Label>
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="LML Lift Consultants">
                      LML Lift Consultants
                    </SelectItem>
                    <SelectItem value="Client">Client</SelectItem>
                    <SelectItem value="Contractor">Contractor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Available Contacts Table */}
              {isLoading ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-muted-foreground">Loading contacts...</p>
                  </CardContent>
                </Card>
              ) : filteredContacts.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Category</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredContacts
                        .filter((c) => !selectedContacts.has(c.id))
                        .map((contact) => (
                          <TableRow
                            key={contact.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleContactToggle(contact.id)}
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
                              {contact.firstName} {contact.lastName}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {contact.position}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {contact.email || "-"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {contact.category || "Unspecified"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-muted-foreground">No contacts found</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          {canEdit && (
            <Button onClick={handleSave}>Save Contacts</Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectContactsModal;
