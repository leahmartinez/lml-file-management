/**
 * Projects Rename Handler
 *
 * SECURITY:
 * - Rate limited (write rate limit)
 * - Input validated with Zod schema
 * - Requires authentication
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { renameProjectCode } from "../database/tableStorage";
import { addCorsHeaders, success, unauthorized, error } from "../utils/response";
import { getAuthenticatedUser } from "../utils/auth";
import { validateRequestBody, renameProjectSchema, isValidationFailure } from '../utils/validation';
import { withRateLimit, RATE_LIMITS } from '../utils/rateLimit';

async function projectsRenameHandlerImpl(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    if (request.method === "OPTIONS") {
      return addCorsHeaders({ status: 200 }, request.headers.get("origin") || undefined);
    }

    const user = getAuthenticatedUser(request);
    if (!user) {
      return addCorsHeaders(unauthorized(), request.headers.get("origin") || undefined);
    }

    if (request.method !== "PUT") {
      return addCorsHeaders(error("Method not allowed", 405), request.headers.get("origin") || undefined);
    }

    // SECURITY: Validate input using Zod schema
    const validation = await validateRequestBody(request, renameProjectSchema);
    if (isValidationFailure(validation)) {
      return validation.error;
    }

    const { projectCode: oldCode, newProjectCode: newCode } = validation.data;

    if (oldCode === newCode) {
      return addCorsHeaders(success({
        projectCode: oldCode,
        newProjectCode: newCode,
        stagesMigrated: 0,
        sitesUpdated: 0,
      }), request.headers.get("origin") || undefined);
    }

    const result = await renameProjectCode(oldCode, newCode);
    return addCorsHeaders(success({
      projectCode: oldCode,
      newProjectCode: newCode,
      stagesMigrated: result.stagesMigrated,
      sitesUpdated: result.sitesUpdated,
    }), request.headers.get("origin") || undefined);
  } catch (err: any) {
    context.error("Project rename error:", err);
    const message = err?.message || "Server error";
    const status = message.includes("not found")
      ? 404
      : message.includes("exists")
        ? 409
        : 500;
    return addCorsHeaders(error(message, status), request.headers.get("origin") || undefined);
  }
}

// SECURITY: Wrap handler with rate limiting
export const projectsRenameHandler = withRateLimit(
  projectsRenameHandlerImpl,
  RATE_LIMITS.WRITE
);

export default projectsRenameHandler;
