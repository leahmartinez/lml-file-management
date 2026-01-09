/**
 * Contact List View Component
 * Displays contacts in a grid or list layout
 * Handles empty states and loading states
 */

import React from 'react';
import { DirectoryContact, Business } from '@/types/data';
import { ContactCard } from './ContactCard';
import { AlertCircle } from 'lucide-react';

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
  if (loading) {
    return (
      <div className="space-y-4">
        {/* Skeleton loaders */}
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className={
              viewMode === 'grid'
                ? 'h-64 bg-muted rounded-lg animate-pulse'
                : 'h-24 bg-muted rounded-lg animate-pulse'
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

  // List view
  return (
    <div className="space-y-3">
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
};
