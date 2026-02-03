import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getUserByEmail, updateUser } from '../database/tableStorage';
import { getAuthenticatedUser, hasRole, hashPassword } from '../utils/auth';
import { success, error, forbidden, notFound, addCorsHeaders, unauthorized } from '../utils/response';

export async function usersUpdateHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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
      return addCorsHeaders(forbidden('Only admins can update users'), request.headers.get('origin') || undefined);
    }

    const body = await request.json() as any;

    // Get email from body or query params
    const email = body.email || request.query.get('email');

    if (!email) {
      return addCorsHeaders(error('Email parameter required'), request.headers.get('origin') || undefined);
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Extract update fields from body
    const { role, sites, password, mustChangePassword } = body;

    // Check if user exists
    const existing = await getUserByEmail(normalizedEmail);
    if (!existing) {
      return addCorsHeaders(notFound('User not found'), request.headers.get('origin') || undefined);
    }

    // Prepare updates
    const updates: any = {};
    if (role) updates.role = role;
    if (sites !== undefined) updates.sites = sites;
    if (password) updates.passwordHash = await hashPassword(password);
    if (typeof mustChangePassword === 'boolean') updates.mustChangePassword = mustChangePassword;

    // Update user
    const updated = await updateUser(normalizedEmail, updates);

    return addCorsHeaders(
      success({
        email: updated.email,
        role: updated.role,
        sites: JSON.parse(updated.sites || '[]'),
      }),
      request.headers.get('origin') || undefined
    );

  } catch (err: any) {
    context.error('Update user error:', err);
    return addCorsHeaders(error('Server error', 500), request.headers.get('origin') || undefined);
  }
}

// Default export for function.json
export default usersUpdateHandler;
