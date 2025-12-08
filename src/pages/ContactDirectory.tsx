/**
 * Contact Directory Page
 * Main page for viewing and searching all contacts (users + external)
 * Replaces the static ContactUs page
 */

import React, { useState, useEffect, useCallback } from 'react';
import { DirectoryContact } from '@/types/data';
import { useContacts } from '@/hooks/useContacts';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Plus } from 'lucide-react';
import { ContactSearchFilter, ContactFiltersState } from '@/components/contacts/ContactSearchFilter';
import { ContactListView } from '@/components/contacts/ContactListView';
import { ContactDetailModal } from '@/components/contacts/ContactDetailModal';
import { AddExternalContactModal } from '@/components/contacts/AddExternalContactModal';

const ContactDirectory: React.FC = () => {
  const { contacts, loading, error, categories, fetchContacts, fetchCategories, refreshContacts, createContact, deleteContact } = useContacts();
  const { user, allUsers } = useAuth();

  // UI State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<ContactFiltersState>({
    search: '',
    category: undefined,
  });
  const [selectedContact, setSelectedContact] = useState<DirectoryContact | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [loadingContactEmail, setLoadingContactEmail] = useState<string | null>(null);

  // Check if user is admin or consultant (can add external contacts)
  const canAddContacts = user?.role === 'admin' || user?.role === 'consultant';

  /**
   * Load contacts and categories on component mount
   */
  useEffect(() => {
    fetchContacts(filters);
    fetchCategories();
  }, []);

  /**
   * Refresh contacts when allUsers from auth context updates
   */
  useEffect(() => {
    if (allUsers.length > 0 && contacts.length === 0) {
      console.log('[ContactDirectory] allUsers loaded, refreshing contacts...', allUsers.length);
      refreshContacts();
    }
  }, [allUsers.length, refreshContacts, contacts.length]);

  /**
   * Listen for profile update events from Header
   * Shows loading state on the contact card while updating, then refreshes
   */
  useEffect(() => {
    const handleProfileUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      const email = customEvent.detail?.email;
      if (email) {
        // Show loading state for this contact
        setLoadingContactEmail(email);
        // Refresh contacts and clear loading state after a short delay
        setTimeout(() => {
          refreshContacts();
          setLoadingContactEmail(null);
        }, 500);
      }
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [refreshContacts]);

  /**
   * Refresh contacts when detail modal closes (in case profile was edited elsewhere)
   */
  useEffect(() => {
    if (!showDetailModal) {
      // Refresh to get latest profile data
      refreshContacts();
    }
  }, [showDetailModal, refreshContacts]);

  /**
   * Handle filter changes
   */
  const handleFiltersChange = useCallback(
    (newFilters: ContactFiltersState) => {
      setFilters(newFilters);
      fetchContacts(newFilters);
    },
    [fetchContacts]
  );

  /**
   * Handle contact selection
   */
  const handleViewDetails = (contact: DirectoryContact) => {
    setSelectedContact(contact);
    setShowDetailModal(true);
  };

  /**
   * Handle adding external contact
   */
  const handleAddContact = () => {
    if (canAddContacts) {
      setShowAddContactModal(true);
    }
  };

  /**
   * Handle deleting external contact
   */
  const handleDeleteContact = async (contact: DirectoryContact) => {
    if (contact.type !== 'external') {
      return; // Only external contacts can be deleted
    }

    if (!canAddContacts) {
      return; // Only admins/consultants can delete
    }

    if (window.confirm(`Are you sure you want to delete ${contact.firstName} ${contact.lastName}?`)) {
      try {
        await deleteContact(contact.id);
        await refreshContacts();
      } catch (error) {
        console.error('Error deleting contact:', error);
      }
    }
  };

  /**
   * Apply local filtering to contacts
   */
  const filteredContacts = contacts.filter((contact) => {
    // Search filter
    if (filters.search.trim()) {
      const searchLower = filters.search.toLowerCase();
      const matches =
        contact.firstName.toLowerCase().includes(searchLower) ||
        contact.lastName.toLowerCase().includes(searchLower) ||
        contact.email.toLowerCase().includes(searchLower) ||
        contact.position.toLowerCase().includes(searchLower);
      if (!matches) return false;
    }

    // Category filter
    if (filters.category && contact.category !== filters.category) {
      return false;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />

      <div className="p-6 space-y-6">
      {/* Loading Overlay for Initial Load */}
      {loading && contacts.length === 0 && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto"></div>
            <div>
              <p className="text-lg font-semibold">Loading Contacts</p>
              <p className="text-sm text-muted-foreground">Please wait...</p>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            Contact Directory
          </h1>
          <p className="text-muted-foreground mt-1">
            Browse and search all users and external contacts
          </p>
        </div>

        {/* Add Contact Button (Admin/Consultant only) */}
        {canAddContacts && (
          <Button onClick={handleAddContact} className="gap-2">
            <Plus className="h-4 w-4" />
            Add External Contact
          </Button>
        )}
      </div>

      {/* Search and Filter Section */}
      <Card>
        <CardContent className="pt-6">
          <ContactSearchFilter
            categories={categories}
            onFiltersChange={handleFiltersChange}
            onViewModeChange={setViewMode}
            loading={loading}
            resultCount={filteredContacts.length}
          />
        </CardContent>
      </Card>

      {/* Contacts List/Grid */}
      <ContactListView
        contacts={filteredContacts}
        loading={loading}
        error={error}
        viewMode={viewMode}
        onViewDetails={handleViewDetails}
        onDelete={handleDeleteContact}
        canDelete={canAddContacts}
        loadingContactEmail={loadingContactEmail}
        emptyMessage={
          filters.search.trim() || filters.category
            ? 'No contacts match your search criteria'
            : 'No contacts found. Make sure you have filled out your profile (Edit Profile) and check the browser console for debug info.'
        }
      />

      {/* Contact Detail Modal */}
      <ContactDetailModal
        contact={selectedContact}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedContact(null);
        }}
      />

      {/* Add External Contact Modal */}
      {canAddContacts && (
        <AddExternalContactModal
          isOpen={showAddContactModal}
          onClose={() => setShowAddContactModal(false)}
          categories={categories}
          onAdd={async (contact) => {
            await createContact(contact);
            // Refresh contacts to show the newly added external contact
            await refreshContacts();
          }}
        />
      )}
      </div>
    </div>
  );
};

export default ContactDirectory;
