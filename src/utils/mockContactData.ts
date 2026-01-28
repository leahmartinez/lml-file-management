/**
 * Mock contact and profile data for dev testing
 * Uses a cache-based system where profiles start blank and are populated by user edits
 */

import { UserProfile, ExternalContact, DirectoryContact, Business } from '@/types/data';

/**
 * Cache for external contacts in dev mode
 * Uses localStorage to persist external contacts across logout/login
 */
const EXTERNAL_CONTACTS_CACHE_KEY = 'lml_external_contacts';

function getExternalContactsCache(): ExternalContact[] {
  try {
    console.log('[mockContactData] getExternalContactsCache - key:', EXTERNAL_CONTACTS_CACHE_KEY);
    const cached = localStorage.getItem(EXTERNAL_CONTACTS_CACHE_KEY);
    console.log('[mockContactData] getExternalContactsCache - raw cached value:', cached);
    const parsed = cached ? JSON.parse(cached) : [];
    console.log('[mockContactData] getExternalContactsCache - parsed value:', parsed);
    return parsed;
  } catch (err) {
    console.error('[mockContactData] Error reading external contacts cache from localStorage:', err);
    return [];
  }
}

function saveExternalContactsCache(contacts: ExternalContact[]) {
  try {
    console.log('[mockContactData] saveExternalContactsCache - saving contacts:', contacts);
    console.log('[mockContactData] saveExternalContactsCache - key:', EXTERNAL_CONTACTS_CACHE_KEY);
    const stringified = JSON.stringify(contacts);
    console.log('[mockContactData] saveExternalContactsCache - stringified:', stringified);
    localStorage.setItem(EXTERNAL_CONTACTS_CACHE_KEY, stringified);

    // Verify it was saved
    const verify = localStorage.getItem(EXTERNAL_CONTACTS_CACHE_KEY);
    console.log('[mockContactData] saveExternalContactsCache - verification read:', verify);
  } catch (err) {
    console.error('[mockContactData] Error saving external contacts cache to localStorage:', err);
  }
}

/**
 * Mock external contacts
 * These are manually added by admins for people without accounts
 * Loaded from localStorage cache
 */
export function getExternalContacts(): ExternalContact[] {
  const contacts = getExternalContactsCache();
  console.log('[mockContactData] getExternalContacts - Returning contacts:', contacts.length);
  return contacts;
}

export function addExternalContact(contact: Omit<ExternalContact, 'id' | 'createdAt' | 'updatedAt'>): ExternalContact {
  const newContact: ExternalContact = {
    ...contact,
    createdBy: contact.createdBy || 'system', // Ensure createdBy is set
    id: `ext_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const contacts = getExternalContactsCache();
  console.log('[mockContactData] addExternalContact - Current contacts in cache:', contacts.length);
  contacts.push(newContact);
  saveExternalContactsCache(contacts);
  console.log('[mockContactData] addExternalContact - Saved contacts to cache:', contacts.length);

  // Verify it was saved
  const verify = getExternalContactsCache();
  console.log('[mockContactData] addExternalContact - Verified contacts in cache after save:', verify.length);

  return newContact;
}

export function updateExternalContact(id: string, updates: Partial<ExternalContact>): ExternalContact | null {
  const contacts = getExternalContactsCache();
  const index = contacts.findIndex(c => c.id === id);

  if (index === -1) return null;

  const updated = {
    ...contacts[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  contacts[index] = updated;
  saveExternalContactsCache(contacts);

  return updated;
}

export function deleteExternalContact(id: string): boolean {
  const contacts = getExternalContactsCache();
  const filtered = contacts.filter(c => c.id !== id);

  if (filtered.length === contacts.length) return false;

  saveExternalContactsCache(filtered);
  return true;
}

/**
 * Cache for profile updates in dev mode
 * Uses localStorage to persist profile changes across logout/login
 */
const PROFILE_CACHE_KEY = 'lml_profile_cache';

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

/**
 * Cache for businesses in dev mode
 * Uses localStorage to persist businesses across logout/login
 */
const BUSINESSES_CACHE_KEY = 'lml_businesses';

function getBusinessesCache(): Business[] {
  try {
    console.log('[mockContactData] getBusinessesCache - key:', BUSINESSES_CACHE_KEY);
    const cached = localStorage.getItem(BUSINESSES_CACHE_KEY);
    const parsed = cached ? JSON.parse(cached) : [];
    console.log('[mockContactData] getBusinessesCache - parsed value:', parsed.length, 'businesses');
    return parsed;
  } catch (err) {
    console.error('[mockContactData] Error reading businesses cache from localStorage:', err);
    return [];
  }
}

function saveBusinessesCache(businesses: Business[]) {
  try {
    console.log('[mockContactData] saveBusinessesCache - saving:', businesses.length, 'businesses');
    localStorage.setItem(BUSINESSES_CACHE_KEY, JSON.stringify(businesses));
  } catch (err) {
    console.error('[mockContactData] Error saving businesses cache to localStorage:', err);
  }
}

/**
 * Get all businesses
 */
export function getBusinesses(): Business[] {
  const businesses = getBusinessesCache();
  console.log('[mockContactData] getBusinesses - Returning:', businesses.length, 'businesses');
  return businesses;
}

/**
 * Get a specific business by ID
 */
export function getBusinessById(id: string): Business | null {
  const businesses = getBusinessesCache();
  return businesses.find(b => b.id === id) || null;
}

/**
 * Add a new business
 */
export function addBusiness(business: Omit<Business, 'id' | 'createdAt' | 'updatedAt'>): Business {
  const newBusiness: Business = {
    ...business,
    id: `biz_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const businesses = getBusinessesCache();
  businesses.push(newBusiness);
  saveBusinessesCache(businesses);
  console.log('[mockContactData] addBusiness - Created business:', newBusiness.id);

  return newBusiness;
}

/**
 * Update an existing business
 */
export function updateBusiness(id: string, updates: Partial<Business>): Business | null {
  const businesses = getBusinessesCache();
  const index = businesses.findIndex(b => b.id === id);

  if (index === -1) return null;

  const updated = {
    ...businesses[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  businesses[index] = updated;
  saveBusinessesCache(businesses);
  console.log('[mockContactData] updateBusiness - Updated business:', id);

  return updated;
}

/**
 * Delete a business
 */
export function deleteBusiness(id: string): boolean {
  const businesses = getBusinessesCache();
  const filtered = businesses.filter(b => b.id !== id);

  if (filtered.length === businesses.length) {
    console.log('[mockContactData] deleteBusiness - Business not found:', id);
    return false;
  }

  saveBusinessesCache(filtered);
  console.log('[mockContactData] deleteBusiness - Deleted business:', id);
  return true;
}

/**
 * Migration function: Convert existing external contacts by company field to business hierarchy
 * Groups contacts by company and creates business records for each unique company
 */
export function migrateExternalContactsToBusiness(): { created: number; migrated: number } {
  const contacts = getExternalContactsCache();
  const businesses = getBusinessesCache();

  // Group contacts by company field
  const companiesMap = new Map<string, ExternalContact[]>();
  contacts.forEach(contact => {
    if (contact.company) {
      if (!companiesMap.has(contact.company)) {
        companiesMap.set(contact.company, []);
      }
      companiesMap.get(contact.company)!.push(contact);
    }
  });

  let created = 0;
  let migrated = 0;

  // Create business for each unique company
  const baseTimestamp = Date.now();
  companiesMap.forEach((contactsList, companyName, index) => {
    const existingBusiness = businesses.find(b => b.name.toLowerCase() === companyName.toLowerCase());

    const businessId = existingBusiness?.id || `biz_${baseTimestamp}_${created}_${Math.random().toString(36).substr(2, 9)}`;

    if (!existingBusiness) {
      const newBusiness: Business = {
        id: businessId,
        name: companyName,
        createdBy: 'system-migration',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      businesses.push(newBusiness);
      created++;
    }

    // Link contacts to business
    contactsList.forEach(contact => {
      if (!contact.businessId) {
        contact.businessId = businessId;
        migrated++;
      }
    });
  });

  saveBusinessesCache(businesses);
  saveExternalContactsCache(contacts);

  console.log('[mockContactData] migrateExternalContactsToBusiness - Created:', created, 'businesses, Migrated:', migrated, 'contacts');

  return { created, migrated };
}
