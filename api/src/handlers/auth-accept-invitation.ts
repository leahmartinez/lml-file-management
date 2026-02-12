/**
 * Accept Invitation Handler
 *
 * SECURITY:
 * - Rate limited to prevent brute force token guessing (10 per 15 min)
 * - Input validated with Zod schema
 * - Password strength enforced
 * - Tokens cleared after successful acceptance
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getUserByEmail, updateUser } from '../database/tableStorage';
import { hashPassword, isTokenExpired } from '../utils/auth';
import { success, error, addCorsHeaders } from '../utils/response';
import { validateRequestBody, acceptInvitationSchema, isValidationFailure } from '../utils/validation';
import { withRateLimit, RATE_LIMITS } from '../utils/rateLimit';

async function authAcceptInvitationHandlerImpl(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return addCorsHeaders({ status: 200 }, request.headers.get('origin') || undefined);
    }

    context.log('Accept invitation attempt');

    // SECURITY: Validate input using Zod schema
    const validation = await validateRequestBody(request, acceptInvitationSchema);
    if (isValidationFailure(validation)) {
      return validation.error;
    }

    const { email, token, password } = validation.data;
    // email is already normalized by schema transform

    // Get user
    const user = await getUserByEmail(email);
    if (!user) {
      return addCorsHeaders(
        error('Invalid invitation link', 404),
        request.headers.get('origin') || undefined
      );
    }

    // Check if token matches
    if (user.emailVerificationToken !== token) {
      context.log('Invalid token for:', email);
      return addCorsHeaders(
        error('Invalid or expired invitation link', 400),
        request.headers.get('origin') || undefined
      );
    }

    // Check if token has expired
    if (isTokenExpired(user.emailVerificationExpiry)) {
      context.log('Expired invitation for:', email);
      return addCorsHeaders(
        error('Invitation link has expired. Please request a new invitation.', 400),
        request.headers.get('origin') || undefined
      );
    }

    context.log('Accepting invitation for:', email);

    // Hash the new password
    const passwordHash = await hashPassword(password);

    // Update user - set password, mark email as verified, clear invitation token
    await updateUser(email, {
      passwordHash,
      emailVerified: true,
      emailVerificationToken: undefined,
      emailVerificationExpiry: undefined,
      accountStatus: 'active',
      mustChangePassword: false,
    });

    context.log('Invitation accepted successfully for:', email);

    return addCorsHeaders(
      success({
        message: 'Invitation accepted! You can now log in with your new password.',
      }),
      request.headers.get('origin') || undefined
    );

  } catch (err: any) {
    context.error('Accept invitation error:', err);
    return addCorsHeaders(
      error('Failed to accept invitation. Please try again.', 500),
      request.headers.get('origin') || undefined
    );
  }
}

// SECURITY: Wrap handler with rate limiting (10 attempts per 15 minutes)
export const authAcceptInvitationHandler = withRateLimit(
  authAcceptInvitationHandlerImpl,
  RATE_LIMITS.AUTH_VERIFY
);

// Default export for function.json
export default authAcceptInvitationHandler;
