/**
 * Projects Delete Handler
 *
 * SECURITY:
 * - Rate limited (admin rate limit)
 * - Input validated with Zod schema
 * - Requires authentication and admin/consultant role
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { deleteProject } from '../database/tableStorage';
import { getAuthenticatedUser, hasRole } from '../utils/auth';
import { success, error, forbidden, addCorsHeaders, unauthorized } from '../utils/response';
import { validateRequestBody, deleteProjectSchema, isValidationFailure } from '../utils/validation';
import { withRateLimit, RATE_LIMITS } from '../utils/rateLimit';

async function projectsDeleteHandlerImpl(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
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

    // SECURITY: Validate input using Zod schema
    const validation = await validateRequestBody(request, deleteProjectSchema);
    if (isValidationFailure(validation)) {
      return validation.error;
    }

    const { projectCode } = validation.data;

    // Delete project and all its stages
    await deleteProject(projectCode);

    return addCorsHeaders(
      success({ message: `Project ${projectCode} and all its stages deleted successfully` }),
      request.headers.get('origin') || undefined
    );

  } catch (err: any) {
    context.error('Delete project error:', err);
    return addCorsHeaders(error('Server error', 500), request.headers.get('origin') || undefined);
  }
}

// SECURITY: Wrap handler with rate limiting (admin rate limit)
export const projectsDeleteHandler = withRateLimit(
  projectsDeleteHandlerImpl,
  RATE_LIMITS.ADMIN
);

// Default export for function.json
export default projectsDeleteHandler;
