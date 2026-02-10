/**
 * Custom hook for contact operations
 * Handles getting, creating, updating, and deleting contacts
 * Fetches registered users from auth context and combines with external contacts
 */

import { useState, useCallback, useEffect } from 'react';
import { DirectoryContact, ExternalContact, UserProfile } from '@/types/data';
import { contactsApi, profileApi } from '@/services/apiService';
import { getMockCategories, getMockProfileByEmail, getExternalContacts as getExternalContactsFromStorage, addExternalContact as addExternalContactToCache, updateExternalContact as updateExternalContactInCache, deleteExternalContact as deleteExternalContactFromCache } from '@/utils/mockContactData';
import { useAuth } from './useAuth';

const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true' || import.meta.env.DEV;

console.log('[useContacts] USE_MOCK_DATA:', USE_MOCK_DATA);
console.log('[useContacts] import.meta.env.DEV:', import.meta.env.DEV);
console.log('[useContacts] import.meta.env.VITE_USE_MOCK_DATA:', import.meta.env.VITE_USE_MOCK_DATA);

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

  // Load external contacts from localStorage on mount
  useEffect(() => {
    if (USE_MOCK_DATA) {
      const loadedExternalContacts = getExternalContactsFromStorage();
      console.log('[useContacts] Loaded external contacts from localStorage:', loadedExternalContacts.length);
      setExternalContacts(loadedExternalContacts);
    }
  }, []);

  /**
   * Fetch a user's profile by email
   */
  const fetchUserProfile = useCallback(async (email: string): Promise<UserProfile | null> => {
    try {
      if (USE_MOCK_DATA) {
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
    console.log('[useContacts] fetchContacts called with allUsers:', allUsers.length);
    setLoading(true);
    setError(null);
    try {
      // Fetch profile data for all users
      const profilesPromises = allUsers.map((user) => fetchUserProfile(user.email));
      const profiles = await Promise.all(profilesPromises);
      console.log('[useContacts] Fetched profiles for', profiles.length, 'users');

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

      // Load external contacts (localStorage in mock mode, API in production)
      let freshExternalContacts: ExternalContact[] = [];
      if (USE_MOCK_DATA) {
        freshExternalContacts = getExternalContactsFromStorage();
      } else {
        const apiContacts = await contactsApi.getContacts();
        freshExternalContacts = apiContacts as ExternalContact[];
        setExternalContacts(freshExternalContacts);
      }
      console.log('[useContacts] Fresh external contacts:', freshExternalContacts.length);

      // Combine with external contacts - VALIDATE emails!
      const externalContactsData: DirectoryContact[] = freshExternalContacts
        .filter((contact) => {
          // Validate email exists and is not empty
          if (!contact.email || contact.email.trim().length === 0) {
            console.warn('[useContacts] Skipping external contact without email:', contact.id, contact.firstName, contact.lastName);
            return false;
          }
          return true;
        })
        .map((contact) => ({
          id: contact.id,
          type: 'external' as const,
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email!, // Non-null assertion safe after filter above
          position: contact.position,
          phone: contact.phone,
          officePhone: contact.officePhone,
          category: contact.category,
          businessId: contact.businessId,
          photo: contact.photo, // Include photo from external contact
          department: undefined,
          bio: undefined,
          userEmail: undefined,
        }));

      let data: DirectoryContact[] = [...userContacts, ...externalContactsData];
      console.log('[useContacts] Total contacts before filtering:', data.length);

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

      console.log('[useContacts] Setting contacts:', data.length);
      setContacts(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch contacts');
      setError(error);
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  }, [allUsers, fetchUserProfile]);

  /**
   * Fetch available categories for filtering
   */
  const fetchCategories = useCallback(async () => {
    try {
      let data;
      if (USE_MOCK_DATA) {
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
      if (USE_MOCK_DATA) {
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
      if (USE_MOCK_DATA) {
        // Add to localStorage cache
        const newExternalContact = addExternalContactToCache(contact);
        console.log('[useContacts] Created external contact:', newExternalContact);

        // Update local state
        setExternalContacts(prev => [...prev, newExternalContact]);

        // Refresh contacts to show the new external contact
        await fetchContacts();

        return newExternalContact;
      }
      const result = await contactsApi.createContact(contact);
      // Refresh contacts list
      await fetchContacts();
      return result;
    } catch (err) {
      console.error('Error creating contact:', err);
      throw err;
    }
  }, [fetchContacts]);

  /**
   * Update external contact (admin/consultant only)
   */
  const updateContact = useCallback(
    async (id: string, updates: Partial<ExternalContact>) => {
      try {
        if (USE_MOCK_DATA) {
          // Update in localStorage cache
          const updated = updateExternalContactInCache(id, updates);
          if (!updated) {
            throw new Error('Contact not found');
          }
          console.log('[useContacts] Updated external contact:', updated);

          // Update local state
          setExternalContacts(prev => prev.map(c => c.id === id ? updated : c));

          // Refresh contacts
          await fetchContacts();

          return updated;
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
    [fetchContacts]
  );

  /**
   * Delete external contact (admin/consultant only)
   */
  const deleteContact = useCallback(
    async (id: string) => {
      try {
        if (USE_MOCK_DATA) {
          // Delete from localStorage cache
          const deleted = deleteExternalContactFromCache(id);
          if (!deleted) {
            throw new Error('Contact not found');
          }
          console.log('[useContacts] Deleted external contact:', id);

          // Update local state
          setExternalContacts(prev => prev.filter(c => c.id !== id));

          // Refresh contacts
          await fetchContacts();

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
    [fetchContacts]
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
