/**
 * Businesses Handler (List, Create, Update, Delete)
 *
 * SECURITY:
 * - Rate limited (standard for GET, write for POST/PUT/DELETE)
 * - Input validated with Zod schema for POST/PUT
 * - Requires authentication
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import crypto from "crypto";
import { addCorsHeaders, success, unauthorized, error } from "../utils/response";
import { getAuthenticatedUser } from "../utils/auth";
import { getAllBusinesses, createBusiness, updateBusiness, deleteBusiness, BusinessEntity } from "../database/tableStorage";
import { validateRequestBody, businessSchema, isValidationFailure } from '../utils/validation';
import { withRateLimit, RATE_LIMITS } from '../utils/rateLimit';

function nowIso() {
  return new Date().toISOString();
}

async function businessesHandlerImpl(
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

    if (request.method === "GET") {
      const businesses = await getAllBusinesses();
      return addCorsHeaders(success(businesses), request.headers.get("origin") || undefined);
    }

    if (request.method === "POST") {
      // SECURITY: Validate input using Zod schema
      const validation = await validateRequestBody(request, businessSchema);
      if (isValidationFailure(validation)) {
        return validation.error;
      }

      const body = validation.data;
      const id = body.id || `biz_${crypto.randomUUID()}`;
      const createdAt = nowIso();

      const entity: BusinessEntity = {
        partitionKey: "BUSINESS",
        rowKey: id,
        id,
        name: body.name,
        description: body.description,
        address: body.address,
        city: body.city,
        postcode: body.postcode,
        state: body.state,
        website: body.website,
        phone: body.phone,
        email: body.email,
        category: body.category,
        logo: body.logo,
        createdBy: user.email,
        createdAt,
        updatedAt: createdAt,
      };

      const created = await createBusiness(entity);
      return addCorsHeaders(success(created, 201), request.headers.get("origin") || undefined);
    }

    if (request.method === "PUT") {
      // SECURITY: Validate input using Zod schema
      const validation = await validateRequestBody(request, businessSchema);
      if (isValidationFailure(validation)) {
        return validation.error;
      }

      const body = validation.data;
      const id = body.id || request.query.get("id");

      if (!id) {
        return addCorsHeaders(error("Business id is required", 400), request.headers.get("origin") || undefined);
      }

      const updated = await updateBusiness(id, {
        ...body,
        updatedAt: nowIso(),
      });
      return addCorsHeaders(success(updated), request.headers.get("origin") || undefined);
    }

    if (request.method === "DELETE") {
      const id = request.query.get("id");
      if (!id) {
        return addCorsHeaders(error("Business id is required", 400), request.headers.get("origin") || undefined);
      }
      await deleteBusiness(id);
      return addCorsHeaders(success({ message: "Business deleted" }), request.headers.get("origin") || undefined);
    }

    return addCorsHeaders(error("Method not allowed", 405), request.headers.get("origin") || undefined);
  } catch (err: any) {
    context.error("Businesses error:", err);
    return addCorsHeaders(error("Failed to process businesses request", 500), request.headers.get("origin") || undefined);
  }
}

// SECURITY: Wrap handler with rate limiting
export const businessesHandler = withRateLimit(
  businessesHandlerImpl,
  RATE_LIMITS.STANDARD
);

export default businessesHandler;
