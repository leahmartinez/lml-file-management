/**
 * Users Handler (List and Create)
 *
 * SECURITY:
 * - Rate limited (standard for GET, write for POST)
 * - Input validated with Zod schema for POST
 * - Requires authentication
 * - Admin/consultant role required for user creation
 * - Password hashes never exposed
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getAllUsers, getUserByEmail, createUser } from '../database/tableStorage';
import { getAuthenticatedUser, hasRole, hashPassword } from '../utils/auth';
import { success, error, forbidden, addCorsHeaders, unauthorized } from '../utils/response';
import { safeParseJsonArray } from '../utils/json';
import { validateRequestBody, createUserSchema, isValidationFailure } from '../utils/validation';
import { withRateLimit, RATE_LIMITS } from '../utils/rateLimit';

async function usersHandlerImpl(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return addCorsHeaders({ status: 200 }, request.headers.get('origin') || undefined);
    }

    // Check authentication
    const currentUser = getAuthenticatedUser(request);
    if (!currentUser) {
      return addCorsHeaders(unauthorized(), request.headers.get('origin') || undefined);
    }

    if (request.method === 'GET') {
      // List all users
      const users = await getAllUsers();

      // SECURITY: Remove password hashes from response
      const safeUsers = users.map(u => ({
        email: u.email,
        role: u.role,
        sites: safeParseJsonArray(u.sites, []),
        createdAt: u.createdAt,
        lastLogin: u.lastLogin,
        createdBy: u.createdBy,
        accountStatus: u.accountStatus,
        emailVerified: u.emailVerified,
        mustChangePassword: u.mustChangePassword || false,
      }));

      return addCorsHeaders(success(safeUsers), request.headers.get('origin') || undefined);

    } else if (request.method === 'POST') {
      // Check authorization for user creation
      if (!hasRole(currentUser, ['admin', 'consultant'])) {
        return addCorsHeaders(forbidden('Only admins can manage users'), request.headers.get('origin') || undefined);
      }

      // SECURITY: Validate input using Zod schema
      const validation = await validateRequestBody(request, createUserSchema);
      if (isValidationFailure(validation)) {
        return validation.error;
      }

      const { email, password, role, sites, mustChangePassword } = validation.data;
      // email is already normalized by schema transform

      // Check if user already exists
      const existing = await getUserByEmail(email);
      if (existing) {
        return addCorsHeaders(
          error(`User with email "${email}" already exists`),
          request.headers.get('origin') || undefined
        );
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user
      const newUser = await createUser({
        email,
        passwordHash,
        role,
        sites: sites || [],
        createdBy: currentUser.email,
        mustChangePassword: !!mustChangePassword,
        accountStatus: 'active',
        emailVerified: true,
      });

      return addCorsHeaders(
        success({
          email: newUser.email,
          role: newUser.role,
          sites: safeParseJsonArray(newUser.sites, []),
          createdAt: newUser.createdAt,
        }, 201),
        request.headers.get('origin') || undefined
      );
    }

    return addCorsHeaders(error('Method not allowed', 405), request.headers.get('origin') || undefined);

  } catch (err: any) {
    context.error('Users error:', err);
    return addCorsHeaders(error('Server error', 500), request.headers.get('origin') || undefined);
  }
}

// SECURITY: Wrap handler with rate limiting
export const usersHandler = withRateLimit(
  usersHandlerImpl,
  RATE_LIMITS.STANDARD
);

// Default export for function.json
export default usersHandler;
