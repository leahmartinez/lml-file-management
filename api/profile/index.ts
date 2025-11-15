import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getUserByEmail, updateUser } from "../src/database/tableStorage";
import { getAuthenticatedUser } from "../src/utils/auth";
import { success, error, unauthorized, addCorsHeaders } from "../src/utils/response";

export async function profileHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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

    // Get user from database
    const user = await getUserByEmail(currentUser.email);
    if (!user) {
      return addCorsHeaders(error('User not found', 404), request.headers.get('origin') || undefined);
    }

    // Update last login
    await updateUser(user.email, {
      lastLogin: new Date().toISOString(),
    });

    // Return user profile (no password)
    return addCorsHeaders(
      success({
        email: user.email,
        role: user.role,
        sites: JSON.parse(user.sites || '[]'),
        lastLogin: new Date().toISOString(),
        createdAt: user.createdAt,
      }),
      request.headers.get('origin') || undefined
    );
  } catch (err: any) {
    context.error('Get profile error:', err);
    return addCorsHeaders(error('Server error', 500), request.headers.get('origin') || undefined);
  }
}

