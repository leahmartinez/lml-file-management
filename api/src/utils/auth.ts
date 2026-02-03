/**
 * Authentication utilities
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { HttpRequest } from '@azure/functions';

export interface JWTPayload {
  email: string;
  role: string;
  sites: string[];
}

/**
 * Hash password with bcrypt
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
 * Check if user has required role
 */
export function hasRole(user: JWTPayload | null, allowedRoles: string[]): boolean {
  if (!user) return false;
  return allowedRoles.includes(user.role);
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

