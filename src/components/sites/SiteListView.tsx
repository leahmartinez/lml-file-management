import { Site, Project, DirectoryContact } from '@/types/data';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, MapPin, FolderKanban } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ContactDetailModal } from '@/components/ContactDetailModal';
import { useState } from 'react';

interface SiteListViewProps {
  sites: Array<Site & { projects?: Project[] }>;
  onSelectSite: (site: Site) => void;
  onEditSite: (site: Site) => void;
  onDeleteSite: (building: string) => void;
  isConsultant: boolean;
  siteContacts: Record<string, string[]>;
  contacts: DirectoryContact[];
}

export const SiteListView = ({
  sites,
  onSelectSite,
  onEditSite,
  onDeleteSite,
  isConsultant,
  siteContacts,
  contacts,
}: SiteListViewProps) => {
  const [contactDetailOpen, setContactDetailOpen] = useState(false);
  const [selectedContactDetail, setSelectedContactDetail] = useState<DirectoryContact | null>(null);

  return (
    <>
      <ContactDetailModal
        isOpen={contactDetailOpen}
        onClose={() => {
          setContactDetailOpen(false);
          setSelectedContactDetail(null);
        }}
        contact={selectedContactDetail}
      />

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[200px]">Site Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="w-[150px]">State</TableHead>
              <TableHead className="w-[80px]">Projects</TableHead>
              <TableHead>Contacts</TableHead>
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sites.map((site) => (
              <TableRow key={site.building} className="hover:bg-muted/50">
                <TableCell className="font-semibold">
                  <button
                    onClick={() => onSelectSite(site)}
                    className="text-primary hover:underline"
                  >
                    {site.building}
                  </button>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {site.address || 'N/A'}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{site.state || 'N/A'}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <FolderKanban className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{site.projects?.length || 0}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {siteContacts[site.building] && siteContacts[site.building].length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {siteContacts[site.building].map((email) => {
                          const contact = contacts.find(c => c.email === email);
                          return (
                            <Badge
                              key={email}
                              variant="secondary"
                              className="text-xs cursor-pointer hover:bg-secondary/80 transition-colors"
                              onClick={() => {
                                if (contact) {
                                  setSelectedContactDetail(contact);
                                  setContactDetailOpen(true);
                                }
                              }}
                            >
                              {contact ? `${contact.firstName} ${contact.lastName}` : email}
                            </Badge>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic">—</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    {isConsultant && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onEditSite(site)}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (window.confirm(`Delete site "${site.building}"?`)) {
                              onDeleteSite(site.building);
                            }
                          }}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
};
