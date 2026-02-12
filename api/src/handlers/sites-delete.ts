/**
 * Sites Delete Handler
 *
 * SECURITY:
 * - Rate limited (admin rate limit)
 * - Input validated with Zod schema
 * - Requires authentication and admin role
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { deleteSite } from '../database/tableStorage';
import { getAuthenticatedUser, hasRole } from '../utils/auth';
import { success, error, forbidden, notFound, addCorsHeaders, unauthorized } from '../utils/response';
import { validateRequestBody, deleteSiteSchema, isValidationFailure } from '../utils/validation';
import { withRateLimit, RATE_LIMITS } from '../utils/rateLimit';

async function sitesDeleteHandlerImpl(
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

    // Check authorization - only admins can delete sites
    if (!hasRole(currentUser, ['admin'])) {
      return addCorsHeaders(forbidden('Only admins can delete sites'), request.headers.get('origin') || undefined);
    }

    // SECURITY: Validate input using Zod schema
    const validation = await validateRequestBody(request, deleteSiteSchema);
    if (isValidationFailure(validation)) {
      return validation.error;
    }

    const { siteId } = validation.data;

    // Delete site and all its projects and stages
    await deleteSite(siteId);

    return addCorsHeaders(
      success({ message: `Site ${siteId} and all its projects deleted successfully` }),
      request.headers.get('origin') || undefined
    );

  } catch (err: any) {
    context.error('Delete site error:', err);
    // Check if it's a "not found" error
    if (err.message && err.message.includes('not found')) {
      return addCorsHeaders(notFound(err.message), request.headers.get('origin') || undefined);
    }
    return addCorsHeaders(error('Server error', 500), request.headers.get('origin') || undefined);
  }
}

// SECURITY: Wrap handler with rate limiting (admin rate limit)
export const sitesDeleteHandler = withRateLimit(
  sitesDeleteHandlerImpl,
  RATE_LIMITS.ADMIN
);

// Default export for function.json
export default sitesDeleteHandler;
