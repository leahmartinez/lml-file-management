/**
 * User Profile Handler (Get and Update own profile)
 *
 * SECURITY:
 * - Rate limited (standard rate limit)
 * - Input validated with Zod schema for PUT
 * - Requires authentication
 * - Users can only access/modify their own profile
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getUserByEmail, updateUser } from "../database/tableStorage";
import { getAuthenticatedUser } from "../utils/auth";
import { addCorsHeaders, error, success, unauthorized } from "../utils/response";
import { safeParseJsonArray } from "../utils/json";
import { validateRequestBody, userProfileUpdateSchema, isValidationFailure } from '../utils/validation';
import { withRateLimit, RATE_LIMITS } from '../utils/rateLimit';

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
    sites: safeParseJsonArray(user.sites, []),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function userProfileHandlerImpl(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
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
      // SECURITY: Validate input using Zod schema
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

      // Handle photo with size guard
      if (body.photo !== undefined) {
        if (typeof body.photo === "string" && body.photo.startsWith("data:") && body.photo.length > MAX_TEXT_LENGTH) {
          context.warn("Profile photo too large for table storage. Skipping photo update.");
        } else {
          updates.photo = body.photo;
        }
      }

      // Handle bio with size guard
      if (body.bio !== undefined) {
        if (typeof body.bio === "string" && body.bio.length > MAX_TEXT_LENGTH) {
          context.warn("Profile bio too large for table storage. Truncating.");
          updates.bio = body.bio.slice(0, MAX_TEXT_LENGTH);
        } else {
          updates.bio = body.bio;
        }
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

// SECURITY: Wrap handler with rate limiting
export const userProfileHandler = withRateLimit(
  userProfileHandlerImpl,
  RATE_LIMITS.STANDARD
);

export default userProfileHandler;
