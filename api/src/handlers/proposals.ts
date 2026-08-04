/**
 * Proposals Handler (List, Detail, Update SharePoint URL)
 *
 * SECURITY:
 * - Rate limited (standard for GET, write for PATCH)
 * - Input validated with Zod schemas
 * - Requires authentication
 * - SharePoint URL update requires admin role
 * - SubConsultants cannot see financial fields (itemValues, totalValue)
 *
 * ENDPOINTS:
 * 1. GET /api/proposals - List proposals with optional filters
 * 2. GET /api/proposals/:id - Get single proposal by ID
 * 3. PATCH /api/proposals/:id/sharepoint-url - Update SharePoint folder URL (admin only)
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import {
  getAllProposals,
  getProposalById,
  updateProposal,
} from "../database/tableStorage";
import { addCorsHeaders, success, unauthorized, error, forbidden, notFound } from "../utils/response";
import { getAuthenticatedUser, canUserSetPricing, normalizeRole, isAdmin } from "../utils/auth";
import {
  validateRequestBody,
  validateQueryParams,
  updateProposalSharePointUrlSchema,
  proposalListQuerySchema,
  isValidationFailure,
} from "../utils/validation";
import { withRateLimit, RATE_LIMITS } from "../utils/rateLimit";
import { safeParseJsonArray } from "../utils/json";
import { UserRole } from "../../shared/constants/roles";

/**
 * Strip financial fields from proposal for SubConsultants
 * SECURITY: SubConsultants cannot see pricing information
 */
function stripFinancialFields(proposal: any): any {
  const { itemValues, totalValue, estimatedValue, ...rest } = proposal;
  return rest;
}

/**
 * Map proposal entity to response format
 * SECURITY: Strips financial fields for SubConsultant role
 */
function mapProposalToResponse(proposal: any, userRole: string): any {
  const stages = safeParseJsonArray(proposal.stages, []);
  const acceptedStageNames = safeParseJsonArray(proposal.acceptedStageNames, []);
  const attachments = safeParseJsonArray(proposal.attachments, []);

  const response = {
    id: proposal.rowKey,
    proposalNumber: proposal.proposalNumber || '',
    clientName: proposal.clientName || '',
    clientContact: proposal.clientContact || '',
    siteName: proposal.siteName || '',
    siteAddress: proposal.siteAddress || '',
    state: proposal.state || '',
    city: proposal.city || '',
    postcode: proposal.postcode || '',
    description: proposal.description || '',
    estimatedValue: proposal.estimatedValue || 0,
    status: proposal.status || 'Draft',
    stages,
    acceptedStageNames,
    sentDate: proposal.sentDate || '',
    expiryDate: proposal.expiryDate || '',
    acceptedDate: proposal.acceptedDate || '',
    rejectedDate: proposal.rejectedDate || '',
    rejectionReason: proposal.rejectionReason || '',
    notes: proposal.notes || '',
    attachments,
    projectCode: proposal.projectCode || '',
    // New fields
    jobTypeId: proposal.jobTypeId || '',
    jobTypeName: proposal.jobTypeName || '',
    generalDescription: proposal.generalDescription || '',
    sharePointFolderUrl: proposal.sharePointFolderUrl || '',
    // Audit fields
    createdBy: proposal.createdBy || '',
    createdAt: proposal.createdAt || '',
    updatedAt: proposal.updatedAt || '',
  };

  // SECURITY: Strip financial fields for SubConsultants
  // Normalize role to handle legacy values
  const normalizedRole = normalizeRole(userRole);
  if (normalizedRole === UserRole.SubConsultant) {
    return stripFinancialFields(response);
  }

  return response;
}

/**
 * Filter proposals based on query parameters
 * All filters use case-insensitive matching where applicable
 */
function filterProposals(proposals: any[], filters: any): any[] {
  let filtered = proposals;

  // Status filter (exact match, case-insensitive)
  if (filters.status) {
    const statusLower = filters.status.toLowerCase();
    filtered = filtered.filter((p) =>
      (p.status || '').toLowerCase() === statusLower
    );
  }

  // Proposal number filter (partial match, case-insensitive)
  if (filters.proposalNumber) {
    const numberLower = filters.proposalNumber.toLowerCase();
    filtered = filtered.filter((p) =>
      (p.proposalNumber || '').toLowerCase().includes(numberLower)
    );
  }

  // Site name filter (partial match, case-insensitive)
  if (filters.siteName) {
    const siteNameLower = filters.siteName.toLowerCase();
    filtered = filtered.filter((p) =>
      (p.siteName || '').toLowerCase().includes(siteNameLower)
    );
  }

  // Building name filter (alias for siteName - partial match, case-insensitive)
  if (filters.buildingName) {
    const buildingNameLower = filters.buildingName.toLowerCase();
    filtered = filtered.filter((p) =>
      (p.siteName || '').toLowerCase().includes(buildingNameLower)
    );
  }

  // Address filter (partial match, case-insensitive)
  if (filters.address) {
    const addressLower = filters.address.toLowerCase();
    filtered = filtered.filter((p) =>
      (p.siteAddress || '').toLowerCase().includes(addressLower)
    );
  }

  // Suburb filter (partial match, case-insensitive)
  if (filters.suburb) {
    const suburbLower = filters.suburb.toLowerCase();
    filtered = filtered.filter((p) =>
      (p.city || '').toLowerCase().includes(suburbLower)
    );
  }

  // State filter (exact match)
  if (filters.state) {
    filtered = filtered.filter((p) => p.state === filters.state);
  }

  // Postcode filter (exact match)
  if (filters.postcode) {
    filtered = filtered.filter((p) => p.postcode === filters.postcode);
  }

  return filtered;
}

/**
 * Main proposals handler implementation
 */
async function proposalsHandlerImpl(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return addCorsHeaders({ status: 200 }, request.headers.get("origin") || undefined);
    }

    // AUTHENTICATION: All endpoints require valid JWT
    const user = getAuthenticatedUser(request);
    if (!user) {
      return addCorsHeaders(unauthorized(), request.headers.get("origin") || undefined);
    }

    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    // pathSegments for /api/proposals: ['api', 'proposals']
    // pathSegments for /api/proposals/:id: ['api', 'proposals', ':id']
    // pathSegments for /api/proposals/:id/sharepoint-url: ['api', 'proposals', ':id', 'sharepoint-url']

    // =========================================================================
    // GET /api/proposals - List proposals with optional filters
    // =========================================================================
    if (request.method === "GET" && pathSegments.length === 2) {
      context.log("GET /api/proposals - Listing proposals");

      // Validate query parameters
      const queryValidation = validateQueryParams(request, proposalListQuerySchema);
      if (isValidationFailure(queryValidation)) {
        return queryValidation.error;
      }

      const filters = queryValidation.data;

      // Fetch all proposals
      const proposals = await getAllProposals();

      // Map to response format
      let mapped = proposals.map((p) => mapProposalToResponse(p, user.role));

      // Apply filters
      mapped = filterProposals(mapped, filters);

      // Sort by createdAt descending (most recent first)
      mapped.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });

      return addCorsHeaders(
        success({ proposals: mapped }),
        request.headers.get("origin") || undefined
      );
    }

    // =========================================================================
    // GET /api/proposals/:id - Get single proposal by ID
    // =========================================================================
    if (request.method === "GET" && pathSegments.length === 3) {
      const proposalId = pathSegments[2];
      context.log(`GET /api/proposals/${proposalId} - Fetching proposal`);

      const proposal = await getProposalById(proposalId);

      if (!proposal) {
        return addCorsHeaders(
          notFound(`Proposal with ID "${proposalId}" not found`),
          request.headers.get("origin") || undefined
        );
      }

      const response = mapProposalToResponse(proposal, user.role);

      return addCorsHeaders(
        success({ proposal: response }),
        request.headers.get("origin") || undefined
      );
    }

    // =========================================================================
    // PATCH /api/proposals/:id/sharepoint-url - Update SharePoint folder URL (admin only)
    // =========================================================================
    if (
      request.method === "PATCH" &&
      pathSegments.length === 4 &&
      pathSegments[3] === "sharepoint-url"
    ) {
      const proposalId = pathSegments[2];
      context.log(`PATCH /api/proposals/${proposalId}/sharepoint-url - Updating SharePoint URL`);

      // AUTHORIZATION: Admin only
      if (!isAdmin(user)) {
        context.warn(`Access denied: ${user.email} (${user.role}) attempted to update SharePoint URL`);
        return addCorsHeaders(
          forbidden("Only admins can update SharePoint folder URLs"),
          request.headers.get("origin") || undefined
        );
      }

      // VALIDATION: Validate input using Zod schema
      const validation = await validateRequestBody(request, updateProposalSharePointUrlSchema);
      if (isValidationFailure(validation)) {
        return validation.error;
      }

      const { sharePointFolderUrl } = validation.data;

      // Check if proposal exists
      const existing = await getProposalById(proposalId);
      if (!existing) {
        return addCorsHeaders(
          notFound(`Proposal with ID "${proposalId}" not found`),
          request.headers.get("origin") || undefined
        );
      }

      // Update the SharePoint URL
      const updated = await updateProposal(proposalId, { sharePointFolderUrl });

      const response = mapProposalToResponse(updated, user.role);

      return addCorsHeaders(
        success({ proposal: response }),
        request.headers.get("origin") || undefined
      );
    }

    // If we reach here, no route matched
    return addCorsHeaders(
      error("Method not allowed", 405),
      request.headers.get("origin") || undefined
    );
  } catch (err: any) {
    context.error("Proposals handler error:", err);
    return addCorsHeaders(
      error("Server error", 500),
      request.headers.get("origin") || undefined
    );
  }
}

// SECURITY: Wrap handler with rate limiting
export const proposalsHandler = withRateLimit(proposalsHandlerImpl, RATE_LIMITS.STANDARD);

export default proposalsHandler;
