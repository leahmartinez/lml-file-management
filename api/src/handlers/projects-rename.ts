import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { renameProjectCode } from "../database/tableStorage";
import { addCorsHeaders, success, unauthorized, error } from "../utils/response";
import { getAuthenticatedUser } from "../utils/auth";

export async function projectsRenameHandler(
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

    const rawBody = await request.json().catch(() => ({}));
    const body = (rawBody && typeof rawBody === "object") ? (rawBody as Record<string, any>) : {};

    const oldCode = (body.projectCode || "").toString().trim();
    const newCode = (body.newProjectCode || "").toString().trim();

    if (!oldCode || !newCode) {
      return addCorsHeaders(error("Both projectCode and newProjectCode are required", 400), request.headers.get("origin") || undefined);
    }

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

export default projectsRenameHandler;
