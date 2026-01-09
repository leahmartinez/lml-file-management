/**
 * Local Mock Database for Testing
 * Uses in-memory storage instead of Azure Table Storage
 * Only for local development
 */

import { UserEntity, ProjectEntity, SiteEntity, StageEntity } from "./tableStorage";
import bcrypt from 'bcryptjs';

// In-memory stores
let users: Map<string, UserEntity> = new Map();
let projects: Map<string, ProjectEntity> = new Map(); // key: projectCode
let sites: Map<string, SiteEntity> = new Map(); // key: siteId
let stages: Map<string, StageEntity> = new Map(); // key: stageId

/**
 * Initialize local database with demo users
 */
export async function initializeLocalDatabase(): Promise<void> {
  console.log('🔧 Using LOCAL MOCK DATABASE (in-memory)');
  console.log('⚠️  Data will be lost when server stops');
  
  // Seed demo users if empty
  if (users.size === 0) {
    const defaultPassword = await bcrypt.hash('password', 10);
    
    const demoUsers: UserEntity[] = [
      {
        partitionKey: 'USER',
        rowKey: 'leah@lmllift.com',
        email: 'leah@lmllift.com',
        passwordHash: defaultPassword,
        role: 'admin',
        sites: '[]',
        createdAt: new Date().toISOString(),
        createdBy: 'system',
        accountStatus: 'active',
        emailVerified: true,
      },
      {
        partitionKey: 'USER',
        rowKey: 'user@lmllift.com',
        email: 'user@lmllift.com',
        passwordHash: defaultPassword,
        role: 'user',
        sites: '[]',
        createdAt: new Date().toISOString(),
        createdBy: 'system',
        accountStatus: 'active',
        emailVerified: true,
      },
    ];
    
    // Store users with normalized (lowercase) email as key
    demoUsers.forEach(user => {
      const normalizedEmail = user.email.toLowerCase().trim();
      users.set(normalizedEmail, {
        ...user,
        email: normalizedEmail,
        rowKey: normalizedEmail,
      });
    });
    
    console.log('✅ Seeded demo users:');
    console.log('   - leah@lmllift.com / password (admin)');
    console.log('   - user@lmllift.com / password (user)');
  }
}

/**
 * Get all users
 */
export async function getAllUsersLocal(): Promise<UserEntity[]> {
  return Array.from(users.values());
}

/**
 * Get user by email (case-insensitive)
 */
export async function getUserByEmailLocal(email: string): Promise<UserEntity | null> {
  const normalizedEmail = email.toLowerCase().trim();
  // Check exact match first
  const exactMatch = users.get(normalizedEmail);
  if (exactMatch) return exactMatch;
  
  // Check case-insensitive match
  for (const [key, user] of users.entries()) {
    if (key.toLowerCase() === normalizedEmail) {
      return user;
    }
  }
  
  return null;
}

/**
 * Create user
 */
export async function createUserLocal(userData: {
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
  // Normalize email to lowercase for storage
  const normalizedEmail = userData.email.toLowerCase().trim();

  const entity: UserEntity = {
    partitionKey: 'USER',
    rowKey: normalizedEmail,
    email: normalizedEmail,
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

  users.set(normalizedEmail, entity);
  return entity;
}

/**
 * Update user
 */
export async function updateUserLocal(
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
  const existing = users.get(email);

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

  users.set(email, updated);
  return updated;
}

/**
 * Delete user
 */
export async function deleteUserLocal(email: string): Promise<void> {
  users.delete(email);
}

/**
 * Clear all data (for testing)
 */
export function clearLocalDatabase(): void {
  users.clear();
  projects.clear();
  sites.clear();
  stages.clear();
}

/**
 * Delete a project and all its stages (permanent deletion)
 */
export async function deleteProjectLocal(projectCode: string): Promise<void> {
  try {
    console.log(`[localMockDb] Deleting project ${projectCode} and all its stages`);

    // Delete all stages for this project
    const stagesToDelete: string[] = [];
    for (const [stageId, stage] of stages.entries()) {
      if (stage.projectCode === projectCode) {
        stagesToDelete.push(stageId);
      }
    }

    stagesToDelete.forEach(stageId => {
      stages.delete(stageId);
      console.log(`[localMockDb] Deleted stage ${stageId}`);
    });

    // Delete the project itself
    projects.delete(projectCode);
    console.log(`[localMockDb] Deleted project ${projectCode}`);
  } catch (error) {
    console.error(`[localMockDb] Error deleting project ${projectCode}:`, error);
    throw error;
  }
}

/**
 * Delete a site and all its projects (permanent deletion - cascades)
 */
export async function deleteSiteLocal(siteId: string): Promise<void> {
  try {
    console.log(`[localMockDb] Deleting site ${siteId} and all its projects/stages`);

    // Step 1: Get the site to find all projects
    const site = sites.get(siteId);
    if (!site) {
      throw new Error(`Site ${siteId} not found`);
    }

    // Step 2: Parse project codes from the site
    const projectCodes = site.projectCodes ? JSON.parse(site.projectCodes) : [];

    // Step 3: Delete all projects and their stages
    for (const projectCode of projectCodes) {
      // Delete all stages for this project
      const stagesToDelete: string[] = [];
      for (const [stageId, stage] of stages.entries()) {
        if (stage.projectCode === projectCode) {
          stagesToDelete.push(stageId);
        }
      }

      stagesToDelete.forEach(stageId => {
        stages.delete(stageId);
        console.log(`[localMockDb] Deleted stage ${stageId} from project ${projectCode}`);
      });

      // Delete the project
      projects.delete(projectCode);
      console.log(`[localMockDb] Deleted project ${projectCode}`);
    }

    // Step 4: Delete the site itself
    sites.delete(siteId);
    console.log(`[localMockDb] Deleted site ${siteId}`);
  } catch (error) {
    console.error(`[localMockDb] Error deleting site ${siteId}:`, error);
    throw error;
  }
}

