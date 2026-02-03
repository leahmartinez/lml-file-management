import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getAllUsers, getUserByEmail, createUser } from '../database/tableStorage';
import { getAuthenticatedUser, hasRole, hashPassword } from '../utils/auth';
import { success, error, forbidden, addCorsHeaders, unauthorized } from '../utils/response';

export async function usersHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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
      return addCorsHeaders(forbidden('Only admins can manage users'), request.headers.get('origin') || undefined);
    }

    if (request.method === 'GET') {
      // List all users
      const users = await getAllUsers();

      // Remove password hashes from response
      const safeUsers = users.map(u => ({
        email: u.email,
        role: u.role,
        sites: JSON.parse(u.sites || '[]'),
        createdAt: u.createdAt,
        lastLogin: u.lastLogin,
        createdBy: u.createdBy,
        accountStatus: u.accountStatus,
        emailVerified: u.emailVerified,
        mustChangePassword: u.mustChangePassword || false,
      }));

      return addCorsHeaders(success(safeUsers), request.headers.get('origin') || undefined);

    } else if (request.method === 'POST') {
      // Create user
      const body = await request.json() as any;
      const { email, password, role, sites, mustChangePassword } = body;

      if (!email || !password || !role) {
        return addCorsHeaders(error('Email, password, and role are required'), request.headers.get('origin') || undefined);
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Check if user already exists
      const existing = await getUserByEmail(normalizedEmail);
      if (existing) {
        return addCorsHeaders(
          error(`User with email "${normalizedEmail}" already exists`),
          request.headers.get('origin') || undefined
        );
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user
      const newUser = await createUser({
        email: normalizedEmail,
        passwordHash,
        role,
        sites: sites || [],
        createdBy: currentUser.email,
        mustChangePassword: !!mustChangePassword,
        accountStatus: 'active',
        emailVerified: true,
      });

      return addCorsHeaders(
        success({
          email: newUser.email,
          role: newUser.role,
          sites: JSON.parse(newUser.sites || '[]'),
          createdAt: newUser.createdAt,
        }, 201),
        request.headers.get('origin') || undefined
      );
    }

  } catch (err: any) {
    context.error('Users error:', err);
    return addCorsHeaders(error('Server error', 500), request.headers.get('origin') || undefined);
  }
}

// Default export for function.json
export default usersHandler;
