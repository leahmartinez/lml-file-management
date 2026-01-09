/**
 * Custom hook for business operations
 * Handles getting, creating, updating, and deleting businesses
 * Manages business-to-contact relationships
 */

import { useState, useCallback, useEffect } from 'react';
import { Business, ExternalContact } from '@/types/data';
import {
  getBusinesses as getBusinessesFromStorage,
  getBusinessById as getBusinessByIdFromStorage,
  addBusiness as addBusinessToCache,
  updateBusiness as updateBusinessInCache,
  deleteBusiness as deleteBusinessFromCache,
} from '@/utils/mockContactData';
import { getExternalContacts as getExternalContactsFromStorage } from '@/utils/mockContactData';

const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true' || import.meta.env.DEV;

console.log('[useBusiness] USE_MOCK_DATA:', USE_MOCK_DATA);

export function useBusiness() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch all businesses from storage
   */
  const fetchBusinesses = useCallback(async () => {
    console.log('[useBusiness] fetchBusinesses called');
    setLoading(true);
    setError(null);
    try {
      if (USE_MOCK_DATA) {
        const loadedBusinesses = getBusinessesFromStorage();
        console.log('[useBusiness] Loaded businesses from storage:', loadedBusinesses.length);
        setBusinesses(loadedBusinesses);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch businesses');
      console.error('[useBusiness] Error fetching businesses:', error);
      setError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Load businesses on mount
   */
  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  /**
   * Get a specific business by ID
   */
  const getBusinessById = useCallback((id: string): Business | null => {
    return getBusinessByIdFromStorage(id);
  }, []);

  /**
   * Create a new business
   */
  const createBusiness = useCallback(
    async (business: Omit<Business, 'id' | 'createdAt' | 'updatedAt'>) => {
      console.log('[useBusiness] createBusiness called:', business.name);
      setError(null);
      try {
        if (USE_MOCK_DATA) {
          const newBusiness = addBusinessToCache(business);
          console.log('[useBusiness] Created business:', newBusiness.id);
          // Refresh the list
          await fetchBusinesses();
          return newBusiness;
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create business');
        console.error('[useBusiness] Error creating business:', error);
        setError(error);
        throw error;
      }
    },
    [fetchBusinesses]
  );

  /**
   * Update an existing business
   */
  const updateBusiness = useCallback(
    async (id: string, updates: Partial<Business>) => {
      console.log('[useBusiness] updateBusiness called:', id);
      setError(null);
      try {
        if (USE_MOCK_DATA) {
          const updated = updateBusinessInCache(id, updates);
          if (!updated) {
            throw new Error('Business not found');
          }
          console.log('[useBusiness] Updated business:', id);
          // Refresh the list
          await fetchBusinesses();
          return updated;
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update business');
        console.error('[useBusiness] Error updating business:', error);
        setError(error);
        throw error;
      }
    },
    [fetchBusinesses]
  );

  /**
   * Delete a business
   */
  const deleteBusiness = useCallback(
    async (id: string) => {
      console.log('[useBusiness] deleteBusiness called:', id);
      setError(null);
      try {
        if (USE_MOCK_DATA) {
          const success = deleteBusinessFromCache(id);
          if (!success) {
            throw new Error('Business not found');
          }
          console.log('[useBusiness] Deleted business:', id);
          // Refresh the list
          await fetchBusinesses();
          return true;
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to delete business');
        console.error('[useBusiness] Error deleting business:', error);
        setError(error);
        throw error;
      }
    },
    [fetchBusinesses]
  );

  /**
   * Get all contacts linked to a specific business
   */
  const getContactsByBusiness = useCallback((businessId: string): ExternalContact[] => {
    const contacts = getExternalContactsFromStorage();
    return contacts.filter(c => c.businessId === businessId);
  }, []);

  /**
   * Refresh businesses list
   */
  const refreshBusinesses = useCallback(async () => {
    console.log('[useBusiness] refreshBusinesses called');
    await fetchBusinesses();
  }, [fetchBusinesses]);

  return {
    businesses,
    loading,
    error,
    fetchBusinesses,
    getBusinessById,
    createBusiness,
    updateBusiness,
    deleteBusiness,
    getContactsByBusiness,
    refreshBusinesses,
  };
}
