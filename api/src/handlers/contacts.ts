/**
 * Contacts Handler (List, Create, Update, Delete)
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
import { getAllContacts, createContact, updateContact, deleteContact, ContactEntity } from "../database/tableStorage";
import { validateRequestBody, contactSchema, isValidationFailure } from '../utils/validation';
import { withRateLimit, RATE_LIMITS } from '../utils/rateLimit';

function nowIso() {
  return new Date().toISOString();
}

async function contactsHandlerImpl(
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
      const contacts = await getAllContacts();
      return addCorsHeaders(success(contacts), request.headers.get("origin") || undefined);
    }

    if (request.method === "POST") {
      // SECURITY: Validate input using Zod schema
      const validation = await validateRequestBody(request, contactSchema);
      if (isValidationFailure(validation)) {
        return validation.error;
      }

      const body = validation.data;
      const id = body.id || crypto.randomUUID();
      const createdAt = nowIso();

      const entity: ContactEntity = {
        partitionKey: "CONTACT",
        rowKey: id,
        id,
        firstName: body.firstName || "",
        lastName: body.lastName || "",
        position: body.position || "",
        company: body.company,
        businessId: body.businessId,
        email: body.email,
        phone: body.phone,
        officePhone: body.officePhone,
        category: body.category,
        photo: body.photo,
        createdBy: user.email,
        createdAt,
        updatedAt: createdAt,
      };

      const created = await createContact(entity);
      return addCorsHeaders(success(created, 201), request.headers.get("origin") || undefined);
    }

    if (request.method === "PUT") {
      // SECURITY: Validate input using Zod schema
      const validation = await validateRequestBody(request, contactSchema);
      if (isValidationFailure(validation)) {
        return validation.error;
      }

      const body = validation.data;
      const id = body.id || request.query.get("id");

      if (!id) {
        return addCorsHeaders(error("Contact id is required", 400), request.headers.get("origin") || undefined);
      }

      const updated = await updateContact(id, {
        ...body,
        updatedAt: nowIso(),
      });
      return addCorsHeaders(success(updated), request.headers.get("origin") || undefined);
    }

    if (request.method === "DELETE") {
      let id = request.query.get("id");

      if (!id) {
        try {
          const rawBody = await request.json() as any;
          id = rawBody?.id;
        } catch {
          // ignore parse errors for empty body
        }
      }

      if (!id) {
        return addCorsHeaders(error("Contact id is required", 400), request.headers.get("origin") || undefined);
      }

      await deleteContact(id);
      return addCorsHeaders(success({ message: "Contact deleted" }), request.headers.get("origin") || undefined);
    }

    return addCorsHeaders(error("Method not allowed", 405), request.headers.get("origin") || undefined);
  } catch (err: any) {
    context.error("Contacts error:", err);
    return addCorsHeaders(error("Failed to process contacts request", 500), request.headers.get("origin") || undefined);
  }
}

// SECURITY: Wrap handler with rate limiting
export const contactsHandler = withRateLimit(
  contactsHandlerImpl,
  RATE_LIMITS.STANDARD
);

export default contactsHandler;
