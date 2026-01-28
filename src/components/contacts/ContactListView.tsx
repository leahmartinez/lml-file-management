/**
 * Contact List View Component
 * Displays contacts in a grid or list (table) layout
 * Handles empty states and loading states
 */

import React from 'react';
import { DirectoryContact, Business } from '@/types/data';
import { ContactCard } from './ContactCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Mail, Phone, Eye, Trash2, Building } from 'lucide-react';

interface ContactListViewProps {
  contacts: DirectoryContact[];
  loading?: boolean;
  error?: Error | null;
  viewMode?: 'grid' | 'list';
  onViewDetails?: (contact: DirectoryContact) => void;
  onDelete?: (contact: DirectoryContact) => void;
  canDelete?: boolean;
  loadingContactEmail?: string | null;
  emptyMessage?: string;
  businesses?: Business[];
  onViewBusiness?: (business: Business) => void;
}

export const ContactListView: React.FC<ContactListViewProps> = ({
  contacts,
  loading = false,
  error = null,
  viewMode = 'grid',
  onViewDetails,
  onDelete,
  canDelete = false,
  loadingContactEmail = null,
  emptyMessage = 'No contacts found',
  businesses = [],
  onViewBusiness,
}) => {
  // Helper to get business object
  const getBusiness = (contact: DirectoryContact): Business | null => {
    const businessId = (contact as any).businessId;
    if (!businessId) return null;
    return businesses.find(b => b.id === businessId) || null;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Skeleton loaders */}
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className={
              viewMode === 'grid'
                ? 'h-32 bg-muted rounded-lg animate-pulse'
                : 'h-12 bg-muted rounded-lg animate-pulse'
            }
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 border border-red-200 rounded-lg bg-red-50">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
          <h3 className="font-semibold text-red-900 mb-1">Error Loading Contacts</h3>
          <p className="text-sm text-red-700">{error.message}</p>
        </div>
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 border border-dashed border-muted-foreground/25 rounded-lg">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <h3 className="font-semibold text-muted-foreground mb-1">No Results</h3>
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {contacts.map((contact) => (
          <ContactCard
            key={contact.id}
            contact={contact}
            onViewDetails={onViewDetails}
            onDelete={onDelete}
            canDelete={canDelete}
            compact
            isLoading={loadingContactEmail === contact.email}
            businesses={businesses}
            onViewBusiness={onViewBusiness}
          />
        ))}
      </div>
    );
  }

  // List view - proper table like Dashboard
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Contacts ({contacts.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-x-auto">
          <Table className="border-collapse w-full">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="border-b border-r border-border/30 font-semibold w-[200px]">Name</TableHead>
                <TableHead className="border-b border-r border-border/30 font-semibold">Position</TableHead>
                <TableHead className="border-b border-r border-border/30 font-semibold">Email</TableHead>
                <TableHead className="border-b border-r border-border/30 font-semibold w-[140px]">Phone</TableHead>
                <TableHead className="border-b border-r border-border/30 font-semibold w-[140px]">Category</TableHead>
                <TableHead className="border-b border-r border-border/30 font-semibold">Business</TableHead>
                <TableHead className="border-b border-border/30 font-semibold w-[100px] text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact) => {
                const business = getBusiness(contact);
                const fullName = `${contact.firstName} ${contact.lastName}`;
                const initials = `${contact.firstName.charAt(0)}${contact.lastName.charAt(0)}`.toUpperCase();
                const isLoading = loadingContactEmail === contact.email;

                return (
                  <TableRow
                    key={contact.id}
                    className={`cursor-pointer hover:bg-muted/50 border-b border-border/30 transition-colors ${isLoading ? 'opacity-50' : ''}`}
                    onClick={() => onViewDetails?.(contact)}
                  >
                    <TableCell className="border-r border-border/30">
                      <div className="flex items-center gap-3">
                        {contact.photo ? (
                          <img
                            src={contact.photo}
                            alt={fullName}
                            className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-muted-foreground">{initials}</span>
                          </div>
                        )}
                        <span className="font-medium">{fullName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="border-r border-border/30 text-sm">{contact.position}</TableCell>
                    <TableCell className="border-r border-border/30">
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          <Mail className="h-3 w-3" />
                          <span className="truncate max-w-[200px]">{contact.email}</span>
                        </a>
                      )}
                    </TableCell>
                    <TableCell className="border-r border-border/30">
                      {contact.phone && (
                        <a
                          href={`tel:${contact.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          <Phone className="h-3 w-3" />
                          {contact.phone}
                        </a>
                      )}
                    </TableCell>
                    <TableCell className="border-r border-border/30">
                      {contact.category && (
                        <Badge
                          variant={
                            contact.category === 'LML Lift Consultants'
                              ? 'default'
                              : contact.category === 'Client'
                                ? 'secondary'
                                : 'outline'
                          }
                          className="text-xs"
                        >
                          {contact.category}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="border-r border-border/30">
                      {business && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewBusiness?.(business);
                          }}
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          <Building className="h-3 w-3" />
                          <span className="truncate max-w-[150px]">{business.name}</span>
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1 justify-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onViewDetails?.(contact)}
                          title="View details"
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canDelete && contact.type === 'external' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onDelete?.(contact)}
                            title="Delete"
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
