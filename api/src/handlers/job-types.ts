/**
 * Job Types CRUD Handler
 *
 * SECURITY:
 * - Rate limited (standard for GET, write for POST/PATCH/DELETE)
 * - Input validated with Zod schemas
 * - All endpoints require authentication
 * - Admin/super_admin role required for create/update/deactivate operations
 * - GET /api/job-types - public for all logged-in users (for proposal forms)
 * - GET /api/job-types/all - admin only (for management UI)
 *
 * ENDPOINTS:
 * 1. GET /api/job-types - List active job types (all users)
 * 2. GET /api/job-types/all - List all job types including inactive (admin only)
 * 3. POST /api/job-types - Create new job type (admin only)
 * 4. PATCH /api/job-types/:id - Update job type (admin only)
 * 5. POST /api/job-types/:id/deactivate - Soft delete job type (admin only)
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import {
  getAllJobTypes,
  getActiveJobTypes,
  getJobTypeById,
  createJobType,
  updateJobType,
  deleteJobType,
  countProposalsByJobType,
} from "../database/tableStorage";
import { addCorsHeaders, success, unauthorized, error, forbidden, notFound } from "../utils/response";
import { getAuthenticatedUser, canUserManageJobs } from "../utils/auth";
import {
  validateRequestBody,
  createJobTypeSchema,
  updateJobTypeSchema,
  isValidationFailure,
} from "../utils/validation";
import { withRateLimit, RATE_LIMITS } from "../utils/rateLimit";
import { UserRole } from "../../shared/constants/roles";

/**
 * Main job types handler implementation
 */
async function jobTypesHandlerImpl(
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
    // pathSegments for /api/job-types: ['api', 'job-types']
    // pathSegments for /api/job-types/all: ['api', 'job-types', 'all']
    // pathSegments for /api/job-types/:id: ['api', 'job-types', ':id']
    // pathSegments for /api/job-types/:id/deactivate: ['api', 'job-types', ':id', 'deactivate']

    // =========================================================================
    // GET /api/job-types - List active job types (all authenticated users)
    // =========================================================================
    if (request.method === "GET" && pathSegments.length === 2 && pathSegments[1] === "job-types") {
      context.log("GET /api/job-types - Listing active job types");

      const jobTypes = await getActiveJobTypes();

      // Sort alphabetically by name
      jobTypes.sort((a, b) => a.name.localeCompare(b.name));

      // Map to clean response format (exclude audit fields for non-admin users)
      const response = {
        jobTypes: jobTypes.map((jt) => ({
          id: jt.rowKey,
          name: jt.name,
          description: jt.description,
        })),
      };

      return addCorsHeaders(success(response), request.headers.get("origin") || undefined);
    }

    // =========================================================================
    // GET /api/job-types/all - List all job types (admin only)
    // =========================================================================
    if (request.method === "GET" && pathSegments.length === 3 && pathSegments[2] === "all") {
      context.log("GET /api/job-types/all - Listing all job types (admin only)");

      // AUTHORIZATION: Admin only
      if (!canUserManageJobs(user)) {
        context.warn(`Access denied: ${user.email} (${user.role}) attempted to view all job types`);
        return addCorsHeaders(
          forbidden("Only admins can view all job types"),
          request.headers.get("origin") || undefined
        );
      }

      const jobTypes = await getAllJobTypes();

      // Sort alphabetically by name
      jobTypes.sort((a, b) => a.name.localeCompare(b.name));

      // Map to full response format with audit fields
      const response = {
        jobTypes: jobTypes.map((jt) => ({
          id: jt.rowKey,
          name: jt.name,
          description: jt.description,
          isActive: jt.isActive,
          createdAt: jt.createdAt,
          createdBy: jt.createdBy,
        })),
      };

      return addCorsHeaders(success(response), request.headers.get("origin") || undefined);
    }

    // =========================================================================
    // POST /api/job-types - Create new job type (admin only)
    // =========================================================================
    if (request.method === "POST" && pathSegments.length === 2) {
      context.log("POST /api/job-types - Creating new job type");

      // AUTHORIZATION: Admin, Director, or AdminStaff can create job types
      if (!canUserManageJobs(user)) {
        context.warn(`Access denied: ${user.email} (${user.role}) attempted to create job type`);
        return addCorsHeaders(
          forbidden("Only authorized users can create job types"),
          request.headers.get("origin") || undefined
        );
      }

      // VALIDATION: Validate input using Zod schema
      const validation = await validateRequestBody(request, createJobTypeSchema);
      if (isValidationFailure(validation)) {
        return validation.error;
      }

      const { name, description } = validation.data;

      // BUSINESS LOGIC: Check for duplicate name (case-insensitive)
      const existingJobTypes = await getAllJobTypes();
      const duplicate = existingJobTypes.find(
        (jt) => jt.name.toLowerCase() === name.toLowerCase()
      );

      if (duplicate) {
        return addCorsHeaders(
          error(`Job type with name "${name}" already exists`, 409),
          request.headers.get("origin") || undefined
        );
      }

      // Create the job type
      const newJobType = await createJobType({
        name,
        description: description || "",
        createdBy: user.email,
      });

      // Return created entity with 201 status
      const response = {
        jobType: {
          id: newJobType.rowKey,
          name: newJobType.name,
          description: newJobType.description,
          isActive: newJobType.isActive,
          createdAt: newJobType.createdAt,
          createdBy: newJobType.createdBy,
        },
      };

      return addCorsHeaders(
        success(response, 201),
        request.headers.get("origin") || undefined
      );
    }

    // =========================================================================
    // PATCH /api/job-types/:id - Update job type (admin only)
    // =========================================================================
    if (request.method === "PATCH" && pathSegments.length === 3 && pathSegments[2] !== "all") {
      const jobTypeId = pathSegments[2];
      context.log(`PATCH /api/job-types/${jobTypeId} - Updating job type`);

      // AUTHORIZATION: Admin, Director, or AdminStaff can update job types
      if (!canUserManageJobs(user)) {
        context.warn(`Access denied: ${user.email} (${user.role}) attempted to update job type ${jobTypeId}`);
        return addCorsHeaders(
          forbidden("Only authorized users can update job types"),
          request.headers.get("origin") || undefined
        );
      }

      // VALIDATION: Validate input using Zod schema
      const validation = await validateRequestBody(request, updateJobTypeSchema);
      if (isValidationFailure(validation)) {
        return validation.error;
      }

      const { name, description } = validation.data;

      // Check if job type exists
      const existing = await getJobTypeById(jobTypeId);
      if (!existing) {
        return addCorsHeaders(
          notFound(`Job type with ID "${jobTypeId}" not found`),
          request.headers.get("origin") || undefined
        );
      }

      // BUSINESS LOGIC: If renaming, check for duplicate name (case-insensitive)
      if (name && name.toLowerCase() !== existing.name.toLowerCase()) {
        const allJobTypes = await getAllJobTypes();
        const duplicate = allJobTypes.find(
          (jt) => jt.rowKey !== jobTypeId && jt.name.toLowerCase() === name.toLowerCase()
        );

        if (duplicate) {
          return addCorsHeaders(
            error(`Job type with name "${name}" already exists`, 409),
            request.headers.get("origin") || undefined
          );
        }
      }

      // Build update object (only include provided fields)
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;

      // Update the job type
      const updated = await updateJobType(jobTypeId, updates);

      // Return updated entity
      const response = {
        jobType: {
          id: updated.rowKey,
          name: updated.name,
          description: updated.description,
          isActive: updated.isActive,
          updatedAt: updated.updatedAt,
        },
      };

      return addCorsHeaders(success(response), request.headers.get("origin") || undefined);
    }

    // =========================================================================
    // POST /api/job-types/:id/deactivate - Soft delete job type (admin only)
    // =========================================================================
    if (request.method === "POST" && pathSegments.length === 4 && pathSegments[3] === "deactivate") {
      const jobTypeId = pathSegments[2];
      context.log(`POST /api/job-types/${jobTypeId}/deactivate - Deactivating job type`);

      // AUTHORIZATION: Admin, Director, or AdminStaff can deactivate job types
      if (!canUserManageJobs(user)) {
        context.warn(`Access denied: ${user.email} (${user.role}) attempted to deactivate job type ${jobTypeId}`);
        return addCorsHeaders(
          forbidden("Only authorized users can deactivate job types"),
          request.headers.get("origin") || undefined
        );
      }

      // Check if job type exists
      const existing = await getJobTypeById(jobTypeId);
      if (!existing) {
        return addCorsHeaders(
          notFound(`Job type with ID "${jobTypeId}" not found`),
          request.headers.get("origin") || undefined
        );
      }

      // BUSINESS LOGIC: Count how many proposals reference this job type
      // This allows the frontend to warn the user before deactivating
      const affectedProposals = await countProposalsByJobType(jobTypeId);

      // Soft delete (set isActive to false)
      await deleteJobType(jobTypeId);

      context.log(
        `Job type "${existing.name}" deactivated. Affected proposals: ${affectedProposals}`
      );

      // Return success with count of affected proposals
      const response = {
        success: true,
        affectedProposals,
      };

      return addCorsHeaders(success(response), request.headers.get("origin") || undefined);
    }

    // If we reach here, no route matched
    return addCorsHeaders(
      error("Method not allowed", 405),
      request.headers.get("origin") || undefined
    );
  } catch (err: any) {
    context.error("Job types handler error:", err);
    return addCorsHeaders(
      error("Server error", 500),
      request.headers.get("origin") || undefined
    );
  }
}

// SECURITY: Wrap handler with rate limiting
// Use standard rate limit for GET, write rate limit for POST/PATCH
export const jobTypesHandler = withRateLimit(jobTypesHandlerImpl, RATE_LIMITS.STANDARD);

export default jobTypesHandler;
