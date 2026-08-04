/**
 * Type definitions for all data models in the application
 * These represent the structure of Sites, Projects, Stages, Notes, and Contacts
 *
 * Hierarchy: Site -> Project -> ProjectStage -> ProjectFile
 *                          -> ProjectNote
 *                          -> Contacts (assigned users/external contacts)
 */

/**
 * Project State - Australian states and territories where projects are located
 */
export type ProjectState =
  | 'Victoria'
  | 'NSW'
  | 'South Australia'
  | 'Queensland'
  | 'Western Australia'
  | 'Northern Territory'
  | 'Tasmania'
  | 'ACT'
  | 'New Zealand';

/**
 * Project Status - Current status of a project
 */
export type ProjectStatus = 'Active' | 'On Hold' | 'Completed' | 'Archived';

/**
 * Proposal Status - Current status of a proposal
 */
export type ProposalStatus = 'Draft' | 'Sent' | 'Under Review' | 'Accepted' | 'Part Acceptance' | 'Rejected' | 'Expired';

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
 * Invoice Status - Tracks invoicing state of a project
 */
export type InvoiceStatus = 'Not Ready' | 'Ready for Invoice' | 'Invoiced';

/**
 * Project Type / JW Summary - Type of work being performed
 */
export type ProjectType = 'Upgrade' | 'MACA' | 'CMA' | 'Desktop Review' | 'Other';

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
 * Supports uploaded files, SharePoint files, and external links
 */
export interface ProjectFile {
  id: string;
  name: string;
  url?: string; // For uploaded files (Data URL or Blob URL)
  sharePointUrl?: string; // For SharePoint live documents - web URL
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

  // SharePoint specific fields
  sharePointItemId?: string; // Graph API item ID for SharePoint files
  sharePointDriveId?: string; // Drive ID for Graph API operations
  lastModified?: string; // SharePoint last modified timestamp
  lastModifiedBy?: string; // SharePoint user who last modified
  webUrl?: string; // Direct link to open in SharePoint
  embedUrl?: string; // Embed URL for iframe viewer
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
  price?: number; // Price/cost for this stage
  consultantEmails?: string[]; // Consultant emails assigned to this stage
  projectType?: ProjectType; // JW Summary - stage-level type (overrides project type)
  customProjectType?: string; // Custom type when projectType === 'Other'
  plannedSiteVisitDate?: string; // ISO date string - when consultant plans to visit site
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
 * PO File - Purchase Order file attached to a project
 */
export interface POFile {
  id: string;
  name: string; // Original file name
  url?: string; // Data URL or Blob URL for uploaded files
  uploadedAt: string; // ISO date string
  uploadedBy: string; // User email who uploaded
  fileSize?: string; // File size in bytes or formatted string
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
  proposalId?: string; // Link to the proposal that created this project
  poFiles?: POFile[]; // Purchase Order files attached to this project
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  createdBy?: string; // User email who created the project
  orderDate?: string; // ISO date string - when the order was placed
  invoiceStatus?: InvoiceStatus; // Track invoice state: Not Ready | Ready for Invoice | Invoiced
  invoicedDate?: string; // ISO date string - when marked as invoiced
  projectType?: ProjectType; // JW Summary - type of work: Upgrade | MACA | CMA | Desktop Review | Other
  customProjectType?: string; // Custom type when projectType === 'Other'
  projectValue?: number; // Total project value in dollars (ex GST) from proposal
  primaryClientEmail?: string; // Primary client contact email
  reportTemplatesFolderUrl?: string; // SharePoint folder URL for report templates
}

/**
 * Site - A consulting site location
 */
export interface Site {
  siteId?: string;
  building: string; // Site identifier/name
  address?: string;
  state?: ProjectState; // Australian state
  city?: string;
  postcode?: string;
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
  businessId?: string; // Links to Business entity (optional, for new hierarchical view)
  email?: string;
  phone?: string;
  officePhone?: string;
  category?: 'LML Lift Consultants' | 'Client' | 'Contractor'; // Contact category
  photo?: string; // Profile photo URL/data
  createdBy: string; // Email of admin/consultant who added
  createdAt: string;
  updatedAt: string;
}

/**
 * Business - A company/organization in the system
 * Businesses are editable entities that external contacts are linked to
 */
export interface Business {
  id: string; // Unique ID (e.g., 'biz_1234567890')
  name: string; // Business name (required)
  description?: string; // Business description
  address?: string; // Street address
  city?: string; // City
  postcode?: string; // Postal code
  state?: ProjectState; // Australian state
  website?: string; // Business website URL
  phone?: string; // Main business phone
  email?: string; // Business contact email
  category?: string; // Business category (e.g., "Supplier", "Client", "Contractor")
  logo?: string; // Business logo URL
  createdBy: string; // User email who created
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
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
  businessId?: string; // Links to Business entity (for external contacts)
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

/**
 * Proposal Template - Reusable template for creating proposals
 * Allows admins to pre-define stages and structure for common proposal types
 */
export interface ProposalTemplate {
  id: string;
  name: string; // Template name (e.g., "Standard Lift Consultancy", "Feasibility Study")
  description: string; // Template description
  stages: Array<{
    name: string; // Stage name
    price?: number; // Optional default price for this stage
  }>;
  createdBy: string; // User email who created template
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

/**
 * Job Type - Type of job/service for a proposal
 * Defines categories of work offered to clients
 */
export interface JobType {
  id: string;
  name: string; // Job type name (e.g., "Lift Upgrade", "Maintenance Contract")
  description?: string; // Job type description
  isActive: boolean; // Whether this job type is available for selection
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

/**
 * Proposal - A proposal for a potential new project
 * Tracks proposals sent to clients that may convert to projects
 */
export interface Proposal {
  id: string;
  proposalNumber: string; // Unique proposal number (e.g., PROP-2024-001)
  clientName: string;
  clientContact?: string; // Contact email or name
  siteName: string; // Proposed site name
  siteAddress?: string;
  state?: ProjectState;
  city?: string;
  postcode?: string;
  description: string; // Proposal description/scope (short summary)
  generalDescription?: string; // General description (rich text/HTML)
  jobTypeId?: string; // Job type ID (links to job type)
  jobTypeName?: string; // Job type name (denormalized)
  estimatedValue?: number; // Total estimated value (calculated from stage pricing)
  status: ProposalStatus;
  stages?: ProjectStage[]; // Proposed project stages with individual pricing
  acceptedStageNames?: string[]; // Names of stages that have been accepted (for Part Acceptance)
  sentDate?: string; // ISO date when proposal was sent
  expiryDate?: string; // ISO date when proposal expires
  acceptedDate?: string; // ISO date when accepted (fully or partially)
  rejectedDate?: string; // ISO date when rejected
  rejectionReason?: string;
  notes?: string; // Additional notes
  attachments?: string[]; // File URLs or names
  sharePointFolderUrl?: string; // SharePoint folder URL for proposal documents
  createdBy: string; // User email who created proposal
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  projectCode?: string; // Set when converted to project (fully or partially)
}

/**
 * Alert Type - Type of alert/notification
 */
export type AlertType = 'assignment' | 'mention' | 'stage_update' | 'project_update' | 'general';

/**
 * Alert - System notification for users
 * Replaces the old localStorage-based UserNotification system
 */
export interface Alert {
  id: string; // Unique alert ID
  type: AlertType; // Type of alert
  title: string; // Alert title/heading
  message: string; // Alert message content
  entityType?: string; // Type of entity referenced (e.g., 'project', 'stage')
  entityId?: string; // ID of the referenced entity
  projectId?: string; // Project ID (for navigation)
  siteId?: string; // Site ID (for navigation)
  isRead: boolean; // Read status
  createdAt: string; // ISO date string
}

