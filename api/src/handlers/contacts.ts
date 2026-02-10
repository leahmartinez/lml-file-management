import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import crypto from "crypto";
import { addCorsHeaders, success, unauthorized, error } from "../utils/response";
import { getAuthenticatedUser } from "../utils/auth";
import { getAllContacts, createContact, updateContact, deleteContact, ContactEntity } from "../database/tableStorage";

function nowIso() {
  return new Date().toISOString();
}

export async function contactsHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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

    const body = (await request.json()) as Partial<ContactEntity>;

    if (request.method === "POST") {
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
          const body = (await request.json()) as Partial<ContactEntity>;
          id = body.id;
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

export default contactsHandler;
