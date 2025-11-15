/**
 * Type definitions for all data models in the application
 * These represent the structure of Sites, Projects, Stages, Notes, and Contacts
 *
 * Hierarchy: Site -> Project -> ProjectStage -> ProjectFile
 *                          -> ProjectNote
 *                          -> Contacts (assigned users/external contacts)
 */

/**
 * Project State - Australian states where projects are located
 */
export type ProjectState = 'Victoria' | 'NSW' | 'South Australia' | 'Queensland';

/**
 * Project Status - Current status of a project
 */
export type ProjectStatus = 'Active' | 'On Hold' | 'Completed' | 'Archived';

/**
 * Site Status - Status of a site/location
 */
export type SiteStatus = 'Active' | 'Completed';

/**
 * Project Stage Status - Status of a project stage
 */
export type ProjectStageStatus = 'Not Started' | 'In Progress' | 'Ready for Invoice' | 'Complete';

/**
 * Project Stage Names - Fixed 5 stages for all projects
 */
export type ProjectStageName =
  | 'Feasibility'
  | 'Technical Specification'
  | 'Tender'
  | 'Contract Draft'
  | 'Project Management';

/**
 * Unit/Property - A unit or property within a site
 * Tracks individual floors, units, or locations within a building
 */
export interface Unit {
  id: string;
  name: string; // Unit identifier (e.g., "Unit 1A", "Floor 3", "Level 5")
  description?: string; // Unit description
  location?: string; // Location within building (e.g., "North Wing")
  count?: number; // Count if multiple units (e.g., 5 units)
  siteName: string; // Links to Site via building name
  createdAt: string; // ISO date string
  updatedAt?: string; // ISO date string
}

/**
 * Project File - File attached to a project stage
 * Files are organized by stage, not at project root
 */
export interface ProjectFile {
  id: string;
  name: string;
  url?: string; // For uploaded files (Data URL or Blob URL)
  sharePointUrl?: string; // For SharePoint live documents
  documentType: 'sharepoint' | 'uploaded' | 'external_link';
  stageId: string; // Links to ProjectStage
  projectCode: string; // Links to Project
  dateUploaded: string; // ISO date string
  fileSize?: string; // In bytes or formatted string
  fileType?: string; // MIME type
  uploadedBy: string; // User email
  uploadedByName?: string; // Display name
  description?: string; // Optional file description
  isFolder?: boolean; // For folder structure support
  parentId?: string; // For hierarchical folders
}

/**
 * Project Stage - A stage within a project
 * There are always 5 predefined stages per project
 */
export interface ProjectStage {
  id: string;
  name: ProjectStageName;
  projectCode: string; // Links to Project
  files: ProjectFile[]; // Files specific to this stage
  order: number; // Display order (1-5)
  description?: string; // Stage description
  status: ProjectStageStatus; // Status of this stage
  createdAt: string; // ISO date string
  updatedAt?: string; // ISO date string
}

/**
 * Project Note - A comment or note on a project
 * Supports markdown/HTML and includes historical timeline
 */
export interface ProjectNote {
  id: string;
  projectCode: string; // Links to Project
  content: string; // Note/comment text (supports markdown/HTML)
  author: string; // User email
  authorName?: string; // Display name
  createdAt: string; // ISO date string
  updatedAt?: string; // ISO date string
  status?: string; // Project status at time of note
  isSystemNote?: boolean; // Auto-generated vs user-created
}

/**
 * Project - A consulting project within a site
 * Format: {StatePrefix}{4-digit number}
 * Examples: PV1296 (Victoria), PN2001 (NSW), PSA0045 (SA), PQ3012 (Queensland)
 */
export interface Project {
  projectCode: string; // Unique state-based code (PVXXXX, PNXXXX, PSAXXXX, PQXXXX)
  building: string; // Site name (links to Site via building name)
  description?: string; // Rich text project description
  status: ProjectStatus; // Current project status
  state: ProjectState; // Australian state
  stages: ProjectStage[]; // Always 5 predefined stages per project
  notes: ProjectNote[]; // Historical comments/notes
  contacts?: string[]; // Assigned contact emails (users or external)
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  createdBy?: string; // User email who created the project
}

/**
 * Site - A consulting site location
 */
export interface Site {
  building: string; // Site identifier/name
  address?: string;
  state?: ProjectState; // Australian state
  city?: string;
  country?: string;
  description?: string; // Rich text site information
  status?: SiteStatus; // Site status (Active/Completed)
  units?: Unit[]; // Units/properties within this site
  projects: Project[]; // Projects at this site
  contacts?: string[]; // Assigned contact emails (users or external)
  createdAt?: string; // ISO date string
  updatedAt?: string; // ISO date string
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
 * Sites -> Projects -> ProjectStages -> ProjectFiles
 *               -> ProjectNotes
 *               -> Contacts
 */
export interface DataHierarchy {
  sites: Site[];
  projects: Project[];
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

