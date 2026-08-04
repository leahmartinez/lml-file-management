/**
 * Authentication utilities
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { HttpRequest } from '@azure/functions';
import { UserRole, canManageUsers, canManageJobs, canSetPricing, canSeePricing, canSeeMap, mapLegacyRole } from '../constants/roles';

export interface JWTPayload {
  email: string;
  role: string;
  sites: string[];
  pairedUserId?: string; // For consultant pairing
}

/**
 * Hash password with bcrypt
 * SECURITY: Uses bcrypt with 10 salt rounds as per security requirements
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Verify password
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token
 */
export function generateToken(payload: JWTPayload): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }

  return jwt.sign(payload, secret, {
    expiresIn: '24h',
  });
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }

    const decoded = jwt.verify(token, secret) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Extract token from request headers
 */
export function extractToken(req: HttpRequest): string | null {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  const altHeader = req.headers.get('x-lml-token') || req.headers.get('X-LML-Token');

  if (altHeader && altHeader.trim()) {
    return altHeader.trim();
  }

  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;

  return parts[1];
}

/**
 * Get authenticated user from request
 */
export function getAuthenticatedUser(req: HttpRequest): JWTPayload | null {
  const token = extractToken(req);
  if (!token) return null;

  return verifyToken(token);
}

/**
 * Normalize role to match UserRole enum
 * Handles legacy role values (super_admin, admin, consultant, subconsultant, etc.)
 */
export function normalizeRole(role: string): UserRole {
  // Check if it's already a valid UserRole
  if (Object.values(UserRole).includes(role as UserRole)) {
    return role as UserRole;
  }

  // Try to map legacy role
  const mapped = mapLegacyRole(role);
  if (mapped) {
    return mapped;
  }

  // Default fallback (should rarely happen)
  return UserRole.LMLConsultant;
}

/**
 * Check if user has required role
 * SECURITY: Uses UserRole enum for consistency
 *
 * @param user - Authenticated user from JWT
 * @param allowedRoles - Array of allowed UserRole values
 * @returns true if user has one of the allowed roles
 */
export function hasRole(user: JWTPayload | null, allowedRoles: (UserRole | string)[]): boolean {
  if (!user) return false;

  const userRole = normalizeRole(user.role);

  // Admin has access to everything
  if (userRole === UserRole.Admin) return true;

  // Normalize allowed roles and check
  const normalizedAllowed = allowedRoles.map(r =>
    typeof r === 'string' ? normalizeRole(r) : r
  );

  return normalizedAllowed.includes(userRole);
}

/**
 * Check if user is an Admin
 */
export function isAdmin(user: JWTPayload | null): boolean {
  if (!user) return false;
  return normalizeRole(user.role) === UserRole.Admin;
}

/**
 * Check if user is a Director
 */
export function isDirector(user: JWTPayload | null): boolean {
  if (!user) return false;
  return normalizeRole(user.role) === UserRole.Director;
}

/**
 * Check if user is an LML Consultant
 */
export function isLMLConsultant(user: JWTPayload | null): boolean {
  if (!user) return false;
  return normalizeRole(user.role) === UserRole.LMLConsultant;
}

/**
 * Check if user is a SubConsultant
 */
export function isSubConsultant(user: JWTPayload | null): boolean {
  if (!user) return false;
  return normalizeRole(user.role) === UserRole.SubConsultant;
}

/**
 * Check if user is AdminStaff
 */
export function isAdminStaff(user: JWTPayload | null): boolean {
  if (!user) return false;
  return normalizeRole(user.role) === UserRole.AdminStaff;
}

/**
 * Check if user can manage users (create, update, suspend, delete)
 */
export function canUserManageUsers(user: JWTPayload | null): boolean {
  if (!user) return false;
  return canManageUsers(normalizeRole(user.role));
}

/**
 * Check if user can manage job types
 */
export function canUserManageJobs(user: JWTPayload | null): boolean {
  if (!user) return false;
  return canManageJobs(normalizeRole(user.role));
}

/**
 * Check if user can set/edit proposal pricing
 */
export function canUserSetPricing(user: JWTPayload | null): boolean {
  if (!user) return false;
  return canSetPricing(normalizeRole(user.role));
}

/**
 * Check if user can see proposal pricing
 */
export function canUserSeePricing(user: JWTPayload | null): boolean {
  if (!user) return false;
  return canSeePricing(normalizeRole(user.role));
}

/**
 * Check if user can see the map on My Work page
 */
export function canUserSeeMap(user: JWTPayload | null): boolean {
  if (!user) return false;
  return canSeeMap(normalizeRole(user.role));
}

/**
 * Generate a secure random token for email verification or password reset
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate token expiry time
 * @param hours - Number of hours until expiry (default: 24 for email verification)
 */
export function generateTokenExpiry(hours: number = 24): string {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + hours);
  return expiry.toISOString();
}

/**
 * Check if a token has expired
 */
export function isTokenExpired(expiryDate: string | undefined): boolean {
  if (!expiryDate) return true;
  return new Date(expiryDate) < new Date();
}

