/**
 * Alerts Handler
 *
 * SECURITY:
 * - Rate limited (standard for GET, write for PATCH)
 * - Requires authentication
 * - Users can only access their own alerts
 * - No admin bypass - alerts are personal to each user
 *
 * ENDPOINTS:
 * 1. GET /api/alerts - Get all alerts for current user (supports ?unreadOnly=true)
 * 2. PATCH /api/alerts/:id/read - Mark a single alert as read
 * 3. PATCH /api/alerts/read-all - Mark all alerts as read for current user
 * 4. GET /api/alerts/unread-count - Get unread alert count for current user
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import {
  getAllAlertsForUser,
  getUnreadAlertsForUser,
  getUnreadCountForUser,
  markAlertAsRead,
  markAllAlertsAsRead,
} from "../database/tableStorage";
import { addCorsHeaders, success, unauthorized, error, forbidden, notFound } from "../utils/response";
import { getAuthenticatedUser } from "../utils/auth";
import { withRateLimit, RATE_LIMITS } from "../utils/rateLimit";

/**
 * Map alert entity to response format
 */
function mapAlertToResponse(alert: any): any {
  return {
    id: alert.rowKey,
    type: alert.type,
    title: alert.title,
    message: alert.message,
    entityType: alert.entityType,
    entityId: alert.entityId,
    projectId: alert.projectId || '',
    siteId: alert.siteId || '',
    isRead: alert.isRead,
    createdAt: alert.createdAt,
  };
}

/**
 * Main alerts handler implementation
 */
async function alertsHandlerImpl(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return addCorsHeaders({ status: 200 }, request.headers.get("origin") || undefined);
    }

    // AUTHENTICATION: All endpoints require valid JWT
    const user = getAuthenticatedUser(request);
    if (!user) {
      return addCorsHeaders(unauthorized(), request.headers.get("origin") || undefined);
    }

    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    // pathSegments for /api/alerts: ['api', 'alerts']
    // pathSegments for /api/alerts/unread-count: ['api', 'alerts', 'unread-count']
    // pathSegments for /api/alerts/read-all: ['api', 'alerts', 'read-all']
    // pathSegments for /api/alerts/:id/read: ['api', 'alerts', ':id', 'read']

    // =========================================================================
    // GET /api/alerts/unread-count - Get unread count
    // =========================================================================
    if (
      request.method === "GET" &&
      pathSegments.length === 3 &&
      pathSegments[2] === "unread-count"
    ) {
      context.log(`GET /api/alerts/unread-count - Fetching unread count for ${user.email}`);

      const count = await getUnreadCountForUser(user.email);

      return addCorsHeaders(
        success({ count }),
        request.headers.get("origin") || undefined
      );
    }

    // =========================================================================
    // GET /api/alerts - List alerts for current user
    // =========================================================================
    if (request.method === "GET" && pathSegments.length === 2) {
      context.log(`GET /api/alerts - Listing alerts for ${user.email}`);

      // Check for unreadOnly query parameter
      const unreadOnlyParam = request.query.get('unreadOnly');
      const unreadOnly = unreadOnlyParam === 'true';

      // Fetch alerts based on filter
      const alerts = unreadOnly
        ? await getUnreadAlertsForUser(user.email)
        : await getAllAlertsForUser(user.email);

      // Map to response format
      const mapped = alerts.map(mapAlertToResponse);

      return addCorsHeaders(
        success({ alerts: mapped }),
        request.headers.get("origin") || undefined
      );
    }

    // =========================================================================
    // PATCH /api/alerts/read-all - Mark all alerts as read
    // =========================================================================
    if (
      request.method === "PATCH" &&
      pathSegments.length === 3 &&
      pathSegments[2] === "read-all"
    ) {
      context.log(`PATCH /api/alerts/read-all - Marking all alerts as read for ${user.email}`);

      const count = await markAllAlertsAsRead(user.email);

      return addCorsHeaders(
        success({ success: true, count }),
        request.headers.get("origin") || undefined
      );
    }

    // =========================================================================
    // PATCH /api/alerts/:id/read - Mark single alert as read
    // =========================================================================
    if (
      request.method === "PATCH" &&
      pathSegments.length === 4 &&
      pathSegments[3] === "read"
    ) {
      const alertId = pathSegments[2];
      context.log(`PATCH /api/alerts/${alertId}/read - Marking alert as read`);

      // Attempt to mark the alert as read
      // This will fail if the alert doesn't exist or doesn't belong to the user
      const updated = await markAlertAsRead(alertId, user.email);

      if (!updated) {
        return addCorsHeaders(
          notFound(`Alert with ID "${alertId}" not found or you don't have permission to access it`),
          request.headers.get("origin") || undefined
        );
      }

      const response = mapAlertToResponse(updated);

      return addCorsHeaders(
        success({ alert: response }),
        request.headers.get("origin") || undefined
      );
    }

    // If we reach here, no route matched
    return addCorsHeaders(
      error("Method not allowed", 405),
      request.headers.get("origin") || undefined
    );
  } catch (err: any) {
    context.error("Alerts handler error:", err);
    return addCorsHeaders(
      error("Server error", 500),
      request.headers.get("origin") || undefined
    );
  }
}

// SECURITY: Wrap handler with rate limiting
export const alertsHandler = withRateLimit(alertsHandlerImpl, RATE_LIMITS.STANDARD);

export default alertsHandler;
