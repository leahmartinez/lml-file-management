import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getUserByEmail, updateUser } from '../database/tableStorage';
import { hashPassword, isTokenExpired } from '../utils/auth';
import { success, error, addCorsHeaders } from '../utils/response';

interface AcceptInvitationRequest {
  email: string;
  token: string;
  password: string;
}

export async function authAcceptInvitationHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return addCorsHeaders({ status: 200 }, request.headers.get('origin') || undefined);
    }

    context.log('Accept invitation attempt');

    const body = await request.json() as AcceptInvitationRequest;
    const { email, token, password } = body;

    if (!email || !token || !password) {
      return addCorsHeaders(
        error('Email, token, and password are required', 400),
        request.headers.get('origin') || undefined
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return addCorsHeaders(
        error('Password must be at least 8 characters long', 400),
        request.headers.get('origin') || undefined
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Get user
    const user = await getUserByEmail(normalizedEmail);
    if (!user) {
      return addCorsHeaders(
        error('Invalid invitation link', 404),
        request.headers.get('origin') || undefined
      );
    }

    // Check if token matches
    if (user.emailVerificationToken !== token) {
      context.log('Invalid token for:', normalizedEmail);
      return addCorsHeaders(
        error('Invalid or expired invitation link', 400),
        request.headers.get('origin') || undefined
      );
    }

    // Check if token has expired
    if (isTokenExpired(user.emailVerificationExpiry)) {
      context.log('Expired invitation for:', normalizedEmail);
      return addCorsHeaders(
        error('Invitation link has expired. Please request a new invitation.', 400),
        request.headers.get('origin') || undefined
      );
    }

    context.log('Accepting invitation for:', normalizedEmail);

    // Hash the new password
    const passwordHash = await hashPassword(password);

    // Update user - set password, mark email as verified, clear invitation token
    await updateUser(normalizedEmail, {
      passwordHash,
      emailVerified: true,
      emailVerificationToken: undefined,
      emailVerificationExpiry: undefined,
      accountStatus: 'active',
      mustChangePassword: false,
    });

    context.log('Invitation accepted successfully for:', normalizedEmail);

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

// Default export for function.json
export default authAcceptInvitationHandler;
