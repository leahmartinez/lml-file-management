/**
 * Business Table View Component
 * Displays businesses in a Jira-style compact table format
 */

import React, { useState, useMemo } from 'react';
import { Business, ExternalContact } from '@/types/data';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Edit2, Trash2 } from 'lucide-react';

interface BusinessTableViewProps {
  businesses: Business[];
  contacts: ExternalContact[];
  isLoading?: boolean;
  onEditBusiness?: (business: Business) => void;
  onDeleteBusiness?: (id: string) => void;
  onEditContact?: (contact: ExternalContact) => void;
  onDeleteContact?: (id: string) => void;
}

type SortField = 'name' | 'city' | 'category' | 'contactCount';
type SortDirection = 'asc' | 'desc';

export const BusinessTableView: React.FC<BusinessTableViewProps> = ({
  businesses,
  contacts,
  isLoading = false,
  onEditBusiness,
  onDeleteBusiness,
  onEditContact,
  onDeleteContact,
}) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const toggleRow = (businessId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(businessId)) {
      newExpanded.delete(businessId);
    } else {
      newExpanded.add(businessId);
    }
    setExpandedRows(newExpanded);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getBusinessContacts = (businessId: string): ExternalContact[] => {
    return contacts.filter(c => c.businessId === businessId);
  };

  const sortedBusinesses = useMemo(() => {
    const sorted = [...businesses].sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (sortField) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'city':
          aVal = (a.city || '').toLowerCase();
          bVal = (b.city || '').toLowerCase();
          break;
        case 'category':
          aVal = (a.category || '').toLowerCase();
          bVal = (b.category || '').toLowerCase();
          break;
        case 'contactCount':
          aVal = getBusinessContacts(a.id).length;
          bVal = getBusinessContacts(b.id).length;
          break;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [businesses, sortField, sortDirection]);

  const SortHeader: React.FC<{
    field: SortField;
    label: string;
  }> = ({ field, label }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-2 font-semibold text-foreground hover:text-primary transition-colors text-left"
    >
      {label}
      {sortField === field && (
        <span className="text-xs">
          {sortDirection === 'asc' ? '↑' : '↓'}
        </span>
      )}
    </button>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading businesses...</p>
        </div>
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
        <p className="text-sm text-muted-foreground">No businesses found</p>
      </div>
    );
  }

  return (
    <div className="space-y-0 border border-border rounded-lg overflow-hidden">
      {/* Table Header */}
      <div className="bg-muted/50 border-b border-border px-4 py-3 grid grid-cols-12 gap-4 items-center sticky top-0">
        <div className="col-span-1"></div>
        <div className="col-span-3">
          <SortHeader field="name" label="Business Name" />
        </div>
        <div className="col-span-2">
          <SortHeader field="city" label="Location" />
        </div>
        <div className="col-span-2">
          <SortHeader field="category" label="Category" />
        </div>
        <div className="col-span-2">
          <SortHeader field="contactCount" label="Contacts" />
        </div>
        <div className="col-span-2 text-right">
          <span className="font-semibold text-foreground">Actions</span>
        </div>
      </div>

      {/* Table Rows */}
      <div className="divide-y divide-border">
        {sortedBusinesses.map((business) => {
          const businessContacts = getBusinessContacts(business.id);
          const isExpanded = expandedRows.has(business.id);

          return (
            <React.Fragment key={business.id}>
              {/* Main Row */}
              <div className="px-4 py-3 grid grid-cols-12 gap-4 items-center hover:bg-muted/30 transition-colors">
                <div className="col-span-1">
                  <button
                    onClick={() => toggleRow(business.id)}
                    className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                  >
                    {businessContacts.length > 0 ? (
                      isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )
                    ) : (
                      <div className="h-4 w-4" /> /* Empty space if no contacts */
                    )}
                  </button>
                </div>

                <div className="col-span-3">
                  <div className="font-medium text-foreground truncate">
                    {business.name}
                  </div>
                  {business.website && (
                    <a
                      href={business.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline truncate block"
                    >
                      {business.website}
                    </a>
                  )}
                </div>

                <div className="col-span-2">
                  <div className="text-sm text-foreground">
                    {business.city}
                    {business.state && `, ${business.state}`}
                  </div>
                </div>

                <div className="col-span-2">
                  {business.category ? (
                    <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                      {business.category}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>

                <div className="col-span-2">
                  <span className="text-sm font-medium">
                    {businessContacts.length}
                  </span>
                </div>

                <div className="col-span-2 flex justify-end gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onEditBusiness?.(business)}
                    title="Edit business"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDeleteBusiness?.(business.id)}
                    title="Delete business"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>

              {/* Expanded Contacts Row */}
              {isExpanded && businessContacts.length > 0 && (
                <div className="bg-muted/30 border-t border-b border-border px-4 py-2">
                  <div className="space-y-2">
                    {businessContacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center justify-between gap-4 py-2 px-4 bg-background rounded border border-border/50 hover:border-border transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground text-sm">
                            {contact.firstName} {contact.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {contact.position}
                            {contact.email && ` • ${contact.email}`}
                            {contact.phone && ` • ${contact.phone}`}
                          </div>
                        </div>

                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onEditContact?.(contact)}
                            title="Edit contact"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onDeleteContact?.(contact.id)}
                            title="Delete contact"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
