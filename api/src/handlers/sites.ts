import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { createSite, getAllSites, getSiteById, updateSite } from "../database/tableStorage";
import { addCorsHeaders, success, unauthorized, error } from "../utils/response";
import { getAuthenticatedUser } from "../utils/auth";

export async function sitesHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    if (request.method === "OPTIONS") {
      return addCorsHeaders({ status: 200 }, request.headers.get("origin") || undefined);
    }

    const user = getAuthenticatedUser(request);
    if (!user) {
      return addCorsHeaders(unauthorized(), request.headers.get("origin") || undefined);
    }

    if (request.method === "POST" || request.method === "PUT") {
      const body = (await request.json().catch(() => ({}))) as any;
      const siteId = (body.siteId || body.building || "").toString().trim();
      const building = (body.building || siteId || "").toString().trim();

      if (!siteId || !building) {
        return addCorsHeaders(error("Site ID and building are required", 400), request.headers.get("origin") || undefined);
      }

      const hasProjectCodes = Array.isArray(body.projectCodes);
      const projectCodes = hasProjectCodes ? body.projectCodes : [];
      const hasContacts = Array.isArray(body.contacts) || Array.isArray(body.contactEmails);
      const contactEmails = Array.isArray(body.contacts)
        ? body.contacts
        : Array.isArray(body.contactEmails)
          ? body.contactEmails
          : [];

      if (request.method === "POST") {
        const existing = await getSiteById(siteId);
        if (existing) {
          return addCorsHeaders(error("Site already exists", 409), request.headers.get("origin") || undefined);
        }

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

      const updates: any = {};

      if (building) updates.building = building;
      if (body.address !== undefined) updates.address = body.address;
      if (body.city !== undefined) updates.city = body.city;
      if (body.state !== undefined) updates.state = body.state;
      if (body.postcode !== undefined) updates.postcode = body.postcode;

      if (hasProjectCodes) {
        updates.projectCodes = JSON.stringify(projectCodes);
      }

      if (hasContacts) {
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
        projectCodes: hasProjectCodes ? projectCodes : updated.projectCodes ? JSON.parse(updated.projectCodes) : [],
        contacts: hasContacts ? contactEmails : updated.contactEmails ? JSON.parse(updated.contactEmails) : [],
        projects: [],
        assets: [],
      }), request.headers.get("origin") || undefined);
    }

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

export default sitesHandler;
