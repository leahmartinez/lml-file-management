/**
 * Business Hierarchy View Component
 * Displays businesses with collapsible sections showing linked external contacts
 */

import React, { useState } from 'react';
import { Business, ExternalContact } from '@/types/data';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Edit2, Trash2, MapPin, Phone, Mail } from 'lucide-react';

interface BusinessHierarchyViewProps {
  businesses: Business[];
  contacts: ExternalContact[];
  isLoading?: boolean;
  onEditBusiness?: (business: Business) => void;
  onDeleteBusiness?: (id: string) => void;
  onEditContact?: (contact: ExternalContact) => void;
  onDeleteContact?: (id: string) => void;
}

export const BusinessHierarchyView: React.FC<BusinessHierarchyViewProps> = ({
  businesses,
  contacts,
  isLoading = false,
  onEditBusiness,
  onDeleteBusiness,
  onEditContact,
  onDeleteContact,
}) => {
  const [expandedBusinesses, setExpandedBusinesses] = useState<Set<string>>(new Set());

  const toggleBusiness = (businessId: string) => {
    const newExpanded = new Set(expandedBusinesses);
    if (newExpanded.has(businessId)) {
      newExpanded.delete(businessId);
    } else {
      newExpanded.add(businessId);
    }
    setExpandedBusinesses(newExpanded);
  };

  const getBusinessContacts = (businessId: string): ExternalContact[] => {
    return contacts.filter(c => c.businessId === businessId);
  };

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
    <div className="space-y-2">
      {businesses.map((business) => {
        const businessContacts = getBusinessContacts(business.id);
        const isExpanded = expandedBusinesses.has(business.id);

        return (
          <div
            key={business.id}
            className="border border-border rounded-lg overflow-hidden bg-card"
          >
            {/* Business Header */}
            <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center flex-1 gap-3">
                <button
                  onClick={() => toggleBusiness(business.id)}
                  className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                  aria-label={isExpanded ? 'Collapse' : 'Expand'}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">
                    {business.name}
                  </h3>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                    {business.city && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {business.city}
                        {business.state && `, ${business.state}`}
                      </div>
                    )}
                    {business.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {business.phone}
                      </div>
                    )}
                    {business.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {business.email}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Count Badge */}
              <div className="flex items-center gap-2 ml-4">
                <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded">
                  {businessContacts.length} contact{businessContacts.length !== 1 ? 's' : ''}
                </span>

                {/* Actions */}
                <div className="flex gap-1">
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
            </div>

            {/* Contacts List (Expanded) */}
            {isExpanded && (
              <div className="border-t border-border bg-muted/30 divide-y">
                {businessContacts.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No contacts in this business
                  </div>
                ) : (
                  businessContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="p-4 hover:bg-muted/60 transition-colors flex items-center justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground">
                          {contact.firstName} {contact.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {contact.position}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {contact.email && (
                            <a
                              href={`mailto:${contact.email}`}
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              <Mail className="h-3 w-3" />
                              {contact.email}
                            </a>
                          )}
                          {contact.phone && (
                            <a
                              href={`tel:${contact.phone}`}
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              <Phone className="h-3 w-3" />
                              {contact.phone}
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Contact Actions */}
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
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
