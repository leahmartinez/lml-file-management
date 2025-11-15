/**
 * Type definitions for all data models in the application
 * These represent the structure of Sites, Projects, Assets, and Contacts
 */

/**
 * Asset Type - represents individual elevators, escalators, moving walkways
 */
export type AssetType = 'Elevator' | 'Escalator' | 'Moving Walkway';
export type AssetStatus = 'Active' | 'Maintenance' | 'Offline' | 'Operational' | 'Warranty Active';
export type Contractor = 'TKE' | 'KONE' | 'Schindler' | 'Otis';

/**
 * Asset - Individual unit (elevator, escalator, etc.)
 */
export interface Asset {
  id: string;
  name?: string;
  nickname?: string;
  type: AssetType;
  status: AssetStatus;
  building: string; // Site name
  projectCode?: string; // Links to Project
  floor?: string;
  contractor: Contractor;
  lastService?: string;
  nextMaintenance?: string;
  installYear?: number | string;
  warrantyStatus?: 'Active' | 'Expired';
  uptime?: string | number;
  avgResponseTime?: string | number;
  timeToRepair?: string | number;
  cost?: string | number;
  serviceTickets?: string; // Comma-separated
  fileName?: string;
  fileUrl?: string;
  fileDateUploaded?: string;
  fileSize?: string;
  // Additional fields that may exist in CSV/API
  [key: string]: any;
}

/**
 * Project File - File attached to a project
 */
export interface ProjectFile {
  id?: string;
  name: string;
  url: string; // OneDrive link or uploaded file URL
  dateUploaded?: string;
  fileSize?: string;
  fileType?: string;
  uploadedBy?: string;
  source?: 'onedrive' | 'manual'; // How the file was added
}

/**
 * Project Stage - A stage within a project
 */
export interface ProjectStage {
  stage: string;
  description?: string;
}

/**
 * Project - A project within a site (e.g., "3 Elevator Upgrade")
 * Each project has a unique PWXXX code
 */
export interface Project {
  projectCode: string; // Unique PWXXX code
  building: string; // Site name (links to Site via building name)
  description?: string; // Project description
  stages?: ProjectStage[]; // Multiple stages per project
  assets?: Asset[]; // Assets associated with this project
  files?: ProjectFile[]; // Files attached to this project (manually uploaded)
}

/**
 * Site - A building/location (e.g., "Tower A")
 */
export interface Site {
  building: string; // Site identifier/name
  address?: string;
  state?: string;
  city?: string;
  country?: string;
  projects?: Project[]; // Projects at this site
  assets?: Asset[]; // All assets at this site
}

/**
 * User Profile - User's profile information (extends user account)
 * Users can populate and edit their own profile information
 */
export interface UserProfile {
  email: string; // Links to user account (primary key)
  firstName: string;
  lastName: string;
  position: string;
  phone?: string;
  officePhone?: string;
  department?: string;
  photo?: string; // Profile photo URL/data
  bio?: string;
  category?: 'LML Lift Consultants' | 'Client' | 'Contractor'; // Contact category
  sites?: string[]; // Sites assigned to user
  createdAt: string;
  updatedAt: string;
}

/**
 * External Contact - Manually added contact (not linked to user account)
 * Added by admins/consultants for people without user accounts
 */
export interface ExternalContact {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  company?: string;
  email?: string;
  phone?: string;
  officePhone?: string;
  category?: 'LML Lift Consultants' | 'Client' | 'Contractor'; // Contact category
  createdBy: string; // Email of admin/consultant who added
  createdAt: string;
  updatedAt: string;
}

/**
 * Directory Contact - Combined contact for display
 * Represents either a user profile or external contact in the directory
 */
export interface DirectoryContact {
  id: string; // email for users, id for external contacts
  type: 'user' | 'external';
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  phone?: string;
  officePhone?: string;
  category?: 'LML Lift Consultants' | 'Client' | 'Contractor'; // Contact category
  photo?: string;
  department?: string;
  bio?: string;
  userEmail?: string; // Only for type 'user'
}

/**
 * Contact - Legacy contact information (for backward compatibility)
 * Consider migrating to UserProfile or ExternalContact
 */
export interface Contact {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  company?: string;
  site?: string; // Associated site
  [key: string]: any;
}

/**
 * Data structure representing the full hierarchy
 * Sites -> Projects -> Assets
 */
export interface DataHierarchy {
  sites: Site[];
  projects: Project[];
  assets: Asset[];
  contacts: Contact[];
}

/**
 * Data source configuration
 */
export type DataSourceType = 'csv' | 'api';

export interface DataSourceConfig {
  type: DataSourceType;
  baseUrl?: string; // For API
  endpoints?: {
    sites?: string;
    projects?: string;
    assets?: string;
    contacts?: string;
  };
  csvPaths?: {
    sites?: string;
    projects?: string;
    assets?: string;
    contacts?: string;
  };
}

/**
 * Data fetching result with loading and error states
 */
export interface DataFetchResult<T> {
  data: T;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

