import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getUserByEmail } from "../database/tableStorage";
import { getAuthenticatedUser } from "../utils/auth";
import { addCorsHeaders, error, success, unauthorized } from "../utils/response";
import { safeParseJsonArray } from "../utils/json";

function mapUserToProfile(user: any) {
  return {
    email: user.email,
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    position: user.position || "",
    phone: user.phone || "",
    officePhone: user.officePhone || "",
    department: user.department || "",
    photo: user.photo || "",
    bio: user.bio || "",
    category: user.category || "",
    sites: safeParseJsonArray(user.sites, []),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function profilesHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    if (request.method === "OPTIONS") {
      return addCorsHeaders({ status: 200 }, request.headers.get("origin") || undefined);
    }

    const currentUser = getAuthenticatedUser(request);
    if (!currentUser) {
      return addCorsHeaders(unauthorized(), request.headers.get("origin") || undefined);
    }

    const emailParam = (request as any).params?.email || request.query.get("email");
    const email = emailParam ? decodeURIComponent(emailParam) : "";
    if (!email) {
      return addCorsHeaders(error("Email is required", 400), request.headers.get("origin") || undefined);
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return addCorsHeaders(error("User not found", 404), request.headers.get("origin") || undefined);
    }

    return addCorsHeaders(success(mapUserToProfile(user)), request.headers.get("origin") || undefined);
  } catch (err: any) {
    context.error("Profiles fetch error:", err);
    return addCorsHeaders(error("Server error", 500), request.headers.get("origin") || undefined);
  }
}

export default profilesHandler;
