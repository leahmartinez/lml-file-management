import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { deleteSite } from '../database/tableStorage';
import { getAuthenticatedUser, hasRole } from '../utils/auth';
import { success, error, forbidden, notFound, addCorsHeaders, unauthorized } from '../utils/response';

export async function sitesDeleteHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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

    // Check authorization - only admins can delete sites
    if (!hasRole(currentUser, ['admin'])) {
      return addCorsHeaders(forbidden('Only admins can delete sites'), request.headers.get('origin') || undefined);
    }

    const body = await request.json() as any;

    // Get siteId from body or query params
    const siteId = body.siteId || request.query.get('siteId');

    if (!siteId) {
      return addCorsHeaders(error('siteId parameter required'), request.headers.get('origin') || undefined);
    }

    // Delete site and all its projects and stages
    await deleteSite(siteId);

    return addCorsHeaders(success({ message: `Site ${siteId} and all its projects deleted successfully` }), request.headers.get('origin') || undefined);

  } catch (err: any) {
    context.error('Delete site error:', err);
    // Check if it's a "not found" error
    if (err.message && err.message.includes('not found')) {
      return addCorsHeaders(notFound(err.message), request.headers.get('origin') || undefined);
    }
    return addCorsHeaders(error('Server error', 500), request.headers.get('origin') || undefined);
  }
}

// Default export for function.json
export default sitesDeleteHandler;
