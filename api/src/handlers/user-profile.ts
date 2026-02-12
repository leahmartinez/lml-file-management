import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getUserByEmail, updateUser } from "../database/tableStorage";
import { getAuthenticatedUser } from "../utils/auth";
import { addCorsHeaders, error, success, unauthorized } from "../utils/response";

const PROFILE_FIELDS = [
  "firstName",
  "lastName",
  "position",
  "phone",
  "officePhone",
  "department",
  "photo",
  "bio",
  "category",
];
const MAX_TEXT_LENGTH = 60000;

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
    sites: user.sites ? JSON.parse(user.sites) : [],
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function userProfileHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    if (request.method === "OPTIONS") {
      return addCorsHeaders({ status: 200 }, request.headers.get("origin") || undefined);
    }

    const currentUser = getAuthenticatedUser(request);
    if (!currentUser) {
      return addCorsHeaders(unauthorized(), request.headers.get("origin") || undefined);
    }

    const user = await getUserByEmail(currentUser.email);
    if (!user) {
      return addCorsHeaders(error("User not found", 404), request.headers.get("origin") || undefined);
    }

    if (request.method === "PUT") {
      const body = (await request.json().catch(() => ({}))) as any;
      const updates: Record<string, any> = {};
      PROFILE_FIELDS.forEach((field) => {
        if (body[field] !== undefined) {
          updates[field] = typeof body[field] === "string" ? body[field].trim() : body[field];
        }
      });

      // Guard against oversized data URLs (Azure Table Storage limit ~64KB per property)
      if (typeof updates.photo === "string" && updates.photo.startsWith("data:") && updates.photo.length > MAX_TEXT_LENGTH) {
        context.warn("Profile photo too large for table storage. Skipping photo update.");
        delete updates.photo;
      }
      if (typeof updates.bio === "string" && updates.bio.length > MAX_TEXT_LENGTH) {
        context.warn("Profile bio too large for table storage. Truncating.");
        updates.bio = updates.bio.slice(0, MAX_TEXT_LENGTH);
      }
      updates.updatedAt = new Date().toISOString();

      const updated = await updateUser(user.email, updates);
      return addCorsHeaders(success(mapUserToProfile(updated)), request.headers.get("origin") || undefined);
    }

    return addCorsHeaders(success(mapUserToProfile(user)), request.headers.get("origin") || undefined);
  } catch (err: any) {
    context.error("User profile error:", err);
    return addCorsHeaders(error("Server error", 500), request.headers.get("origin") || undefined);
  }
}

export default userProfileHandler;
