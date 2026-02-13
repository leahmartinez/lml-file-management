import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getUserByEmail, updateUser } from "../database/tableStorage";
import { getAuthenticatedUser, hasRole } from "../utils/auth";
import { addCorsHeaders, error, forbidden, success, unauthorized } from "../utils/response";
import { safeParseJsonArray } from "../utils/json";
import { validateRequestBody, userProfileUpdateSchema, isValidationFailure } from '../utils/validation';

const MAX_TEXT_LENGTH = 100000;

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

    // PUT - super_admin can edit any user's profile
    if (request.method === "PUT") {
      if (!hasRole(currentUser, ['super_admin'])) {
        return addCorsHeaders(forbidden("Only super admins can edit other users' profiles"), request.headers.get("origin") || undefined);
      }

      const validation = await validateRequestBody(request, userProfileUpdateSchema);
      if (isValidationFailure(validation)) {
        return validation.error;
      }

      const body = validation.data;
      const updates: Record<string, any> = {};

      if (body.firstName !== undefined) updates.firstName = body.firstName;
      if (body.lastName !== undefined) updates.lastName = body.lastName;
      if (body.position !== undefined) updates.position = body.position;
      if (body.phone !== undefined) updates.phone = body.phone;
      if (body.officePhone !== undefined) updates.officePhone = body.officePhone;
      if (body.department !== undefined) updates.department = body.department;
      if (body.category !== undefined) updates.category = body.category;

      if (body.photo !== undefined) {
        if (typeof body.photo === "string" && body.photo.startsWith("data:") && body.photo.length > MAX_TEXT_LENGTH) {
          context.warn("Profile photo too large for table storage. Skipping photo update.");
        } else {
          updates.photo = body.photo;
        }
      }

      if (body.bio !== undefined) {
        if (typeof body.bio === "string" && body.bio.length > MAX_TEXT_LENGTH) {
          updates.bio = body.bio.slice(0, MAX_TEXT_LENGTH);
        } else {
          updates.bio = body.bio;
        }
      }

      updates.updatedAt = new Date().toISOString();

      const updated = await updateUser(email, updates);
      return addCorsHeaders(success(mapUserToProfile(updated)), request.headers.get("origin") || undefined);
    }

    // GET - any authenticated user can view profiles
    return addCorsHeaders(success(mapUserToProfile(user)), request.headers.get("origin") || undefined);
  } catch (err: any) {
    context.error("Profiles error:", err);
    return addCorsHeaders(error("Server error", 500), request.headers.get("origin") || undefined);
  }
}

export default profilesHandler;
