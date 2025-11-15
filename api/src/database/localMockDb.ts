/**
 * Local Mock Database for Testing
 * Uses in-memory storage instead of Azure Table Storage
 * Only for local development
 */

import { UserEntity } from "./tableStorage";
import bcrypt from 'bcryptjs';

// In-memory user store
let users: Map<string, UserEntity> = new Map();

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
        rowKey: 'admin@liftwatch.com',
        email: 'admin@liftwatch.com',
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
        rowKey: 'manager@liftwatch.com',
        email: 'manager@liftwatch.com',
        passwordHash: defaultPassword,
        role: 'national_manager',
        sites: '[]',
        createdAt: new Date().toISOString(),
        createdBy: 'system',
        accountStatus: 'active',
        emailVerified: true,
      },
      {
        partitionKey: 'USER',
        rowKey: 'sitemanager@liftwatch.com',
        email: 'sitemanager@liftwatch.com',
        passwordHash: defaultPassword,
        role: 'site_manager',
        sites: '["Tower A"]',
        createdAt: new Date().toISOString(),
        createdBy: 'system',
        accountStatus: 'active',
        emailVerified: true,
      },
      {
        partitionKey: 'USER',
        rowKey: 'consultant@liftwatch.com',
        email: 'consultant@liftwatch.com',
        passwordHash: defaultPassword,
        role: 'consultant',
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
    console.log('   - admin@liftwatch.com / password');
    console.log('   - manager@liftwatch.com / password');
    console.log('   - sitemanager@liftwatch.com / password');
    console.log('   - consultant@liftwatch.com / password');
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
 * Clear all users (for testing)
 */
export function clearLocalDatabase(): void {
  users.clear();
}

