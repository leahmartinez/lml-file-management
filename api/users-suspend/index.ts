import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getUserByEmail, updateUser } from "../src/database/tableStorage";
import { getAuthenticatedUser, hasRole } from "../src/utils/auth";
import { success, error, forbidden, notFound, addCorsHeaders, unauthorized } from "../src/utils/response";

export async function usersSuspendHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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
      return addCorsHeaders(forbidden('Only admins can suspend users'), request.headers.get('origin') || undefined);
    }

    const body = await request.json() as any;
    const { email } = body;

    if (!email) {
      return addCorsHeaders(error('Email is required'), request.headers.get('origin') || undefined);
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Prevent self-suspension
    if (normalizedEmail === currentUser.email.toLowerCase()) {
      return addCorsHeaders(error('Cannot suspend your own account'), request.headers.get('origin') || undefined);
    }

    // Check if user exists
    const existing = await getUserByEmail(normalizedEmail);
    if (!existing) {
      return addCorsHeaders(notFound('User not found'), request.headers.get('origin') || undefined);
    }

    context.log('Suspending user account:', normalizedEmail);

    // Update user status to suspended
    await updateUser(normalizedEmail, {
      accountStatus: 'suspended',
    });

    return addCorsHeaders(
      success({
        message: 'User account suspended successfully',
        email: normalizedEmail,
      }),
      request.headers.get('origin') || undefined
    );

  } catch (err: any) {
    context.error('Suspend user error:', err);
    return addCorsHeaders(error('Server error', 500), request.headers.get('origin') || undefined);
  }
}

