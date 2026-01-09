/**
 * Azure Table Storage Helper
 * Database layer for user management
 * 
 * For local development, use localMockDb.ts instead
 */

import { TableClient, TableEntity } from "@azure/data-tables";
import * as localDb from "./localMockDb";

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
  role: 'admin' | 'user';
  sites: string; // JSON stringified array
  createdAt: string;
  lastLogin?: string;
  createdBy?: string;
  // Account status and verification
  accountStatus: 'pending' | 'active' | 'suspended'; // pending = awaiting admin approval
  emailVerified: boolean; // true if email has been verified
  emailVerificationToken?: string; // token for email verification
  emailVerificationExpiry?: string; // expiry time for verification token
  // Password reset
  passwordResetToken?: string; // token for password reset
  passwordResetExpiry?: string; // expiry time for reset token
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
  createdAt: string;
  createdBy?: string;
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
  createdAt: string;
  createdBy?: string;
}

// Initialize table client
let usersTable: TableClient | null = null;

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

/**
 * Initialize database (create tables if they don't exist)
 */
export async function initializeDatabase(): Promise<void> {
  if (IS_LOCAL) {
    await localDb.initializeLocalDatabase();
    return;
  }
  
  try {
    const table = getUsersTable();
    await table.createTable();
    console.log('Users table created or already exists');
  } catch (error: any) {
    if (error.statusCode !== 409) { // 409 = table already exists
      console.error('Error creating table:', error);
      throw error;
    }
  }
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
    ...(updates.sites && { sites: JSON.stringify(updates.sites) }),
    ...(updates.lastLogin && { lastLogin: updates.lastLogin }),
    ...(updates.passwordHash && { passwordHash: updates.passwordHash }),
    ...(updates.accountStatus && { accountStatus: updates.accountStatus }),
    ...(typeof updates.emailVerified === 'boolean' && { emailVerified: updates.emailVerified }),
    ...(updates.emailVerificationToken !== undefined && { emailVerificationToken: updates.emailVerificationToken }),
    ...(updates.emailVerificationExpiry !== undefined && { emailVerificationExpiry: updates.emailVerificationExpiry }),
    ...(updates.passwordResetToken !== undefined && { passwordResetToken: updates.passwordResetToken }),
    ...(updates.passwordResetExpiry !== undefined && { passwordResetExpiry: updates.passwordResetExpiry }),
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

  if (users.length === 0) {
    console.log('No users found, seeding initial admin...');
    const bcrypt = require('bcryptjs');
    const adminPasswordHash = await bcrypt.hash('password', 10);

    await createUser({
      email: 'leah@lmllift.com',
      passwordHash: adminPasswordHash,
      role: 'admin',
      sites: [],
      createdBy: 'system',
    });

    console.log('Initial admin user created: leah@lmllift.com / password');
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
    const table = getUsersTable(); // Get the table client

    // Delete all stages for this project
    // In Azure Table Storage, stages are partitioned by projectCode
    const stagesQuery = table.listEntities<StageEntity>({
      queryOptions: { filter: `PartitionKey eq '${projectCode}'` }
    });

    for await (const stage of stagesQuery) {
      await table.deleteEntity(stage.partitionKey, stage.rowKey);
      console.log(`[tableStorage] Deleted stage ${stage.stageId}`);
    }

    // Delete the project itself
    await table.deleteEntity('PROJECT', projectCode);
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
    const table = getUsersTable();

    // Step 1: Get the site to find all projects
    let site: SiteEntity | null = null;
    try {
      site = await table.getEntity<SiteEntity>('SITE', siteId);
    } catch (error: any) {
      if (error.statusCode === 404) {
        throw new Error(`Site ${siteId} not found`);
      }
      throw error;
    }

    // Step 2: Parse project codes from the site
    const projectCodes = site.projectCodes ? JSON.parse(site.projectCodes) : [];

    // Step 3: Delete all projects and their stages
    for (const projectCode of projectCodes) {
      // Delete all stages for this project
      const stagesQuery = table.listEntities<StageEntity>({
        queryOptions: { filter: `PartitionKey eq '${projectCode}'` }
      });

      for await (const stage of stagesQuery) {
        await table.deleteEntity(stage.partitionKey, stage.rowKey);
        console.log(`[tableStorage] Deleted stage ${stage.stageId} from project ${projectCode}`);
      }

      // Delete the project
      await table.deleteEntity('PROJECT', projectCode);
      console.log(`[tableStorage] Deleted project ${projectCode}`);
    }

    // Step 4: Delete the site itself
    await table.deleteEntity('SITE', siteId);
    console.log(`[tableStorage] Deleted site ${siteId}`);
  } catch (error) {
    console.error(`Error deleting site ${siteId}:`, error);
    throw error;
  }
}

