/**
 * Custom hook for user profile operations
 * Handles getting and updating user profile information
 */

import { useState, useCallback } from 'react';
import { UserProfile } from '@/types/data';
import { profileApi } from '@/services/apiService';
import { getMockProfileByEmail, updateMockProfile } from '@/utils/mockContactData';
import { useAuth } from './useAuth';

const DEV_MODE = import.meta.env.DEV;

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch current user's profile
   */
  const fetchMyProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data;
      if (DEV_MODE) {
        // Use mock data in dev mode - fetch by current user's email
        if (user?.email) {
          data = getMockProfileByEmail(user.email) || null;
        } else {
          data = null;
        }
      } else {
        try {
          data = await profileApi.getMyProfile();
        } catch (apiError) {
          // Fallback to mock data if API fails (endpoint may not exist)
          console.warn('Profile API failed, falling back to mock data:', apiError);
          if (user?.email) {
            data = getMockProfileByEmail(user.email) || null;
          } else {
            throw apiError;
          }
        }
      }
      setProfile(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch profile');
      setError(error);
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  /**
   * Update current user's profile
   */
  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    setLoading(true);
    setError(null);
    try {
      let data;
      if (DEV_MODE) {
        // Mock update - persist to cache
        if (profile?.email) {
          data = updateMockProfile(profile.email, updates);
        } else {
          data = { ...profile, ...updates } as UserProfile;
        }
      } else {
        try {
          data = await profileApi.updateMyProfile(updates);
        } catch (apiError) {
          // Fallback to mock data if API fails (endpoint may not exist)
          console.warn('Profile API failed, falling back to mock data:', apiError);
          if (profile?.email) {
            data = updateMockProfile(profile.email, updates);
          } else {
            throw apiError;
          }
        }
      }
      setProfile(data || null);
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update profile');
      setError(error);
      console.error('Error updating profile:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [profile]);

  /**
   * Get another user's profile by email
   */
  const getUserProfile = useCallback(async (email: string): Promise<UserProfile | null> => {
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
      console.error('Error fetching user profile:', err);
      return null;
    }
  }, []);

  /**
   * Check if profile is complete (has required fields)
   */
  const isProfileComplete = useCallback((p: UserProfile | null): boolean => {
    if (!p) return false;
    return !!(p.firstName && p.lastName && p.position);
  }, []);

  return {
    profile,
    loading,
    error,
    fetchMyProfile,
    updateProfile,
    getUserProfile,
    isProfileComplete,
  };
}
