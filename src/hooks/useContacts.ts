/**
 * Custom hook for contact operations
 * Handles getting, creating, updating, and deleting contacts
 * Fetches registered users from auth context and combines with external contacts
 */

import { useState, useCallback, useEffect } from 'react';
import { DirectoryContact, ExternalContact, UserProfile } from '@/types/data';
import { contactsApi, profileApi } from '@/services/apiService';
import { getMockCategories, getMockProfileByEmail, mockExternalContacts } from '@/utils/mockContactData';
import { useAuth } from './useAuth';

const DEV_MODE = import.meta.env.DEV;

export interface ContactFilters {
  category?: string;
  search?: string;
}

export function useContacts() {
  const { allUsers } = useAuth();
  const [contacts, setContacts] = useState<DirectoryContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [externalContacts, setExternalContacts] = useState<ExternalContact[]>([]);

  /**
   * Fetch a user's profile by email
   */
  const fetchUserProfile = useCallback(async (email: string): Promise<UserProfile | null> => {
    try {
      if (DEV_MODE) {
        return getMockProfileByEmail(email) || null;
      }
      try {
        return await profileApi.getUserProfile(email);
      } catch (apiError) {
        // Fallback to mock data if API fails (endpoint may not exist)
        console.warn(`Profile API failed for ${email}, falling back to mock data:`, apiError);
        return getMockProfileByEmail(email) || null;
      }
    } catch (err) {
      console.error(`Error fetching profile for ${email}:`, err);
      return null;
    }
  }, []);

  /**
   * Fetch all contacts with optional filtering
   * Combines registered users from allUsers with external contacts
   * Fetches fresh profile data for each user
   */
  const fetchContacts = useCallback(async (filters?: ContactFilters) => {
    setLoading(true);
    setError(null);
    try {
      // Fetch profile data for all users
      const profilesPromises = allUsers.map((user) => fetchUserProfile(user.email));
      const profiles = await Promise.all(profilesPromises);

      // Create a map of email -> profile for easy lookup
      const profileMap: { [email: string]: UserProfile | null } = {};
      allUsers.forEach((user, index) => {
        profileMap[user.email] = profiles[index];
      });

      // Convert registered users to DirectoryContact format
      const userContacts: DirectoryContact[] = allUsers.map((user) => {
        const profileData = profileMap[user.email];

        return {
          id: user.email,
          type: 'user' as const,
          firstName: profileData?.firstName || user.email.split('@')[0],
          lastName: profileData?.lastName || '',
          email: user.email,
          position: profileData?.position || '',
          phone: profileData?.phone,
          officePhone: profileData?.officePhone,
          category: profileData?.category,
          photo: profileData?.photo,
          department: profileData?.department,
          bio: profileData?.bio,
          userEmail: user.email,
        };
      });

      // Combine with external contacts
      const externalContactsData: DirectoryContact[] = externalContacts.map((contact) => ({
        id: contact.id,
        type: 'external' as const,
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email || '',
        position: contact.position,
        phone: contact.phone,
        officePhone: contact.officePhone,
        category: contact.category,
        photo: undefined,
        department: undefined,
        bio: undefined,
        userEmail: undefined,
      }));

      let data: DirectoryContact[] = [...userContacts, ...externalContactsData];

      // Apply filters client-side
      if (filters?.category) {
        data = data.filter((c) => c.category === filters.category);
      }
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        data = data.filter(
          (c) =>
            c.firstName.toLowerCase().includes(searchLower) ||
            c.lastName.toLowerCase().includes(searchLower) ||
            c.email.toLowerCase().includes(searchLower) ||
            c.position.toLowerCase().includes(searchLower)
        );
      }

      setContacts(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch contacts');
      setError(error);
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  }, [allUsers, externalContacts, fetchUserProfile]);

  /**
   * Fetch available categories for filtering
   */
  const fetchCategories = useCallback(async () => {
    try {
      let data;
      if (DEV_MODE) {
        data = getMockCategories();
      } else {
        // Get categories from contacts or use defaults
        data = ['LML Lift Consultants', 'Client', 'Contractor'];
      }
      setCategories(data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }, []);

  /**
   * Get specific contact
   */
  const getContact = useCallback(async (id: string): Promise<DirectoryContact | null> => {
    try {
      if (DEV_MODE) {
        // Find in mock data
        return contacts.find((c) => c.id === id) || null;
      }
      return await contactsApi.getContact(id);
    } catch (err) {
      console.error('Error fetching contact:', err);
      return null;
    }
  }, [contacts]);

  /**
   * Create new external contact (admin/consultant only)
   */
  const createContact = useCallback(async (contact: Omit<ExternalContact, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (DEV_MODE) {
        // Mock create - just update local state
        const newContact: DirectoryContact = {
          id: `ext-${Date.now()}`,
          type: 'external',
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email || '',
          position: contact.position,
          phone: contact.phone,
          officePhone: contact.officePhone,
          category: contact.category,
        };
        setContacts([...contacts, newContact]);
        return newContact;
      }
      const result = await contactsApi.createContact(contact);
      // Refresh contacts list
      await fetchContacts();
      return result;
    } catch (err) {
      console.error('Error creating contact:', err);
      throw err;
    }
  }, [contacts, fetchContacts]);

  /**
   * Update external contact (admin/consultant only)
   */
  const updateContact = useCallback(
    async (id: string, updates: Partial<ExternalContact>) => {
      try {
        if (DEV_MODE) {
          // Mock update - just update local state
          const index = contacts.findIndex((c) => c.id === id);
          if (index >= 0) {
            const updated = { ...contacts[index], ...updates };
            const newContacts = [...contacts];
            newContacts[index] = updated;
            setContacts(newContacts);
            return updated;
          }
          throw new Error('Contact not found');
        }
        const result = await contactsApi.updateContact(id, updates);
        // Refresh contacts list
        await fetchContacts();
        return result;
      } catch (err) {
        console.error('Error updating contact:', err);
        throw err;
      }
    },
    [contacts, fetchContacts]
  );

  /**
   * Delete external contact (admin/consultant only)
   */
  const deleteContact = useCallback(
    async (id: string) => {
      try {
        if (DEV_MODE) {
          // Mock delete - just update local state
          setContacts(contacts.filter((c) => c.id !== id));
          return;
        }
        await contactsApi.deleteContact(id);
        // Refresh contacts list
        await fetchContacts();
      } catch (err) {
        console.error('Error deleting contact:', err);
        throw err;
      }
    },
    [contacts, fetchContacts]
  );

  /**
   * Search contacts
   */
  const searchContacts = useCallback(
    (query: string) => {
      if (!query) {
        return contacts;
      }
      const lowerQuery = query.toLowerCase();
      return contacts.filter(
        (c) =>
          c.firstName.toLowerCase().includes(lowerQuery) ||
          c.lastName.toLowerCase().includes(lowerQuery) ||
          c.email.toLowerCase().includes(lowerQuery) ||
          c.position.toLowerCase().includes(lowerQuery)
      );
    },
    [contacts]
  );

  /**
   * Get contacts by category
   */
  const getContactsByCategory = useCallback(
    (category: string) => {
      return contacts.filter((c) => c.category === category);
    },
    [contacts]
  );

  /**
   * Get user contacts only
   */
  const getUserContacts = useCallback(() => {
    return contacts.filter((c) => c.type === 'user');
  }, [contacts]);

  /**
   * Get external contacts only
   */
  const getExternalContacts = useCallback(() => {
    return contacts.filter((c) => c.type === 'external');
  }, [contacts]);

  /**
   * Refresh contacts to get latest data (useful after profile updates)
   */
  const refreshContacts = useCallback(() => {
    return fetchContacts();
  }, [fetchContacts]);

  return {
    contacts,
    loading,
    error,
    categories,
    fetchContacts,
    fetchCategories,
    getContact,
    createContact,
    updateContact,
    deleteContact,
    searchContacts,
    getContactsByCategory,
    getUserContacts,
    getExternalContacts,
    refreshContacts,
  };
}
