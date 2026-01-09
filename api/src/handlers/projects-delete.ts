import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { deleteProject } from '../database/tableStorage';
import { getAuthenticatedUser, hasRole } from '../utils/auth';
import { success, error, forbidden, notFound, addCorsHeaders, unauthorized } from '../utils/response';

export async function projectsDeleteHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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

    // Check authorization - only admins and consultants can delete projects
    if (!hasRole(currentUser, ['admin', 'consultant'])) {
      return addCorsHeaders(forbidden('Only admins and consultants can delete projects'), request.headers.get('origin') || undefined);
    }

    const body = await request.json() as any;

    // Get projectCode from body or query params
    const projectCode = body.projectCode || request.query.get('projectCode');

    if (!projectCode) {
      return addCorsHeaders(error('projectCode parameter required'), request.headers.get('origin') || undefined);
    }

    // Delete project and all its stages
    await deleteProject(projectCode);

    return addCorsHeaders(success({ message: `Project ${projectCode} and all its stages deleted successfully` }), request.headers.get('origin') || undefined);

  } catch (err: any) {
    context.error('Delete project error:', err);
    return addCorsHeaders(error('Server error', 500), request.headers.get('origin') || undefined);
  }
}

// Default export for function.json
export default projectsDeleteHandler;
