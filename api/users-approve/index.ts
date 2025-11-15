import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getUserByEmail, updateUser } from "../src/database/tableStorage";
import { getAuthenticatedUser, hasRole } from "../src/utils/auth";
import { sendAccountApprovedEmail } from "../src/utils/email";
import { success, error, forbidden, notFound, addCorsHeaders, unauthorized } from "../src/utils/response";

export async function usersApproveHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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

    const body = await request.json() as any;
    const { email } = body;

    if (!email) {
      return addCorsHeaders(error('Email is required'), request.headers.get('origin') || undefined);
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists
    const existing = await getUserByEmail(normalizedEmail);
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

    context.log('Approving user account:', normalizedEmail);

    // Update user status to active
    await updateUser(normalizedEmail, {
      accountStatus: 'active',
    });

    // Send account approved email
    await sendAccountApprovedEmail(normalizedEmail, context);

    return addCorsHeaders(
      success({
        message: 'User account approved successfully',
        email: normalizedEmail,
      }),
      request.headers.get('origin') || undefined
    );

  } catch (err: any) {
    context.error('Approve user error:', err);
    return addCorsHeaders(error('Server error', 500), request.headers.get('origin') || undefined);
  }
}

