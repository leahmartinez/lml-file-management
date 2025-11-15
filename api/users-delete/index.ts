import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getUserByEmail, deleteUser } from "../src/database/tableStorage";
import { getAuthenticatedUser, hasRole } from "../src/utils/auth";
import { success, error, forbidden, notFound, addCorsHeaders, unauthorized } from "../src/utils/response";

export async function usersDeleteHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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

    const body = await request.json() as any;

    // Get email from body or query params
    const email = body.email || request.query.get('email');

    if (!email) {
      return addCorsHeaders(error('Email parameter required'), request.headers.get('origin') || undefined);
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Prevent self-deletion
    if (normalizedEmail === currentUser.email.toLowerCase()) {
      return addCorsHeaders(error('Cannot delete your own account'), request.headers.get('origin') || undefined);
    }

    // Check if user exists
    const existing = await getUserByEmail(normalizedEmail);
    if (!existing) {
      return addCorsHeaders(notFound('User not found'), request.headers.get('origin') || undefined);
    }

    // Delete user
    await deleteUser(normalizedEmail);

    return addCorsHeaders(success({ message: 'User deleted successfully' }), request.headers.get('origin') || undefined);

  } catch (err: any) {
    context.error('Delete user error:', err);
    return addCorsHeaders(error('Server error', 500), request.headers.get('origin') || undefined);
  }
}

