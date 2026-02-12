/**
 * Sites Handler (List, Create, Update)
 *
 * SECURITY:
 * - Rate limited (standard for GET, write for POST/PUT)
 * - Input validated with Zod schema for POST/PUT
 * - Requires authentication
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { createSite, getAllSites, getSiteById, updateSite } from "../database/tableStorage";
import { addCorsHeaders, success, unauthorized, error } from "../utils/response";
import { getAuthenticatedUser } from "../utils/auth";
import { validateRequestBody, createSiteSchema, updateSiteSchema, isValidationFailure } from '../utils/validation';
import { withRateLimit, RATE_LIMITS } from '../utils/rateLimit';

async function sitesHandlerImpl(
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

    if (request.method === "POST") {
      // SECURITY: Validate input using Zod schema
      const validation = await validateRequestBody(request, createSiteSchema);
      if (isValidationFailure(validation)) {
        return validation.error;
      }

      const body = validation.data;
      const siteId = body.siteId || body.building;
      const building = body.building;

      const existing = await getSiteById(siteId);
      if (existing) {
        return addCorsHeaders(error("Site already exists", 409), request.headers.get("origin") || undefined);
      }

      const projectCodes = body.projectCodes || [];
      const contactEmails = body.contacts || body.contactEmails || [];

      const entity = {
        partitionKey: "SITE",
        rowKey: siteId,
        siteId,
        building,
        address: body.address || "",
        city: body.city || "",
        state: body.state || "",
        postcode: body.postcode || "",
        createdAt: body.createdAt || new Date().toISOString(),
        createdBy: user.email,
        projectCodes: JSON.stringify(projectCodes),
        contactEmails: JSON.stringify(contactEmails),
      };

      const created = await createSite(entity);
      return addCorsHeaders(success({
        siteId: created.siteId,
        building: created.building,
        address: created.address,
        city: created.city,
        state: created.state,
        postcode: created.postcode,
        createdAt: created.createdAt,
        projectCodes,
        contacts: contactEmails,
        projects: [],
        assets: [],
      }), request.headers.get("origin") || undefined);
    }

    if (request.method === "PUT") {
      // SECURITY: Validate input using Zod schema
      const validation = await validateRequestBody(request, updateSiteSchema);
      if (isValidationFailure(validation)) {
        return validation.error;
      }

      const body = validation.data;
      const siteId = body.siteId || body.building;

      if (!siteId) {
        return addCorsHeaders(error("Site ID or building is required", 400), request.headers.get("origin") || undefined);
      }

      const hasProjectCodes = body.projectCodes !== undefined;
      const hasContacts = body.contacts !== undefined || body.contactEmails !== undefined;

      const updates: any = {};
      if (body.building !== undefined) updates.building = body.building;
      if (body.address !== undefined) updates.address = body.address;
      if (body.city !== undefined) updates.city = body.city;
      if (body.state !== undefined) updates.state = body.state;
      if (body.postcode !== undefined) updates.postcode = body.postcode;

      if (hasProjectCodes) {
        updates.projectCodes = JSON.stringify(body.projectCodes);
      }

      if (hasContacts) {
        const contactEmails = body.contacts || body.contactEmails || [];
        updates.contactEmails = JSON.stringify(contactEmails);
      }

      const updated = await updateSite(siteId, updates);

      return addCorsHeaders(success({
        siteId: updated.siteId,
        building: updated.building,
        address: updated.address,
        city: updated.city,
        state: updated.state,
        postcode: updated.postcode,
        createdAt: updated.createdAt,
        projectCodes: hasProjectCodes ? body.projectCodes : (updated.projectCodes ? JSON.parse(updated.projectCodes) : []),
        contacts: hasContacts ? (body.contacts || body.contactEmails || []) : (updated.contactEmails ? JSON.parse(updated.contactEmails) : []),
        projects: [],
        assets: [],
      }), request.headers.get("origin") || undefined);
    }

    // GET - list all sites
    const sites = await getAllSites();

    const payload = sites.map(site => {
      const projectCodes = site.projectCodes ? JSON.parse(site.projectCodes) : [];
      const contactEmails = site.contactEmails ? JSON.parse(site.contactEmails) : [];
      return {
        siteId: site.siteId,
        building: site.building,
        address: site.address,
        city: site.city,
        state: site.state,
        postcode: site.postcode,
        createdAt: site.createdAt,
        projectCodes,
        contacts: contactEmails,
        projects: [],
        assets: [],
      };
    });

    return addCorsHeaders(success(payload), request.headers.get("origin") || undefined);
  } catch (err: any) {
    context.error("Sites fetch error:", err);
    return addCorsHeaders(error("Failed to fetch sites", 500), request.headers.get("origin") || undefined);
  }
}

// SECURITY: Wrap handler with rate limiting
export const sitesHandler = withRateLimit(
  sitesHandlerImpl,
  RATE_LIMITS.STANDARD
);

export default sitesHandler;
