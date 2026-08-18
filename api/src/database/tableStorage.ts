/**
 * Azure Table Storage Helper
 * Database layer for user management
 * 
 * For local development, use localMockDb.ts instead
 */

import { TableClient, TableEntity } from "@azure/data-tables";
import * as localDb from "./localMockDb";
import { safeParseJsonArray } from "../utils/json";

// Check if running locally
const IS_LOCAL = !process.env.AZURE_STORAGE_CONNECTION_STRING || 
                 process.env.AZURE_STORAGE_CONNECTION_STRING === 'your-connection-string-here';

// Export local DB functions for local development
if (IS_LOCAL) {
  console.log('🔧 Running in LOCAL MODE - using in-memory database');
}

// User entity structure
export interface UserEntity extends TableEntity {
  partitionKey: string; // "USER"
  rowKey: string; // email
  email: string;
  passwordHash: string;
  role: 'admin' | 'user' | 'subconsultant' | 'consultant' | 'site_manager' | 'national_manager';
  sites: string; // JSON stringified array
  createdAt: string;
  updatedAt?: string;
  lastLogin?: string;
  createdBy?: string;
  // Profile fields
  firstName?: string;
  lastName?: string;
  position?: string;
  phone?: string;
  officePhone?: string;
  department?: string;
  photo?: string;
  bio?: string;
  category?: string;
  // Account status and verification
  accountStatus: 'pending' | 'active' | 'suspended'; // pending = awaiting admin approval
  emailVerified: boolean; // true if email has been verified
  emailVerificationToken?: string; // token for email verification
  emailVerificationExpiry?: string; // expiry time for verification token
  // Password reset
  passwordResetToken?: string; // token for password reset
  passwordResetExpiry?: string; // expiry time for reset token
  mustChangePassword?: boolean; // force change on next login
}

// Site entity structure
export interface SiteEntity extends TableEntity {
  partitionKey: string; // "SITE"
  rowKey: string; // siteId (unique identifier)
  siteId: string;
  building: string;
  address: string;
  city: string;
  state: string;
  postcode: string;
  createdAt: string;
  createdBy?: string;
  projectCodes: string; // JSON stringified array of project codes
  contactEmails?: string; // JSON stringified array of contact emails
}

// Project entity structure
export interface ProjectEntity extends TableEntity {
  partitionKey: string; // "PROJECT"
  rowKey: string; // projectCode
  projectCode: string;
  siteId: string; // Reference to SiteEntity
  building: string;
  state: string;
  status: string;
  invoiceStatus?: string;
  orderDate?: string;
  description?: string;
  projectType?: string;
  customProjectType?: string;
  reportTemplatesFolderUrl?: string; // SharePoint link to Report Templates folder
  createdAt: string;
  createdBy?: string;
  contactEmails?: string; // JSON stringified array of contact emails
}

// Stage entity structure
export interface StageEntity extends TableEntity {
  partitionKey: string; // projectCode (for efficient querying)
  rowKey: string; // stageId (unique identifier)
  stageId: string;
  projectCode: string; // Reference to ProjectEntity
  name: string;
  status: string;
  price?: number;
  description?: string;
  plannedSiteVisitDate?: string;
  consultantEmails?: string; // JSON stringified array of consultant emails
  createdAt: string;
  createdBy?: string;
}

// Initialize table clients
let usersTable: TableClient | null = null;
let sitesTable: TableClient | null = null;
let projectsTable: TableClient | null = null;
let stagesTable: TableClient | null = null;
let contactsTable: TableClient | null = null;
let businessesTable: TableClient | null = null;
let jobTypesTable: TableClient | null = null;
let proposalsTable: TableClient | null = null;

// Contact entity structure (external contacts)
export interface ContactEntity extends TableEntity {
  partitionKey: string; // "CONTACT"
  rowKey: string; // contact id
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  company?: string;
  businessId?: string;
  email?: string;
  phone?: string;
  officePhone?: string;
  category?: string;
  photo?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Business entity structure
export interface BusinessEntity extends TableEntity {
  partitionKey: string; // "BUSINESS"
  rowKey: string; // business id
  id: string;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  postcode?: string;
  state?: string;
  website?: string;
  phone?: string;
  email?: string;
  category?: string;
  logo?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Job Type entity structure
export interface JobTypeEntity extends TableEntity {
  partitionKey: string; // "jobTypes"
  rowKey: string; // UUID (e.g., "jobtype_1234567890123")
  name: string; // Display name (e.g., "MACA", "Upgrade")
  description: string; // Additional details about the job type
  isActive: boolean; // Soft delete flag - true = active, false = archived
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  createdBy: string; // User email who created this job type
}

// Proposal entity structure (for when backend storage is implemented)
export interface ProposalEntity extends TableEntity {
  partitionKey: string; // "PROPOSAL"
  rowKey: string; // proposal id (UUID)
  proposalNumber: string; // PROP-2024-001
  clientName: string;
  clientContact?: string;
  siteName: string;
  siteAddress?: string;
  state?: string;
  city?: string;
  postcode?: string;
  description: string;
  estimatedValue?: number;
  status: string; // Draft | Sent | Under Review | Accepted | Part Acceptance | Rejected | Expired
  stages?: string; // JSON stringified ProjectStage[]
  acceptedStageNames?: string; // JSON stringified string[]
  sentDate?: string;
  expiryDate?: string;
  acceptedDate?: string;
  rejectedDate?: string;
  rejectionReason?: string;
  notes?: string;
  attachments?: string; // JSON stringified string[]
  projectCode?: string;
  // New fields added April 2026
  jobTypeId: string; // References JobTypes rowKey
  jobTypeName: string; // Denormalized from JobTypes
  generalDescription: string; // Rich text/HTML
  sharePointFolderUrl: string; // SharePoint link to Proposals Templates folder
  // Standard audit fields
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Alert entity structure
export interface AlertEntity extends TableEntity {
  partitionKey: string; // userId (recipient email) - optimized for "get my alerts" queries
  rowKey: string; // UUID (e.g., "alert_1234567890123_abc123")
  userId: string; // Same as partitionKey for consistency
  type: string; // "STAGE_ASSIGNED", "PROJECT_UPDATED", etc.
  title: string; // Short alert title
  message: string; // Full alert message
  entityType: string; // "projectStage", "project", "proposal"
  entityId: string; // ID of the related entity
  projectId: string; // For context/linking
  siteId: string; // For context/linking
  isRead: boolean; // Read status
  createdAt: string; // ISO 8601 timestamp
}

/**
 * Get or create users table client
 */
export function getUsersTable(): TableClient {
  if (!usersTable) {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING not configured');
    }
    usersTable = TableClient.fromConnectionString(connectionString, "Users");
  }
  return usersTable;
}

function getTableClient(tableName: string): TableClient {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error('AZURE_STORAGE_CONNECTION_STRING not configured');
  }
  return TableClient.fromConnectionString(connectionString, tableName);
}

export function getSitesTable(): TableClient {
  if (!sitesTable) {
    sitesTable = getTableClient("Sites");
  }
  return sitesTable;
}

export function getProjectsTable(): TableClient {
  if (!projectsTable) {
    projectsTable = getTableClient("Projects");
  }
  return projectsTable;
}

export function getStagesTable(): TableClient {
  if (!stagesTable) {
    stagesTable = getTableClient("Stages");
  }
  return stagesTable;
}

export function getContactsTable(): TableClient {
  if (!contactsTable) {
    contactsTable = getTableClient("Contacts");
  }
  return contactsTable;
}

export function getBusinessesTable(): TableClient {
  if (!businessesTable) {
    businessesTable = getTableClient("Businesses");
  }
  return businessesTable;
}

export function getJobTypesTable(): TableClient {
  if (!jobTypesTable) {
    jobTypesTable = getTableClient("JobTypes");
  }
  return jobTypesTable;
}

export function getProposalsTable(): TableClient {
  if (!proposalsTable) {
    proposalsTable = getTableClient("Proposals");
  }
  return proposalsTable;
}

let alertsTable: TableClient | null = null;

export function getAlertsTable(): TableClient {
  if (!alertsTable) {
    alertsTable = getTableClient("Alerts");
  }
  return alertsTable;
}

/**
 * Get or create RateLimits table client
 * SECURITY: Used for distributed rate limiting across serverless instances
 */
let rateLimitsTable: TableClient | null = null;
export function getRateLimitsTable(): TableClient {
  if (!rateLimitsTable) {
    rateLimitsTable = getTableClient("RateLimits");
  }
  return rateLimitsTable;
}

/**
 * Get or create SandboxDriveItems table client
 * Used for SharePoint sandbox mode (local development)
 */
let sandboxDriveItemsTable: TableClient | null = null;
export function getSandboxDriveItemsTable(): TableClient {
  if (!sandboxDriveItemsTable) {
    sandboxDriveItemsTable = getTableClient("SandboxDriveItems");
  }
  return sandboxDriveItemsTable;
}

/**
 * Initialize database (create tables if they don't exist)
 */
export async function initializeDatabase(): Promise<void> {
  if (IS_LOCAL) {
    await localDb.initializeLocalDatabase();
    return;
  }

  try {
    const tables = [
      { name: "Users", client: getUsersTable },
      { name: "Sites", client: getSitesTable },
      { name: "Projects", client: getProjectsTable },
      { name: "Stages", client: getStagesTable },
      { name: "Contacts", client: getContactsTable },
      { name: "Businesses", client: getBusinessesTable },
      { name: "JobTypes", client: getJobTypesTable },
      { name: "Alerts", client: getAlertsTable },
      { name: "RateLimits", client: getRateLimitsTable }, // SECURITY: Rate limiting storage
      { name: "SandboxDriveItems", client: getSandboxDriveItemsTable }, // SharePoint sandbox
    ];

    for (const tableInfo of tables) {
      try {
        await tableInfo.client().createTable();
        console.log(`${tableInfo.name} table created or already exists`);
      } catch (error: any) {
        if (error.statusCode !== 409) {
          throw error;
        }
      }
    }
  } catch (error: any) {
    console.error('Error creating tables:', error);
    throw error;
  }
}

/**
 * Get all sites
 */
export async function getAllSites(): Promise<SiteEntity[]> {
  if (IS_LOCAL) {
    return localDb.getAllSitesLocal();
  }

  const table = getSitesTable();
  const sites: SiteEntity[] = [];
  const entities = table.listEntities<SiteEntity>({
    queryOptions: { filter: `PartitionKey eq 'SITE'` }
  });

  for await (const entity of entities) {
    sites.push(entity);
  }

  return sites;
}

/**
 * Get site by id
 */
export async function getSiteById(siteId: string): Promise<SiteEntity | null> {
  if (IS_LOCAL) {
    return localDb.getSiteByIdLocal(siteId);
  }

  try {
    const table = getSitesTable();
    const entity = await table.getEntity<SiteEntity>('SITE', siteId);
    return entity;
  } catch (error: any) {
    if (error.statusCode === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Create site
 */
export async function createSite(entity: SiteEntity): Promise<SiteEntity> {
  if (IS_LOCAL) {
    return localDb.createSiteLocal(entity);
  }

  const table = getSitesTable();
  await table.createEntity(entity);
  return entity;
}

/**
 * Update site
 */
export async function updateSite(siteId: string, updates: Partial<SiteEntity>): Promise<SiteEntity> {
  if (IS_LOCAL) {
    return localDb.updateSiteLocal(siteId, updates);
  }

  const table = getSitesTable();
  const existing = await table.getEntity<SiteEntity>('SITE', siteId);
  const updated: SiteEntity = {
    ...existing,
    ...updates,
  };
  await table.updateEntity(updated, 'Merge');
  return updated;
}

/**
 * Get all projects
 */
export async function getAllProjects(): Promise<ProjectEntity[]> {
  if (IS_LOCAL) {
    return localDb.getAllProjectsLocal();
  }

  const table = getProjectsTable();
  const projects: ProjectEntity[] = [];
  const entities = table.listEntities<ProjectEntity>({
    queryOptions: { filter: `PartitionKey eq 'PROJECT'` }
  });

  for await (const entity of entities) {
    projects.push(entity);
  }

  return projects;
}

/**
 * Create project
 */
export async function createProject(entity: ProjectEntity): Promise<ProjectEntity> {
  if (IS_LOCAL) {
    return localDb.createProjectLocal(entity);
  }

  const table = getProjectsTable();
  await table.createEntity(entity);
  return entity;
}

/**
 * Update project
 */
export async function updateProject(projectCode: string, updates: Partial<ProjectEntity>): Promise<ProjectEntity> {
  if (IS_LOCAL) {
    return localDb.updateProjectLocal(projectCode, updates);
  }

  const table = getProjectsTable();
  const existing = await table.getEntity<ProjectEntity>('PROJECT', projectCode);
  const updated: ProjectEntity = {
    ...existing,
    ...updates,
  };
  await table.updateEntity(updated, 'Merge');
  return updated;
}

/**
 * Rename project code (migrate project + stages + site references)
 */
export async function renameProjectCode(
  oldCode: string,
  newCode: string
): Promise<{ project: ProjectEntity; stagesMigrated: number; sitesUpdated: number }> {
  if (IS_LOCAL) {
    return localDb.renameProjectLocal(oldCode, newCode);
  }

  const projects = getProjectsTable();
  const stages = getStagesTable();
  const sites = getSitesTable();

  const existing = await projects.getEntity<ProjectEntity>('PROJECT', oldCode);

  try {
    await projects.getEntity<ProjectEntity>('PROJECT', newCode);
    throw new Error('Project code already exists');
  } catch (error: any) {
    if (error.statusCode !== 404) {
      throw error;
    }
  }

  const { partitionKey, rowKey, etag, timestamp, ...rest } = existing as any;
  const newProject: ProjectEntity = {
    ...rest,
    partitionKey: 'PROJECT',
    rowKey: newCode,
    projectCode: newCode,
  };

  await projects.createEntity(newProject);

  let stagesMigrated = 0;
  const stageEntities = stages.listEntities<StageEntity>({
    queryOptions: { filter: `PartitionKey eq '${oldCode}'` },
  });

  for await (const stage of stageEntities) {
    const oldStageId = stage.stageId || stage.rowKey;
    let newStageId = oldStageId;
    if (typeof oldStageId === 'string') {
      if (oldStageId.startsWith(`${oldCode}-`)) {
        newStageId = oldStageId.replace(oldCode, newCode);
      } else if (oldStageId.includes(oldCode)) {
        newStageId = oldStageId.replace(oldCode, newCode);
      }
    }

    const { partitionKey: _pk, rowKey: _rk, etag: _etag, timestamp: _ts, ...stageRest } = stage as any;
    const newStage: StageEntity = {
      ...stageRest,
      partitionKey: newCode,
      rowKey: newStageId,
      stageId: newStageId,
      projectCode: newCode,
    };

    await stages.createEntity(newStage);
    await stages.deleteEntity(stage.partitionKey, stage.rowKey);
    stagesMigrated += 1;
  }

  // Clean up any duplicate stages that still reference the old code
  const newStageEntities = stages.listEntities<StageEntity>({
    queryOptions: { filter: `PartitionKey eq '${newCode}'` },
  });
  for await (const stage of newStageEntities) {
    if (typeof stage.stageId === 'string' && stage.stageId.includes(oldCode)) {
      await stages.deleteEntity(stage.partitionKey, stage.rowKey);
    }
  }

  let sitesUpdated = 0;
  const siteEntities = sites.listEntities<SiteEntity>({
    queryOptions: { filter: `PartitionKey eq 'SITE'` },
  });

  for await (const site of siteEntities) {
    const codes = safeParseJsonArray(site.projectCodes, []);
    if (Array.isArray(codes) && codes.includes(oldCode)) {
      const updatedCodes = codes.map((code: string) => (code === oldCode ? newCode : code));
      await updateSite(site.siteId, { projectCodes: JSON.stringify(updatedCodes) });
      sitesUpdated += 1;
    }
  }

  await projects.deleteEntity('PROJECT', oldCode);

  return { project: newProject, stagesMigrated, sitesUpdated };
}

/**
 * Get stages for a project
 */
export async function getStagesByProject(projectCode: string): Promise<StageEntity[]> {
  if (IS_LOCAL) {
    return localDb.getStagesByProjectLocal(projectCode);
  }

  const table = getStagesTable();
  const stages: StageEntity[] = [];
  const entities = table.listEntities<StageEntity>({
    queryOptions: { filter: `PartitionKey eq '${projectCode}'` }
  });

  for await (const entity of entities) {
    stages.push(entity);
  }

  return stages;
}

/**
 * Upsert stages for a project
 */
export async function upsertStages(projectCode: string, stages: StageEntity[]): Promise<void> {
  if (IS_LOCAL) {
    return localDb.upsertStagesLocal(projectCode, stages);
  }

  const table = getStagesTable();

  for (const stage of stages) {
    const entity: StageEntity = {
      ...stage,
      partitionKey: projectCode,
      rowKey: stage.stageId,
    };
    try {
      await table.createEntity(entity);
    } catch (error: any) {
      if (error.statusCode === 409) {
        await table.updateEntity(entity, 'Merge');
      } else {
        throw error;
      }
    }
  }
}

/**
 * Delete stages for a project that are not in the keep list
 */
export async function deleteStagesNotIn(projectCode: string, keepStageIds: string[]): Promise<void> {
  if (IS_LOCAL) {
    return localDb.deleteStagesNotInLocal(projectCode, keepStageIds);
  }

  const table = getStagesTable();
  const keepSet = new Set(keepStageIds);
  const entities = table.listEntities<StageEntity>({
    queryOptions: { filter: `PartitionKey eq '${projectCode}'` },
  });

  for await (const entity of entities) {
    if (!keepSet.has(entity.stageId || entity.rowKey)) {
      await table.deleteEntity(entity.partitionKey, entity.rowKey);
    }
  }
}

/**
 * Get all external contacts
 */
export async function getAllContacts(): Promise<ContactEntity[]> {
  if (IS_LOCAL) {
    return localDb.getAllContactsLocal();
  }

  const table = getContactsTable();
  const contacts: ContactEntity[] = [];
  const entities = table.listEntities<ContactEntity>({
    queryOptions: { filter: `PartitionKey eq 'CONTACT'` }
  });

  for await (const entity of entities) {
    contacts.push(entity);
  }

  return contacts;
}

/**
 * Create external contact
 */
export async function createContact(entity: ContactEntity): Promise<ContactEntity> {
  if (IS_LOCAL) {
    return localDb.createContactLocal(entity);
  }

  const table = getContactsTable();
  await table.createEntity(entity);
  return entity;
}

/**
 * Update external contact
 */
export async function updateContact(id: string, updates: Partial<ContactEntity>): Promise<ContactEntity> {
  if (IS_LOCAL) {
    return localDb.updateContactLocal(id, updates);
  }

  const table = getContactsTable();
  const existing = await table.getEntity<ContactEntity>('CONTACT', id);
  const updated: ContactEntity = { ...existing, ...updates };
  await table.updateEntity(updated, 'Merge');
  return updated;
}

/**
 * Delete external contact
 */
export async function deleteContact(id: string): Promise<void> {
  if (IS_LOCAL) {
    return localDb.deleteContactLocal(id);
  }

  const table = getContactsTable();
  await table.deleteEntity('CONTACT', id);
}

/**
 * Get all businesses
 */
export async function getAllBusinesses(): Promise<BusinessEntity[]> {
  if (IS_LOCAL) {
    return localDb.getAllBusinessesLocal();
  }

  const table = getBusinessesTable();
  const businesses: BusinessEntity[] = [];
  const entities = table.listEntities<BusinessEntity>({
    queryOptions: { filter: `PartitionKey eq 'BUSINESS'` }
  });

  for await (const entity of entities) {
    businesses.push(entity);
  }

  return businesses;
}

/**
 * Create business
 */
export async function createBusiness(entity: BusinessEntity): Promise<BusinessEntity> {
  if (IS_LOCAL) {
    return localDb.createBusinessLocal(entity);
  }

  const table = getBusinessesTable();
  await table.createEntity(entity);
  return entity;
}

/**
 * Update business
 */
export async function updateBusiness(id: string, updates: Partial<BusinessEntity>): Promise<BusinessEntity> {
  if (IS_LOCAL) {
    return localDb.updateBusinessLocal(id, updates);
  }

  const table = getBusinessesTable();
  const existing = await table.getEntity<BusinessEntity>('BUSINESS', id);
  const updated: BusinessEntity = { ...existing, ...updates };
  await table.updateEntity(updated, 'Merge');
  return updated;
}

/**
 * Delete business
 */
export async function deleteBusiness(id: string): Promise<void> {
  if (IS_LOCAL) {
    return localDb.deleteBusinessLocal(id);
  }

  const table = getBusinessesTable();
  await table.deleteEntity('BUSINESS', id);
}

/**
 * Get all users
 */
export async function getAllUsers(): Promise<UserEntity[]> {
  if (IS_LOCAL) {
    return localDb.getAllUsersLocal();
  }
  
  const table = getUsersTable();
  const users: UserEntity[] = [];
  
  const entities = table.listEntities<UserEntity>({
    queryOptions: { filter: `PartitionKey eq 'USER'` }
  });

  for await (const entity of entities) {
    users.push(entity);
  }

  return users;
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<UserEntity | null> {
  if (IS_LOCAL) {
    return localDb.getUserByEmailLocal(email);
  }
  
  try {
    const table = getUsersTable();
    const entity = await table.getEntity<UserEntity>('USER', email);
    return entity;
  } catch (error: any) {
    if (error.statusCode === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Create user
 */
export async function createUser(userData: {
  email: string;
  passwordHash: string;
  role: string;
  sites: string[];
  createdBy?: string;
  accountStatus?: 'pending' | 'active' | 'suspended';
  emailVerified?: boolean;
  emailVerificationToken?: string;
  emailVerificationExpiry?: string;
  mustChangePassword?: boolean;
}): Promise<UserEntity> {
  if (IS_LOCAL) {
    return localDb.createUserLocal(userData);
  }

  const table = getUsersTable();

  const entity: UserEntity = {
    partitionKey: 'USER',
    rowKey: userData.email,
    email: userData.email,
    passwordHash: userData.passwordHash,
    role: userData.role as any,
    sites: JSON.stringify(userData.sites),
    createdAt: new Date().toISOString(),
    createdBy: userData.createdBy,
    accountStatus: userData.accountStatus || 'active',
    emailVerified: userData.emailVerified || false,
    emailVerificationToken: userData.emailVerificationToken,
    emailVerificationExpiry: userData.emailVerificationExpiry,
    mustChangePassword: userData.mustChangePassword || false,
  };

  await table.createEntity(entity);
  return entity;
}

/**
 * Update user
 */
export async function updateUser(
  email: string,
  updates: {
    role?: string;
    sites?: string[];
    lastLogin?: string;
    passwordHash?: string;
    accountStatus?: 'pending' | 'active' | 'suspended';
    emailVerified?: boolean;
    emailVerificationToken?: string;
    emailVerificationExpiry?: string;
    passwordResetToken?: string;
    passwordResetExpiry?: string;
    mustChangePassword?: boolean;
    firstName?: string;
    lastName?: string;
    position?: string;
    phone?: string;
    officePhone?: string;
    department?: string;
    photo?: string;
    bio?: string;
    category?: string;
    updatedAt?: string;
  }
): Promise<UserEntity> {
  if (IS_LOCAL) {
    return localDb.updateUserLocal(email, updates);
  }

  const table = getUsersTable();
  const existing = await getUserByEmail(email);

  if (!existing) {
    throw new Error('User not found');
  }

  const updated: UserEntity = {
    ...existing,
    ...(updates.role && { role: updates.role as any }),
    ...(updates.sites !== undefined && { sites: JSON.stringify(updates.sites) }),
    ...(updates.lastLogin && { lastLogin: updates.lastLogin }),
    ...(updates.passwordHash && { passwordHash: updates.passwordHash }),
    ...(updates.accountStatus && { accountStatus: updates.accountStatus }),
    ...(typeof updates.emailVerified === 'boolean' && { emailVerified: updates.emailVerified }),
    ...(updates.emailVerificationToken !== undefined && { emailVerificationToken: updates.emailVerificationToken }),
    ...(updates.emailVerificationExpiry !== undefined && { emailVerificationExpiry: updates.emailVerificationExpiry }),
    ...(updates.passwordResetToken !== undefined && { passwordResetToken: updates.passwordResetToken }),
    ...(updates.passwordResetExpiry !== undefined && { passwordResetExpiry: updates.passwordResetExpiry }),
    ...(typeof updates.mustChangePassword === 'boolean' && { mustChangePassword: updates.mustChangePassword }),
    ...(updates.firstName !== undefined && { firstName: updates.firstName }),
    ...(updates.lastName !== undefined && { lastName: updates.lastName }),
    ...(updates.position !== undefined && { position: updates.position }),
    ...(updates.phone !== undefined && { phone: updates.phone }),
    ...(updates.officePhone !== undefined && { officePhone: updates.officePhone }),
    ...(updates.department !== undefined && { department: updates.department }),
    ...(updates.photo !== undefined && { photo: updates.photo }),
    ...(updates.bio !== undefined && { bio: updates.bio }),
    ...(updates.category !== undefined && { category: updates.category }),
    ...(updates.updatedAt !== undefined && { updatedAt: updates.updatedAt }),
  };

  await table.updateEntity(updated, 'Merge');
  return updated;
}

/**
 * Delete user
 */
export async function deleteUser(email: string): Promise<void> {
  if (IS_LOCAL) {
    return localDb.deleteUserLocal(email);
  }
  
  const table = getUsersTable();
  await table.deleteEntity('USER', email);
}

/**
 * Seed initial admin user if database is empty
 */
export async function seedInitialUsers(): Promise<void> {
  if (IS_LOCAL) {
    // Local database auto-seeds in initializeLocalDatabase
    return;
  }

  const users = await getAllUsers();
  const adminEmail = 'leah@lmllift.com';

  if (users.length === 0) {
    console.log('No users found, seeding initial admin...');
    const bcrypt = require('bcryptjs');
    const adminPasswordHash = await bcrypt.hash('password', 10);

    await createUser({
      email: adminEmail,
      passwordHash: adminPasswordHash,
      role: 'admin',
      sites: [],
      createdBy: 'system',
      accountStatus: 'active',
      emailVerified: true,
    });

    console.log('Initial admin user created: leah@lmllift.com / password');
    return;
  }

  // Ensure initial admin is verified/active if the user already exists
  const existingAdmin = await getUserByEmail(adminEmail);
  if (existingAdmin && (!existingAdmin.emailVerified || existingAdmin.accountStatus !== 'active')) {
    await updateUser(adminEmail, {
      emailVerified: true,
      accountStatus: 'active',
    });
    console.log('Initial admin user updated to verified/active.');
  }
}

/**
 * Delete a project and all its stages (permanent deletion)
 */
export async function deleteProject(projectCode: string): Promise<void> {
  if (IS_LOCAL) {
    return localDb.deleteProjectLocal(projectCode);
  }

  try {
    console.log(`[tableStorage] Deleting project ${projectCode} and all its stages`);
    const projects = getProjectsTable();
    const stages = getStagesTable();

    // Delete all stages for this project
    // In Azure Table Storage, stages are partitioned by projectCode
    const stagesQuery = stages.listEntities<StageEntity>({
      queryOptions: { filter: `PartitionKey eq '${projectCode}'` }
    });

    for await (const stage of stagesQuery) {
      await stages.deleteEntity(stage.partitionKey, stage.rowKey);
      console.log(`[tableStorage] Deleted stage ${stage.stageId}`);
    }

    // Delete the project itself
    await projects.deleteEntity('PROJECT', projectCode);
    console.log(`[tableStorage] Deleted project ${projectCode}`);
  } catch (error) {
    console.error(`Error deleting project ${projectCode}:`, error);
    throw error;
  }
}

/**
 * Delete a site and all its projects (permanent deletion - cascades)
 */
export async function deleteSite(siteId: string): Promise<void> {
  if (IS_LOCAL) {
    return localDb.deleteSiteLocal(siteId);
  }

  try {
    console.log(`[tableStorage] Deleting site ${siteId} and all its projects/stages`);
    const sites = getSitesTable();
    const projects = getProjectsTable();
    const stages = getStagesTable();

    // Step 1: Get the site to find all projects
    let site: SiteEntity | null = null;
    try {
      site = await sites.getEntity<SiteEntity>('SITE', siteId);
    } catch (error: any) {
      if (error.statusCode === 404) {
        throw new Error(`Site ${siteId} not found`);
      }
      throw error;
    }

    // Step 2: Parse project codes from the site
    const projectCodes = safeParseJsonArray(site.projectCodes, []);

    // Step 3: Delete all projects and their stages
    for (const projectCode of projectCodes) {
      // Delete all stages for this project
      const stagesQuery = stages.listEntities<StageEntity>({
        queryOptions: { filter: `PartitionKey eq '${projectCode}'` }
      });

      for await (const stage of stagesQuery) {
        await stages.deleteEntity(stage.partitionKey, stage.rowKey);
        console.log(`[tableStorage] Deleted stage ${stage.stageId} from project ${projectCode}`);
      }

      // Delete the project
      await projects.deleteEntity('PROJECT', projectCode);
      console.log(`[tableStorage] Deleted project ${projectCode}`);
    }

    // Step 4: Delete the site itself
    await sites.deleteEntity('SITE', siteId);
    console.log(`[tableStorage] Deleted site ${siteId}`);
  } catch (error) {
    console.error(`Error deleting site ${siteId}:`, error);
    throw error;
  }
}

/**
 * Get all job types
 */
export async function getAllJobTypes(): Promise<JobTypeEntity[]> {
  // Note: Local DB doesn't support job types yet
  // When needed, add to localMockDb.ts

  const table = getJobTypesTable();
  const jobTypes: JobTypeEntity[] = [];
  const entities = table.listEntities<JobTypeEntity>({
    queryOptions: { filter: `PartitionKey eq 'jobTypes'` }
  });

  for await (const entity of entities) {
    jobTypes.push(entity);
  }

  return jobTypes;
}

/**
 * Get all active job types (most common query)
 */
export async function getActiveJobTypes(): Promise<JobTypeEntity[]> {
  const table = getJobTypesTable();
  const jobTypes: JobTypeEntity[] = [];
  const entities = table.listEntities<JobTypeEntity>({
    queryOptions: { filter: `PartitionKey eq 'jobTypes' and isActive eq true` }
  });

  for await (const entity of entities) {
    jobTypes.push(entity);
  }

  return jobTypes;
}

/**
 * Get job type by ID
 */
export async function getJobTypeById(id: string): Promise<JobTypeEntity | null> {
  try {
    const table = getJobTypesTable();
    const entity = await table.getEntity<JobTypeEntity>('jobTypes', id);
    return entity;
  } catch (error: any) {
    if (error.statusCode === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Create job type
 */
export async function createJobType(data: {
  name: string;
  description?: string;
  createdBy: string;
}): Promise<JobTypeEntity> {
  const table = getJobTypesTable();
  const now = new Date().toISOString();

  const entity: JobTypeEntity = {
    partitionKey: 'jobTypes',
    rowKey: `jobtype_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    name: data.name,
    description: data.description || '',
    isActive: true,
    createdAt: now,
    updatedAt: now,
    createdBy: data.createdBy,
  };

  await table.createEntity(entity);
  return entity;
}

/**
 * Update job type
 */
export async function updateJobType(
  id: string,
  updates: {
    name?: string;
    description?: string;
    isActive?: boolean;
  }
): Promise<JobTypeEntity> {
  const table = getJobTypesTable();
  const existing = await table.getEntity<JobTypeEntity>('jobTypes', id);

  const updated: JobTypeEntity = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await table.updateEntity(updated, 'Merge');
  return updated;
}

/**
 * Soft delete job type (set isActive to false)
 */
export async function deleteJobType(id: string): Promise<void> {
  await updateJobType(id, { isActive: false });
}

/**
 * Hard delete job type (permanent deletion)
 * WARNING: Only use if job type has no references
 */
export async function hardDeleteJobType(id: string): Promise<void> {
  const table = getJobTypesTable();
  await table.deleteEntity('jobTypes', id);
}

/**
 * Count proposals that reference a specific job type
 * Used before deactivating a job type to warn the user about impact
 */
export async function countProposalsByJobType(jobTypeId: string): Promise<number> {
  const table = getProposalsTable();
  let count = 0;

  const entities = table.listEntities<ProposalEntity>({
    queryOptions: { filter: `PartitionKey eq 'PROPOSAL' and jobTypeId eq '${jobTypeId}'` }
  });

  for await (const entity of entities) {
    count++;
  }

  return count;
}

// =============================================================================
// PROPOSAL CRUD FUNCTIONS
// =============================================================================

/**
 * Get all proposals
 */
export async function getAllProposals(): Promise<ProposalEntity[]> {
  const table = getProposalsTable();
  const proposals: ProposalEntity[] = [];

  const entities = table.listEntities<ProposalEntity>({
    queryOptions: { filter: `PartitionKey eq 'PROPOSAL'` }
  });

  for await (const entity of entities) {
    proposals.push(entity);
  }

  return proposals;
}

/**
 * Get proposal by ID
 */
export async function getProposalById(proposalId: string): Promise<ProposalEntity | null> {
  try {
    const table = getProposalsTable();
    const entity = await table.getEntity<ProposalEntity>('PROPOSAL', proposalId);
    return entity;
  } catch (error: any) {
    if (error.statusCode === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Update proposal
 */
export async function updateProposal(
  proposalId: string,
  updates: Partial<ProposalEntity>
): Promise<ProposalEntity> {
  const table = getProposalsTable();
  const existing = await table.getEntity<ProposalEntity>('PROPOSAL', proposalId);

  const updated: ProposalEntity = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await table.updateEntity(updated, 'Merge');
  return updated;
}

// =============================================================================
// ALERTS CRUD FUNCTIONS
// =============================================================================

/**
 * Get all alerts for a specific user
 * Ordered by createdAt descending (most recent first)
 */
export async function getAllAlertsForUser(userId: string): Promise<AlertEntity[]> {
  const table = getAlertsTable();
  const alerts: AlertEntity[] = [];

  // Partition key is userId, so this is an efficient query
  const entities = table.listEntities<AlertEntity>({
    queryOptions: { filter: `PartitionKey eq '${userId}'` }
  });

  for await (const entity of entities) {
    alerts.push(entity);
  }

  // Sort by createdAt descending (most recent first)
  alerts.sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateB - dateA;
  });

  return alerts;
}

/**
 * Get unread alerts for a specific user
 */
export async function getUnreadAlertsForUser(userId: string): Promise<AlertEntity[]> {
  const table = getAlertsTable();
  const alerts: AlertEntity[] = [];

  // Query for unread alerts only
  const entities = table.listEntities<AlertEntity>({
    queryOptions: { filter: `PartitionKey eq '${userId}' and isRead eq false` }
  });

  for await (const entity of entities) {
    alerts.push(entity);
  }

  // Sort by createdAt descending (most recent first)
  alerts.sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateB - dateA;
  });

  return alerts;
}

/**
 * Get unread alert count for a specific user
 */
export async function getUnreadCountForUser(userId: string): Promise<number> {
  const table = getAlertsTable();
  let count = 0;

  const entities = table.listEntities<AlertEntity>({
    queryOptions: { filter: `PartitionKey eq '${userId}' and isRead eq false` }
  });

  for await (const entity of entities) {
    count++;
  }

  return count;
}

/**
 * Create a new alert
 */
export async function createAlert(data: {
  userId: string;
  type: string;
  title: string;
  message: string;
  entityType: string;
  entityId: string;
  projectId?: string;
  siteId?: string;
}): Promise<AlertEntity> {
  const table = getAlertsTable();
  const now = new Date().toISOString();

  const entity: AlertEntity = {
    partitionKey: data.userId,
    rowKey: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    userId: data.userId,
    type: data.type,
    title: data.title,
    message: data.message,
    entityType: data.entityType,
    entityId: data.entityId,
    projectId: data.projectId || '',
    siteId: data.siteId || '',
    isRead: false,
    createdAt: now,
  };

  await table.createEntity(entity);
  return entity;
}

/**
 * Mark a single alert as read
 * Returns the updated alert or null if not found or user doesn't own it
 */
export async function markAlertAsRead(
  alertId: string,
  userId: string
): Promise<AlertEntity | null> {
  try {
    const table = getAlertsTable();

    // Get the alert to verify it belongs to the user
    const existing = await table.getEntity<AlertEntity>(userId, alertId);

    // Update isRead flag
    const updated: AlertEntity = {
      ...existing,
      isRead: true,
    };

    await table.updateEntity(updated, 'Merge');
    return updated;
  } catch (error: any) {
    if (error.statusCode === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Mark all alerts as read for a specific user
 * Returns the count of alerts marked as read
 */
export async function markAllAlertsAsRead(userId: string): Promise<number> {
  const table = getAlertsTable();
  let count = 0;

  // Get all unread alerts for the user
  const entities = table.listEntities<AlertEntity>({
    queryOptions: { filter: `PartitionKey eq '${userId}' and isRead eq false` }
  });

  // Update each unread alert
  for await (const entity of entities) {
    const updated: AlertEntity = {
      ...entity,
      isRead: true,
    };
    await table.updateEntity(updated, 'Merge');
    count++;
  }

  return count;
}
