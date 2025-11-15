import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getUserByEmail, createUser } from '../database/tableStorage';
import { getAuthenticatedUser, hasRole, hashPassword, generateSecureToken, generateTokenExpiry } from '../utils/auth';
import { sendInvitationEmail } from '../utils/email';
import { success, error, addCorsHeaders, forbidden, unauthorized } from '../utils/response';

interface SendInvitationRequest {
  email: string;
  role: string;
  sites: string[];
}

export async function authSendInvitationHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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

    const body = await request.json() as SendInvitationRequest;
    const { email, role, sites } = body;

    if (!email || !role) {
      return addCorsHeaders(
        error('Email and role are required', 400),
        request.headers.get('origin') || undefined
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return addCorsHeaders(
        error('Invalid email format', 400),
        request.headers.get('origin') || undefined
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await getUserByEmail(normalizedEmail);
    if (existingUser) {
      return addCorsHeaders(
        error('A user with this email already exists', 409),
        request.headers.get('origin') || undefined
      );
    }

    context.log('Creating invitation for:', normalizedEmail);

    // Generate invitation token (7 days expiry)
    const invitationToken = generateSecureToken();
    const invitationExpiry = generateTokenExpiry(24 * 7);

    // Create user with pending status and temporary password
    const tempPasswordHash = await hashPassword(generateSecureToken());

    await createUser({
      email: normalizedEmail,
      passwordHash: tempPasswordHash,
      role,
      sites: sites || [],
      createdBy: currentUser.email,
      accountStatus: 'pending',
      emailVerified: false,
      emailVerificationToken: invitationToken,
      emailVerificationExpiry: invitationExpiry,
    });

    context.log('User invitation created, sending email');

    // Send invitation email
    await sendInvitationEmail(normalizedEmail, invitationToken, role, context);

    return addCorsHeaders(
      success({
        message: 'Invitation sent successfully',
        email: normalizedEmail,
      }),
      request.headers.get('origin') || undefined
    );

  } catch (err: any) {
    context.error('Send invitation error:', err);
    return addCorsHeaders(
      error('Failed to send invitation. Please try again.', 500),
      request.headers.get('origin') || undefined
    );
  }
}

// Default export for function.json
export default authSendInvitationHandler;
