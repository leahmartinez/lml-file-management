import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getAllSites } from "../database/tableStorage";
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

    const sites = await getAllSites();

    const payload = sites.map(site => ({
      building: site.building,
      address: site.address,
      city: site.city,
      state: site.state,
      postcode: site.postcode,
      createdAt: site.createdAt,
    }));

    return addCorsHeaders(success(payload), request.headers.get("origin") || undefined);
  } catch (err: any) {
    context.error("Sites fetch error:", err);
    return addCorsHeaders(error("Failed to fetch sites", 500), request.headers.get("origin") || undefined);
  }
}

export default sitesHandler;
