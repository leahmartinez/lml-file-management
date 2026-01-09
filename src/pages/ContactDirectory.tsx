/**
 * Contact Directory Page
 * Main page for viewing and searching all contacts (users + external + businesses)
 * Supports three view modes: All Contacts (cards), By Business (table), By Individuals (cards only)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { DirectoryContact, Business, ExternalContact } from '@/types/data';
import { useContacts } from '@/hooks/useContacts';
import { useBusiness } from '@/hooks/useBusiness';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Plus, LayoutGrid, Briefcase, User } from 'lucide-react';
import { ContactSearchFilter, ContactFiltersState } from '@/components/contacts/ContactSearchFilter';
import { ContactListView } from '@/components/contacts/ContactListView';
import { ContactCard } from '@/components/contacts/ContactCard';
import { ContactDetailModal } from '@/components/contacts/ContactDetailModal';
import { AddExternalContactModal } from '@/components/contacts/AddExternalContactModal';
import { BusinessCard } from '@/components/contacts/BusinessCard';
import { BusinessDetailModal } from '@/components/contacts/BusinessDetailModal';
import { BusinessManagementModal } from '@/components/contacts/BusinessManagementModal';

type ContactViewMode = 'allContacts' | 'byBusiness' | 'byIndividuals';

const ContactDirectory: React.FC = () => {
  const { contacts, loading, error, categories, fetchContacts, fetchCategories, refreshContacts, createContact, updateContact, deleteContact } = useContacts();
  const { businesses, refreshBusinesses: refreshBussinessesHook, createBusiness, updateBusiness, deleteBusiness } = useBusiness();
  const { user, allUsers } = useAuth();

  // UI State
  const [contactViewMode, setContactViewMode] = useState<'grid' | 'list'>('grid');
  const [overallViewMode, setOverallViewMode] = useState<ContactViewMode>('allContacts');
  const [filters, setFilters] = useState<ContactFiltersState>({
    search: '',
    category: undefined,
  });

  // Contact modals
  const [selectedContact, setSelectedContact] = useState<DirectoryContact | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [addingContactForBusinessId, setAddingContactForBusinessId] = useState<string | null>(null);
  const [selectedExternalContact, setSelectedExternalContact] = useState<ExternalContact | null>(null);
  const [showEditContactModal, setShowEditContactModal] = useState(false);
  const [loadingContactEmail, setLoadingContactEmail] = useState<string | null>(null);

  // Business modals
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [showBusinessDetailModal, setShowBusinessDetailModal] = useState(false);
  const [showBusinessManagementModal, setShowBusinessManagementModal] = useState(false);

  // Navigation history for back button
  const [previousView, setPreviousView] = useState<{ type: 'contact' | 'business'; id: string } | null>(null);

  // Check if user is admin or consultant (can add external contacts)
  const canAddContacts = user?.role === 'admin' || user?.role === 'consultant';

  /**
   * Load contacts, categories, and businesses on component mount
   */
  useEffect(() => {
    fetchContacts(filters);
    fetchCategories();
    refreshBussinessesHook();
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
   * Handle editing external contact
   */
  const handleEditContact = (contact: ExternalContact) => {
    setSelectedExternalContact(contact);
    setShowEditContactModal(true);
  };

  /**
   * Handle business operations
   */
  const handleViewBusinessDetails = (business: Business) => {
    setSelectedBusiness(business);
    setShowBusinessDetailModal(true);
  };

  const handleEditBusiness = (business: Business) => {
    setSelectedBusiness(business);
    setShowBusinessManagementModal(true);
  };

  const handleDeleteBusiness = async (businessId: string) => {
    if (!canAddContacts) return;
    if (window.confirm('Are you sure you want to delete this business?')) {
      try {
        await deleteBusiness(businessId);
        await refreshBussinessesHook();
        setShowBusinessDetailModal(false);
        setSelectedBusiness(null);
      } catch (error) {
        console.error('Error deleting business:', error);
      }
    }
  };

  const handleCreateBusiness = async (businessData: Omit<Business, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await createBusiness(businessData);
      await refreshBussinessesHook();
      setShowBusinessManagementModal(false);
    } catch (error) {
      console.error('Error creating business:', error);
    }
  };

  const handleUpdateBusiness = async (businessData: Omit<Business, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!selectedBusiness) return;
    try {
      await updateBusiness(selectedBusiness.id, businessData);
      await refreshBussinessesHook();
      setShowBusinessManagementModal(false);
      setShowBusinessDetailModal(false);
      setSelectedBusiness(null);
    } catch (error) {
      console.error('Error updating business:', error);
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

  /**
   * Apply filtering to businesses
   */
  const filteredBusinesses = businesses.filter((business) => {
    // Search filter
    if (filters.search.trim()) {
      const searchLower = filters.search.toLowerCase();
      const matches =
        business.name.toLowerCase().includes(searchLower) ||
        business.city?.toLowerCase().includes(searchLower) ||
        business.email?.toLowerCase().includes(searchLower) ||
        business.phone?.toLowerCase().includes(searchLower);
      if (!matches) return false;
    }

    // Category filter
    if (filters.category && business.category !== filters.category) {
      return false;
    }

    return true;
  });

  /**
   * Get contacts affiliated with a specific business
   */
  const getBusinessContacts = (businessId: string): ExternalContact[] => {
    return filteredContacts.filter(
      (c) => c.type === 'external' && (c as any).businessId === businessId
    ) as ExternalContact[];
  };

  /**
   * Get external contacts that can be assigned to a business
   * (unattached or attached to a different business)
   * Uses ALL contacts, not filtered ones, so contacts show up regardless of search filters
   */
  const getAssignableContacts = (businessId: string | null): ExternalContact[] => {
    if (!businessId) return [];
    return contacts.filter(
      (c) => c.type === 'external' && (!(c as any).businessId || (c as any).businessId !== businessId)
    ) as ExternalContact[];
  };

  /**
   * Handle assigning an existing contact to a business
   */
  const handleAssignContactToBusiness = async (contactId: string, businessId: string) => {
    try {
      await updateContact(contactId, { businessId });
      await refreshContacts();
    } catch (error) {
      console.error('Error assigning contact to business:', error);
    }
  };

  /**
   * Handle updating a contact's business affiliation
   */
  const handleUpdateContactBusiness = async (contactId: string, businessId: string | undefined) => {
    try {
      await updateContact(contactId, { businessId });
      await refreshContacts();
    } catch (error) {
      console.error('Error updating contact business:', error);
      throw error;
    }
  };

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
      </div>

      {/* View Mode Selector & Action Buttons */}
      <div className="flex gap-2 items-center flex-wrap">
        <span className="text-sm font-medium text-muted-foreground">View:</span>
        <Button
          variant={overallViewMode === 'allContacts' ? 'default' : 'outline'}
          onClick={() => setOverallViewMode('allContacts')}
          className="text-sm"
        >
          All Contacts
        </Button>
        <Button
          variant={overallViewMode === 'byBusiness' ? 'default' : 'outline'}
          onClick={() => setOverallViewMode('byBusiness')}
          className="text-sm"
        >
          By Business
        </Button>
        <Button
          variant={overallViewMode === 'byIndividuals' ? 'default' : 'outline'}
          onClick={() => setOverallViewMode('byIndividuals')}
          className="text-sm"
        >
          By Individuals
        </Button>

        {/* Action Buttons (Admin/Consultant only) */}
        {canAddContacts && (
          <div className="ml-auto flex gap-2">
            {overallViewMode !== 'byIndividuals' && (
              <Button
                onClick={() => {
                  setSelectedBusiness(null);
                  setShowBusinessManagementModal(true);
                }}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                New Business
              </Button>
            )}
            <Button
              onClick={handleAddContact}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Contact
            </Button>
          </div>
        )}
      </div>

      {/* Search and Filter Section */}
      <Card>
        <CardContent className="pt-6">
          <ContactSearchFilter
            categories={categories}
            onFiltersChange={handleFiltersChange}
            onViewModeChange={setContactViewMode}
            loading={loading}
            resultCount={
              overallViewMode === 'allContacts'
                ? filteredContacts.length + filteredBusinesses.length
                : overallViewMode === 'byBusiness'
                ? filteredBusinesses.length
                : filteredContacts.length
            }
          />
        </CardContent>
      </Card>

      {/* View Mode: All Contacts (Mixed Cards) */}
      {overallViewMode === 'allContacts' && (
        <div>
          {loading && filteredContacts.length === 0 && filteredBusinesses.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading contacts and businesses...</p>
              </div>
            </div>
          ) : filteredContacts.length === 0 && filteredBusinesses.length === 0 ? (
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <p className="text-sm text-muted-foreground">
                {filters.search.trim() || filters.category
                  ? 'No contacts or businesses match your search criteria'
                  : 'No contacts or businesses found'}
              </p>
            </div>
          ) : (
            <>
              {contactViewMode === 'grid' ? (
                <div className="flex gap-4">
                  {/* Left Column: Businesses (1/3 width) */}
                  <div className="w-1/3 space-y-4">
                    {filteredBusinesses.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        No businesses found
                      </div>
                    ) : (
                      filteredBusinesses.map((business) => (
                        <BusinessCard
                          key={business.id}
                          business={business}
                          contactCount={getBusinessContacts(business.id).length}
                          onViewContacts={handleViewBusinessDetails}
                          onEdit={handleEditBusiness}
                          onDelete={handleDeleteBusiness}
                        />
                      ))
                    )}
                  </div>

                  {/* Right Columns: Contacts (2/3 width, 2-column grid) */}
                  <div className="w-2/3 grid grid-cols-2 gap-4">
                    {filteredContacts.length === 0 ? (
                      <div className="col-span-2 text-center py-8 text-sm text-muted-foreground">
                        No contacts found
                      </div>
                    ) : (
                      filteredContacts.map((contact) => (
                        <ContactCard
                          key={`contact-${contact.id}`}
                          contact={contact}
                          onViewDetails={handleViewDetails}
                          onDelete={canAddContacts ? handleDeleteContact : undefined}
                          canDelete={canAddContacts}
                          compact
                          isLoading={loadingContactEmail === contact.email}
                          businesses={businesses}
                          onViewBusiness={handleViewBusinessDetails}
                        />
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* List View: Business Cards */}
                  {filteredBusinesses.map((business) => (
                    <BusinessCard
                      key={business.id}
                      business={business}
                      contactCount={getBusinessContacts(business.id).length}
                      onViewContacts={handleViewBusinessDetails}
                      onEdit={handleEditBusiness}
                      onDelete={handleDeleteBusiness}
                    />
                  ))}

                  {/* List View: Contact Cards */}
                  {filteredContacts.map((contact) => (
                    <ContactCard
                      key={`contact-${contact.id}`}
                      contact={contact}
                      onViewDetails={handleViewDetails}
                      onDelete={canAddContacts ? handleDeleteContact : undefined}
                      canDelete={canAddContacts}
                      compact
                      isLoading={loadingContactEmail === contact.email}
                      businesses={businesses}
                      onViewBusiness={handleViewBusinessDetails}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* View Mode: By Business (Cards with expandable contacts) */}
      {overallViewMode === 'byBusiness' && (
        <div>
          {loading && filteredBusinesses.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading businesses...</p>
              </div>
            </div>
          ) : filteredBusinesses.length === 0 ? (
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <p className="text-sm text-muted-foreground">
                {filters.search.trim() || filters.category
                  ? 'No businesses match your search criteria'
                  : 'No businesses found'}
              </p>
            </div>
          ) : (
            <div
              className={`grid gap-4 ${
                contactViewMode === 'grid'
                  ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                  : 'grid-cols-1'
              }`}
            >
              {filteredBusinesses.map((business) => (
                <BusinessCard
                  key={business.id}
                  business={business}
                  contactCount={getBusinessContacts(business.id).length}
                  onViewContacts={handleViewBusinessDetails}
                  onEdit={handleEditBusiness}
                  onDelete={handleDeleteBusiness}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* View Mode: By Individuals (Contacts Only) */}
      {overallViewMode === 'byIndividuals' && (
        <ContactListView
          contacts={filteredContacts}
          loading={loading}
          error={error}
          viewMode={contactViewMode}
          onViewDetails={handleViewDetails}
          onDelete={handleDeleteContact}
          canDelete={canAddContacts}
          loadingContactEmail={loadingContactEmail}
          emptyMessage={
            filters.search.trim() || filters.category
              ? 'No contacts match your search criteria'
              : 'No contacts found. Make sure you have filled out your profile (Edit Profile) and check the browser console for debug info.'
          }
          businesses={businesses}
          onViewBusiness={handleViewBusinessDetails}
        />
      )}

      {/* Contact Detail Modal */}
      <ContactDetailModal
        contact={selectedContact}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedContact(null);
        }}
        onEdit={selectedContact?.type === 'external' ? handleEditContact : undefined}
        onDelete={handleDeleteContact}
        canDelete={canAddContacts && selectedContact?.type === 'external'}
        businesses={businesses}
        onUpdateBusiness={canAddContacts ? handleUpdateContactBusiness : undefined}
        onViewBusiness={(business) => {
          if (selectedContact) {
            setPreviousView({ type: 'contact', id: selectedContact.id });
          }
          setSelectedBusiness(business);
          setShowBusinessDetailModal(true);
          setShowDetailModal(false);
        }}
        onBack={previousView?.type === 'business' ? () => {
          const business = businesses.find(b => b.id === previousView.id);
          if (business) {
            setSelectedBusiness(business);
            setShowBusinessDetailModal(true);
            setShowDetailModal(false);
            setPreviousView(null);
          }
        } : undefined}
      />

      {/* Add External Contact Modal */}
      {canAddContacts && (
        <AddExternalContactModal
          isOpen={showAddContactModal}
          onClose={() => {
            setShowAddContactModal(false);
            setAddingContactForBusinessId(null);
          }}
          categories={categories}
          businesses={businesses}
          businessId={addingContactForBusinessId}
          unattachedContacts={addingContactForBusinessId ? getAssignableContacts(addingContactForBusinessId) : []}
          onAdd={async (contact) => {
            // If adding contact for a specific business, set the businessId
            const contactData = addingContactForBusinessId
              ? { ...contact, businessId: addingContactForBusinessId }
              : contact;
            await createContact(contactData);
            // Refresh contacts to show the newly added external contact
            await refreshContacts();
            setAddingContactForBusinessId(null);
          }}
          onAssignContact={handleAssignContactToBusiness}
        />
      )}

      {/* Business Detail Modal */}
      <BusinessDetailModal
        isOpen={showBusinessDetailModal}
        onClose={() => {
          setShowBusinessDetailModal(false);
          setSelectedBusiness(null);
        }}
        business={selectedBusiness}
        affiliatedContacts={selectedBusiness ? getBusinessContacts(selectedBusiness.id) : []}
        onEdit={handleEditBusiness}
        onDelete={handleDeleteBusiness}
        onEditContact={handleEditContact}
        onDeleteContact={handleDeleteContact}
        onViewContact={(contact) => {
          if (selectedBusiness) {
            setPreviousView({ type: 'business', id: selectedBusiness.id });
          }
          setSelectedContact(contact);
          setShowDetailModal(true);
          setShowBusinessDetailModal(false);
        }}
        onBack={previousView?.type === 'contact' ? () => {
          const contact = contacts.find(c => c.id === previousView.id);
          if (contact) {
            setSelectedContact(contact);
            setShowDetailModal(true);
            setShowBusinessDetailModal(false);
            setPreviousView(null);
          }
        } : undefined}
        onAddContact={(businessId) => {
          setAddingContactForBusinessId(businessId);
          setShowAddContactModal(true);
        }}
      />

      {/* Business Management Modal */}
      {canAddContacts && (
        <BusinessManagementModal
          isOpen={showBusinessManagementModal}
          onClose={() => {
            setShowBusinessManagementModal(false);
            setSelectedBusiness(null);
          }}
          business={selectedBusiness}
          onSave={selectedBusiness ? handleUpdateBusiness : handleCreateBusiness}
          onDelete={selectedBusiness ? handleDeleteBusiness : undefined}
        />
      )}

      {/* Edit External Contact Modal */}
      {canAddContacts && (
        <AddExternalContactModal
          isOpen={showEditContactModal}
          onClose={() => {
            setShowEditContactModal(false);
            setSelectedExternalContact(null);
          }}
          categories={categories}
          contact={selectedExternalContact}
          onUpdate={async (id, updates) => {
            await updateContact(id, updates);
            await refreshContacts();
            setShowEditContactModal(false);
            setSelectedExternalContact(null);
          }}
        />
      )}
      </div>
    </div>
  );
};

export default ContactDirectory;
