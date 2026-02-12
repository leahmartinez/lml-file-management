/**
 * Send Invitation Handler
 *
 * SECURITY:
 * - Rate limited to prevent spam invitations (20 per hour)
 * - Input validated with Zod schema
 * - Requires authentication and admin/consultant role
 * - Email normalized to prevent duplicates
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getUserByEmail, createUser } from '../database/tableStorage';
import { getAuthenticatedUser, hasRole, hashPassword, generateSecureToken, generateTokenExpiry } from '../utils/auth';
import { sendInvitationEmail } from '../utils/email';
import { success, error, addCorsHeaders, forbidden, unauthorized } from '../utils/response';
import { validateRequestBody, sendInvitationSchema, isValidationFailure } from '../utils/validation';
import { withRateLimit, RATE_LIMITS } from '../utils/rateLimit';

async function authSendInvitationHandlerImpl(
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

    // Check authorization - only admins and consultants can invite users
    if (!hasRole(currentUser, ['admin', 'consultant'])) {
      return addCorsHeaders(forbidden('Only admins can invite users'), request.headers.get('origin') || undefined);
    }

    context.log('Invitation request from:', currentUser.email);

    // SECURITY: Validate input using Zod schema
    const validation = await validateRequestBody(request, sendInvitationSchema);
    if (isValidationFailure(validation)) {
      return validation.error;
    }

    const { email, role, sites } = validation.data;
    // email is already normalized by schema transform

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return addCorsHeaders(
        error('A user with this email already exists', 409),
        request.headers.get('origin') || undefined
      );
    }

    context.log('Creating invitation for:', email);

    // Generate invitation token (7 days expiry)
    const invitationToken = generateSecureToken();
    const invitationExpiry = generateTokenExpiry(24 * 7);

    // Create user with pending status and temporary password
    const tempPasswordHash = await hashPassword(generateSecureToken());

    await createUser({
      email,
      passwordHash: tempPasswordHash,
      role,
      sites: sites || [],
      createdBy: currentUser.email,
      accountStatus: 'active',
      emailVerified: false,
      emailVerificationToken: invitationToken,
      emailVerificationExpiry: invitationExpiry,
      mustChangePassword: true,
    });

    context.log('User invitation created, sending email');

    // Send invitation email
    await sendInvitationEmail(email, invitationToken, role, context);

    return addCorsHeaders(
      success({
        message: 'Invitation sent successfully',
        email,
      }),
      request.headers.get('origin') || undefined
    );

  } catch (err: any) {
    const errorMessage = err?.message || 'Failed to send invitation. Please try again.';
    context.error('Send invitation error:', err);
    return addCorsHeaders(
      error(errorMessage, 500),
      request.headers.get('origin') || undefined
    );
  }
}

// SECURITY: Wrap handler with rate limiting (20 invitations per hour)
export const authSendInvitationHandler = withRateLimit(
  authSendInvitationHandlerImpl,
  RATE_LIMITS.AUTH_INVITATION
);

// Default export for function.json
export default authSendInvitationHandler;
