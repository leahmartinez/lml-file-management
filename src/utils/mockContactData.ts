/**
 * Mock contact and profile data for dev testing
 * Uses a cache-based system where profiles start blank and are populated by user edits
 */

import { UserProfile, ExternalContact, DirectoryContact } from '@/types/data';

/**
 * Mock external contacts
 * These are manually added by admins for people without accounts
 * Starting empty - admins can add contacts via the "Add External Contact" button
 */
export const mockExternalContacts: ExternalContact[] = [];

/**
 * Cache for profile updates in dev mode
 * Uses localStorage to persist profile changes across logout/login
 */
const PROFILE_CACHE_KEY = 'liftwatch_profile_cache';

function getProfileCache(): { [email: string]: Partial<UserProfile> } {
  try {
    const cached = localStorage.getItem(PROFILE_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch (err) {
    console.error('[mockContactData] Error reading profile cache from localStorage:', err);
    return {};
  }
}

function saveProfileCache(cache: { [email: string]: Partial<UserProfile> }) {
  try {
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cache));
  } catch (err) {
    console.error('[mockContactData] Error saving profile cache to localStorage:', err);
  }
}

/**
 * Create a blank profile for a user
 * All fields start empty and are populated by user edits
 */
function createBlankProfile(email: string): UserProfile {
  return {
    email,
    firstName: '',
    lastName: '',
    position: '',
    phone: '',
    department: '',
    category: 'LML Lift Consultants',
    bio: '',
    sites: [],
    photo: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Get mock profile by email
 * Returns cached profile if it exists, otherwise returns a blank profile
 * Allows users to start with empty profiles and fill them in as needed
 */
export function getMockProfileByEmail(email: string): UserProfile | undefined {
  // Check if we have cached updates for this user
  const cache = getProfileCache();
  const cachedUpdates = cache[email];
  if (cachedUpdates) {
    // Return cached data merged with a blank base
    return {
      ...createBlankProfile(email),
      ...cachedUpdates,
    };
  }

  // Return a blank profile that user can fill in
  return createBlankProfile(email);
}

/**
 * Update mock profile in cache
 * Used when user edits their profile in dev mode
 */
export function updateMockProfile(email: string, updates: Partial<UserProfile>): UserProfile | undefined {
  // Get current cache
  const cache = getProfileCache();

  // Update the cache
  cache[email] = {
    ...cache[email],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  // Persist to localStorage
  saveProfileCache(cache);

  // Return the updated profile
  return {
    ...createBlankProfile(email),
    ...cache[email],
  };
}

/**
 * Get all unique categories from contacts
 */
export function getMockCategories(): string[] {
  return ['LML Lift Consultants', 'Client', 'Contractor'];
}
