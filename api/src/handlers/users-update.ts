/**
 * Update User Handler
 *
 * SECURITY:
 * - Rate limited (admin rate limit)
 * - Input validated with Zod schema
 * - Requires authentication and admin/consultant role
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getUserByEmail, updateUser } from '../database/tableStorage';
import { getAuthenticatedUser, hasRole, hashPassword } from '../utils/auth';
import { success, error, forbidden, notFound, addCorsHeaders, unauthorized } from '../utils/response';
import { safeParseJsonArray } from '../utils/json';
import { validateRequestBody, updateUserSchema, isValidationFailure } from '../utils/validation';
import { withRateLimit, RATE_LIMITS } from '../utils/rateLimit';

async function usersUpdateHandlerImpl(
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

    // Check authorization
    if (!hasRole(currentUser, ['admin', 'consultant'])) {
      return addCorsHeaders(forbidden('Only admins can update users'), request.headers.get('origin') || undefined);
    }

    // SECURITY: Validate input using Zod schema
    const validation = await validateRequestBody(request, updateUserSchema);
    if (isValidationFailure(validation)) {
      return validation.error;
    }

    const { email, role, sites, password, mustChangePassword } = validation.data;
    // email is already normalized by schema transform

    // Check if user exists
    const existing = await getUserByEmail(email);
    if (!existing) {
      return addCorsHeaders(notFound('User not found'), request.headers.get('origin') || undefined);
    }

    // Prepare updates
    const updates: any = {};
    if (role) updates.role = role;
    if (sites !== undefined) updates.sites = sites;
    if (password) updates.passwordHash = await hashPassword(password);
    if (typeof mustChangePassword === 'boolean') updates.mustChangePassword = mustChangePassword;

    // Update user
    const updated = await updateUser(email, updates);

    return addCorsHeaders(
      success({
        email: updated.email,
        role: updated.role,
        sites: safeParseJsonArray(updated.sites, []),
      }),
      request.headers.get('origin') || undefined
    );

  } catch (err: any) {
    context.error('Update user error:', err);
    return addCorsHeaders(error('Server error', 500), request.headers.get('origin') || undefined);
  }
}

// SECURITY: Wrap handler with rate limiting (admin rate limit)
export const usersUpdateHandler = withRateLimit(
  usersUpdateHandlerImpl,
  RATE_LIMITS.ADMIN
);

// Default export for function.json
export default usersUpdateHandler;
