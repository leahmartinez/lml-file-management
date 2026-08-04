/**
 * Suspend User Handler
 *
 * SECURITY:
 * - Rate limited (admin rate limit)
 * - Input validated with Zod schema
 * - Requires authentication and admin/consultant role
 * - Prevents self-suspension
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getUserByEmail, updateUser } from '../database/tableStorage';
import { getAuthenticatedUser, canUserManageUsers } from '../utils/auth';
import { success, error, forbidden, notFound, addCorsHeaders, unauthorized } from '../utils/response';
import { validateRequestBody, userSuspendSchema, isValidationFailure } from '../utils/validation';
import { withRateLimit, RATE_LIMITS } from '../utils/rateLimit';
import { UserRole } from '../../shared/constants/roles';

async function usersSuspendHandlerImpl(
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

    // AUTHORIZATION: Only Admin can suspend users
    if (!canUserManageUsers(currentUser)) {
      context.warn(`Access denied: ${currentUser.email} (${currentUser.role}) attempted to suspend user`);
      return addCorsHeaders(forbidden('Only admins can suspend users'), request.headers.get('origin') || undefined);
    }

    // SECURITY: Validate input using Zod schema
    const validation = await validateRequestBody(request, userSuspendSchema);
    if (isValidationFailure(validation)) {
      return validation.error;
    }

    const { email } = validation.data;
    // email is already normalized by schema transform

    // SECURITY: Prevent self-suspension
    if (email === currentUser.email.toLowerCase()) {
      return addCorsHeaders(error('Cannot suspend your own account'), request.headers.get('origin') || undefined);
    }

    // Check if user exists
    const existing = await getUserByEmail(email);
    if (!existing) {
      return addCorsHeaders(notFound('User not found'), request.headers.get('origin') || undefined);
    }

    context.log('Suspending user account:', email);

    // Update user status to suspended
    await updateUser(email, {
      accountStatus: 'suspended',
    });

    return addCorsHeaders(
      success({
        message: 'User account suspended successfully',
        email,
      }),
      request.headers.get('origin') || undefined
    );

  } catch (err: any) {
    context.error('Suspend user error:', err);
    return addCorsHeaders(error('Server error', 500), request.headers.get('origin') || undefined);
  }
}

// SECURITY: Wrap handler with rate limiting (admin rate limit)
export const usersSuspendHandler = withRateLimit(
  usersSuspendHandlerImpl,
  RATE_LIMITS.ADMIN
);

// Default export for function.json
export default usersSuspendHandler;
