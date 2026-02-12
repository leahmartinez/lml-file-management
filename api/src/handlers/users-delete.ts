/**
 * Delete User Handler
 *
 * SECURITY:
 * - Rate limited (admin rate limit)
 * - Input validated with Zod schema
 * - Requires authentication and admin/consultant role
 * - Prevents self-deletion
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getUserByEmail, deleteUser } from '../database/tableStorage';
import { getAuthenticatedUser, hasRole } from '../utils/auth';
import { success, error, forbidden, notFound, addCorsHeaders, unauthorized } from '../utils/response';
import { validateRequestBody, userDeleteSchema, isValidationFailure } from '../utils/validation';
import { withRateLimit, RATE_LIMITS } from '../utils/rateLimit';

async function usersDeleteHandlerImpl(
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
      return addCorsHeaders(forbidden('Only admins can delete users'), request.headers.get('origin') || undefined);
    }

    // SECURITY: Validate input using Zod schema
    const validation = await validateRequestBody(request, userDeleteSchema);
    if (isValidationFailure(validation)) {
      return validation.error;
    }

    const { email } = validation.data;
    // email is already normalized by schema transform

    // SECURITY: Prevent self-deletion
    if (email === currentUser.email.toLowerCase()) {
      return addCorsHeaders(error('Cannot delete your own account'), request.headers.get('origin') || undefined);
    }

    // Check if user exists
    const existing = await getUserByEmail(email);
    if (!existing) {
      return addCorsHeaders(notFound('User not found'), request.headers.get('origin') || undefined);
    }

    // Delete user
    await deleteUser(email);

    return addCorsHeaders(success({ message: 'User deleted successfully' }), request.headers.get('origin') || undefined);

  } catch (err: any) {
    context.error('Delete user error:', err);
    return addCorsHeaders(error('Server error', 500), request.headers.get('origin') || undefined);
  }
}

// SECURITY: Wrap handler with rate limiting (admin rate limit)
export const usersDeleteHandler = withRateLimit(
  usersDeleteHandlerImpl,
  RATE_LIMITS.ADMIN
);

// Default export for function.json
export default usersDeleteHandler;
