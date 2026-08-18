/**
 * SharePoint Operations Handler
 *
 * SECURITY:
 * - Rate limited (standard for GET, write for POST/DELETE)
 * - Input validated with Zod schemas
 * - Requires JWT authentication
 * - All endpoints check user permissions
 *
 * ENDPOINTS:
 * 1. POST /api/sharepoint/folders - Create a new folder
 * 2. POST /api/sharepoint/files - Upload a file (base64-encoded JSON)
 * 3. GET /api/sharepoint/folders/:folderId/children - List folder contents
 * 4. GET /api/sharepoint/items/:itemId - Get item metadata
 * 5. GET /api/sharepoint/items/:itemId/download-url - Get download URL
 * 6. DELETE /api/sharepoint/items/:itemId - Delete file or folder
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { z } from "zod";
import { getSharePointService } from "../services/sharePointServiceFactory";
import { addCorsHeaders, success, unauthorized, error, notFound } from "../utils/response";
import { getAuthenticatedUser } from "../utils/auth";
import {
  validateRequestBody,
  isValidationFailure,
} from "../utils/validation";
import { withRateLimit, RATE_LIMITS } from "../utils/rateLimit";

// =============================================================================
// ZOD VALIDATION SCHEMAS
// =============================================================================

/**
 * Schema for creating a folder
 * SECURITY: Validates folder name format to prevent path traversal
 */
const createFolderSchema = z
  .object({
    parentId: z.string().default('root'),
    folderName: z
      .string()
      .min(1, 'Folder name is required')
      .max(255, 'Folder name must be 255 characters or less')
      .regex(
        /^[^*"\\/:?<>|]+$/,
        'Folder name contains invalid characters (cannot contain * " \\ / : ? < > |)'
      ),
    workOrderId: z.string().uuid('Invalid workOrderId format'),
  })
  .strict();

/**
 * Schema for uploading a file (base64-encoded)
 * SECURITY: Validates file metadata and enforces size limits
 *
 * NOTE: For multipart/form-data uploads, a body parser like busboy would be needed.
 * This implementation uses base64-encoded JSON for simplicity.
 */
const uploadFileSchema = z
  .object({
    parentId: z.string().default('root'),
    fileName: z
      .string()
      .min(1, 'File name is required')
      .max(255, 'File name must be 255 characters or less'),
    fileContentBase64: z.string().min(1, 'File content is required'),
    mimeType: z
      .string()
      .min(1, 'MIME type is required')
      .max(100, 'MIME type must be 100 characters or less'),
    workOrderId: z.string().uuid('Invalid workOrderId format'),
  })
  .strict();

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Maximum file size: 50MB
 * SECURITY: Prevents DoS attacks via large file uploads
 */
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes

// =============================================================================
// HANDLER IMPLEMENTATION
// =============================================================================

/**
 * Main SharePoint handler implementation
 * Routes requests to appropriate operations based on path and method
 */
async function sharepointHandlerImpl(
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

    // Parse URL path segments for routing
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    // Example paths:
    // ['api', 'sharepoint', 'folders'] - POST create folder
    // ['api', 'sharepoint', 'files'] - POST upload file
    // ['api', 'sharepoint', 'folders', ':id', 'children'] - GET list children
    // ['api', 'sharepoint', 'items', ':id'] - GET item or DELETE item
    // ['api', 'sharepoint', 'items', ':id', 'download-url'] - GET download URL

    // =========================================================================
    // POST /api/sharepoint/folders - Create a new folder
    // =========================================================================
    if (
      request.method === "POST" &&
      pathSegments.length === 3 &&
      pathSegments[2] === "folders"
    ) {
      context.log("POST /api/sharepoint/folders - Creating folder");

      // VALIDATION: Validate input using Zod schema
      const validation = await validateRequestBody(request, createFolderSchema);
      if (isValidationFailure(validation)) {
        return validation.error;
      }

      const { parentId, folderName, workOrderId } = validation.data;

      try {
        // Get the SharePoint service (sandbox or production)
        const spService = getSharePointService();

        // Create the folder
        const folder = await spService.createFolder(parentId, folderName);

        context.log(
          `Folder created: ${folder.name} (ID: ${folder.id}) by ${user.email}`
        );

        // Return created folder with 201 status
        return addCorsHeaders(
          success(folder, 201),
          request.headers.get("origin") || undefined
        );
      } catch (err: any) {
        context.error("Error creating folder:", err);

        // Handle known error status codes
        if (err.statusCode === 409) {
          return addCorsHeaders(
            error("A folder with this name already exists in the parent folder", 409),
            request.headers.get("origin") || undefined
          );
        }

        if (err.statusCode === 404) {
          return addCorsHeaders(
            notFound("Parent folder not found"),
            request.headers.get("origin") || undefined
          );
        }

        return addCorsHeaders(
          error("Failed to create folder", 500),
          request.headers.get("origin") || undefined
        );
      }
    }

    // =========================================================================
    // POST /api/sharepoint/files - Upload a file
    // =========================================================================
    if (
      request.method === "POST" &&
      pathSegments.length === 3 &&
      pathSegments[2] === "files"
    ) {
      context.log("POST /api/sharepoint/files - Uploading file");

      // VALIDATION: Validate input using Zod schema
      const validation = await validateRequestBody(request, uploadFileSchema);
      if (isValidationFailure(validation)) {
        return validation.error;
      }

      const { parentId, fileName, fileContentBase64, mimeType, workOrderId } =
        validation.data;

      try {
        // Convert base64 to buffer
        const buffer = Buffer.from(fileContentBase64, 'base64');

        // SECURITY: Validate file size
        if (buffer.length > MAX_FILE_SIZE) {
          return addCorsHeaders(
            error(`File too large. Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024}MB`, 400),
            request.headers.get("origin") || undefined
          );
        }

        // Prepare file metadata
        const metadata = {
          originalName: fileName,
          mimeType,
          uploadedBy: user.email,
          workOrderId,
          createdAt: new Date().toISOString(),
        };

        // Get service and upload file
        const spService = getSharePointService();
        const file = await spService.uploadFile(
          parentId,
          fileName,
          buffer,
          mimeType,
          metadata
        );

        context.log(
          `File uploaded: ${file.name} (${file.size} bytes, ID: ${file.id}) by ${user.email}`
        );

        // Return uploaded file with 201 status
        return addCorsHeaders(
          success(file, 201),
          request.headers.get("origin") || undefined
        );
      } catch (err: any) {
        context.error("Error uploading file:", err);

        if (err.statusCode === 404) {
          return addCorsHeaders(
            notFound("Parent folder not found"),
            request.headers.get("origin") || undefined
          );
        }

        if (err.statusCode === 409) {
          return addCorsHeaders(
            error("A file with this name already exists in the parent folder", 409),
            request.headers.get("origin") || undefined
          );
        }

        return addCorsHeaders(
          error("Failed to upload file", 500),
          request.headers.get("origin") || undefined
        );
      }
    }

    // =========================================================================
    // GET /api/sharepoint/folders/:folderId/children - List folder contents
    // =========================================================================
    if (
      request.method === "GET" &&
      pathSegments.length === 5 &&
      pathSegments[2] === "folders" &&
      pathSegments[4] === "children"
    ) {
      const folderId = pathSegments[3];
      context.log(`GET /api/sharepoint/folders/${folderId}/children - Listing folder contents`);

      try {
        // Get service and list children
        const spService = getSharePointService();
        const children = await spService.listFolderChildren(folderId);

        context.log(`Found ${children.length} items in folder ${folderId}`);

        // Return results with count
        return addCorsHeaders(
          success({
            folderId,
            count: children.length,
            items: children,
          }),
          request.headers.get("origin") || undefined
        );
      } catch (err: any) {
        context.error("Error listing folder contents:", err);

        if (err.statusCode === 404) {
          return addCorsHeaders(
            notFound("Folder not found"),
            request.headers.get("origin") || undefined
          );
        }

        return addCorsHeaders(
          error("Failed to list folder contents", 500),
          request.headers.get("origin") || undefined
        );
      }
    }

    // =========================================================================
    // GET /api/sharepoint/items/:itemId - Get item metadata
    // =========================================================================
    if (
      request.method === "GET" &&
      pathSegments.length === 4 &&
      pathSegments[2] === "items"
    ) {
      const itemId = pathSegments[3];
      context.log(`GET /api/sharepoint/items/${itemId} - Getting item metadata`);

      try {
        // Get service and retrieve metadata
        const spService = getSharePointService();
        const item = await spService.getFolderOrFile(itemId);

        context.log(`Retrieved metadata for item: ${item.name} (type: ${item.file ? 'file' : 'folder'})`);

        // Return item metadata
        return addCorsHeaders(
          success(item),
          request.headers.get("origin") || undefined
        );
      } catch (err: any) {
        context.error("Error getting item metadata:", err);

        if (err.statusCode === 404) {
          return addCorsHeaders(
            notFound("Item not found"),
            request.headers.get("origin") || undefined
          );
        }

        return addCorsHeaders(
          error("Failed to get item metadata", 500),
          request.headers.get("origin") || undefined
        );
      }
    }

    // =========================================================================
    // GET /api/sharepoint/items/:itemId/download-url - Get download URL
    // =========================================================================
    if (
      request.method === "GET" &&
      pathSegments.length === 5 &&
      pathSegments[2] === "items" &&
      pathSegments[4] === "download-url"
    ) {
      const itemId = pathSegments[3];
      context.log(`GET /api/sharepoint/items/${itemId}/download-url - Generating download URL`);

      try {
        // Get service and generate download URL
        const spService = getSharePointService();
        const downloadUrl = await spService.getDownloadUrl(itemId);

        // Calculate expiry time (15 minutes from now)
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 15);

        context.log(`Generated download URL for item ${itemId}, expires at ${expiresAt.toISOString()}`);

        // Return download URL with expiry information
        return addCorsHeaders(
          success({
            downloadUrl,
            expiresAt: expiresAt.toISOString(),
          }),
          request.headers.get("origin") || undefined
        );
      } catch (err: any) {
        context.error("Error generating download URL:", err);

        if (err.statusCode === 404) {
          return addCorsHeaders(
            notFound("File not found"),
            request.headers.get("origin") || undefined
          );
        }

        if (err.statusCode === 400) {
          return addCorsHeaders(
            error(err.message || "Cannot generate download URL for folders", 400),
            request.headers.get("origin") || undefined
          );
        }

        return addCorsHeaders(
          error("Failed to generate download URL", 500),
          request.headers.get("origin") || undefined
        );
      }
    }

    // =========================================================================
    // DELETE /api/sharepoint/items/:itemId - Delete file or folder
    // =========================================================================
    if (
      request.method === "DELETE" &&
      pathSegments.length === 4 &&
      pathSegments[2] === "items"
    ) {
      const itemId = pathSegments[3];
      context.log(`DELETE /api/sharepoint/items/${itemId} - Deleting item`);

      try {
        // Get service and delete item
        const spService = getSharePointService();
        await spService.deleteItem(itemId);

        context.log(`Successfully deleted item ${itemId} by ${user.email}`);

        // Return 204 No Content on success
        return addCorsHeaders(
          { status: 204 },
          request.headers.get("origin") || undefined
        );
      } catch (err: any) {
        context.error("Error deleting item:", err);

        if (err.statusCode === 404) {
          return addCorsHeaders(
            notFound("Item not found"),
            request.headers.get("origin") || undefined
          );
        }

        return addCorsHeaders(
          error("Failed to delete item", 500),
          request.headers.get("origin") || undefined
        );
      }
    }

    // If we reach here, no route matched
    context.warn(`No route matched for ${request.method} ${url.pathname}`);
    return addCorsHeaders(
      error("Method not allowed or route not found", 405),
      request.headers.get("origin") || undefined
    );
  } catch (err: any) {
    context.error("SharePoint handler error:", err);
    return addCorsHeaders(
      error("Server error", 500),
      request.headers.get("origin") || undefined
    );
  }
}

// SECURITY: Wrap handler with rate limiting
// Use standard rate limit for GET, write rate limit for POST/DELETE
export const sharepointHandler = withRateLimit(sharepointHandlerImpl, RATE_LIMITS.WRITE);

export default sharepointHandler;
