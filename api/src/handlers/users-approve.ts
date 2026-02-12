/**
 * Approve User Handler
 *
 * SECURITY:
 * - Rate limited (admin rate limit)
 * - Input validated with Zod schema
 * - Requires authentication and admin/consultant role
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getUserByEmail, updateUser } from '../database/tableStorage';
import { getAuthenticatedUser, hasRole } from '../utils/auth';
import { sendAccountApprovedEmail } from '../utils/email';
import { success, error, forbidden, notFound, addCorsHeaders, unauthorized } from '../utils/response';
import { validateRequestBody, userApproveSchema, isValidationFailure } from '../utils/validation';
import { withRateLimit, RATE_LIMITS } from '../utils/rateLimit';

async function usersApproveHandlerImpl(
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
      return addCorsHeaders(forbidden('Only admins can approve users'), request.headers.get('origin') || undefined);
    }

    // SECURITY: Validate input using Zod schema
    const validation = await validateRequestBody(request, userApproveSchema);
    if (isValidationFailure(validation)) {
      return validation.error;
    }

    const { email } = validation.data;
    // email is already normalized by schema transform

    // Check if user exists
    const existing = await getUserByEmail(email);
    if (!existing) {
      return addCorsHeaders(notFound('User not found'), request.headers.get('origin') || undefined);
    }

    // Check if email is verified
    if (!existing.emailVerified) {
      return addCorsHeaders(
        error('Cannot approve user - email not verified yet'),
        request.headers.get('origin') || undefined
      );
    }

    // Check if already approved
    if (existing.accountStatus === 'active') {
      return addCorsHeaders(
        error('User account is already active'),
        request.headers.get('origin') || undefined
      );
    }

    context.log('Approving user account:', email);

    // Update user status to active
    await updateUser(email, {
      accountStatus: 'active',
    });

    // Send account approved email
    await sendAccountApprovedEmail(email, context);

    return addCorsHeaders(
      success({
        message: 'User account approved successfully',
        email,
      }),
      request.headers.get('origin') || undefined
    );

  } catch (err: any) {
    context.error('Approve user error:', err);
    return addCorsHeaders(error('Server error', 500), request.headers.get('origin') || undefined);
  }
}

// SECURITY: Wrap handler with rate limiting (admin rate limit)
export const usersApproveHandler = withRateLimit(
  usersApproveHandlerImpl,
  RATE_LIMITS.ADMIN
);

// Default export for function.json
export default usersApproveHandler;
