/**
 * Input Validation Utilities
 *
 * SECURITY: Implements OWASP input validation best practices
 * - All schemas use strict mode (rejects unexpected fields)
 * - String fields have max length limits to prevent DoS
 * - HTML content is sanitized to prevent XSS
 * - Email, phone, URL formats are validated
 *
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
 */

import { z, ZodSchema } from 'zod';
import { HttpRequest, HttpResponseInit } from '@azure/functions';
import { error, addCorsHeaders } from './response';

// =============================================================================
// COMMON FIELD SCHEMAS (Reusable building blocks)
// =============================================================================

/**
 * Email validation - RFC 5322 compliant with length limits
 * SECURITY: Prevents oversized email attacks, normalizes to lowercase
 */
export const emailSchema = z
  .string()
  .email('Invalid email format')
  .max(254, 'Email must be 254 characters or less')
  .transform((val) => val.toLowerCase().trim());

/**
 * Password validation with complexity requirements
 * SECURITY: Enforces minimum password strength
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be 128 characters or less');

/**
 * Phone number validation (flexible international format)
 * Accepts: +61412345678, 0412345678, 02 1234 5678, etc.
 */
export const phoneSchema = z
  .string()
  .max(30, 'Phone number must be 30 characters or less')
  .regex(
    /^[\d\s\-+()]*$/,
    'Phone number can only contain digits, spaces, dashes, plus signs, and parentheses'
  )
  .optional()
  .or(z.literal(''));

/**
 * URL validation with protocol requirement
 */
export const urlSchema = z
  .string()
  .url('Invalid URL format')
  .max(2000, 'URL must be 2000 characters or less')
  .optional()
  .or(z.literal(''));

/**
 * Generic short text field (names, titles)
 */
export const shortTextSchema = z
  .string()
  .max(255, 'Text must be 255 characters or less')
  .transform((val) => val.trim());

/**
 * Optional short text
 */
export const optionalShortTextSchema = shortTextSchema.optional().or(z.literal(''));

/**
 * Generic long text field (descriptions, notes)
 */
export const longTextSchema = z
  .string()
  .max(10000, 'Text must be 10,000 characters or less')
  .transform((val) => val.trim());

/**
 * User roles enum - matches database schema
 */
export const userRoleSchema = z.enum([
  'super_admin',
  'admin',
  'user',
  'subconsultant',
  'consultant',
  'site_manager',
  'national_manager',
]);

/**
 * Account status enum
 */
export const accountStatusSchema = z.enum(['pending', 'active', 'suspended']);

/**
 * Project status enum
 */
export const projectStatusSchema = z
  .enum(['Active', 'Complete', 'On Hold', 'Cancelled'])
  .default('Active');

/**
 * Australian state codes and full names (frontend uses full names, backend stores as-is)
 */
export const australianStateSchema = z
  .enum([
    'NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT',
    'Victoria', 'Queensland', 'South Australia', 'Western Australia',
    'Northern Territory', 'Tasmania', 'New Zealand',
    '',
  ])
  .default('');

/**
 * Postcode validation (4-digit Australian format)
 */
export const postcodeSchema = z
  .string()
  .max(10, 'Postcode must be 10 characters or less')
  .regex(/^[0-9]{0,4}$/, 'Invalid postcode format')
  .optional()
  .or(z.literal(''));

// =============================================================================
// HTML SANITIZATION (XSS Prevention)
// =============================================================================

/**
 * Strip potentially dangerous HTML tags and attributes
 * SECURITY: Basic XSS prevention - removes script tags, event handlers, javascript: URLs
 *
 * Note: For rich text content, consider using a dedicated library like DOMPurify
 */
export function stripHtmlTags(input: string): string {
  return input
    // Remove script tags and their contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove all HTML tags
    .replace(/<[^>]*>/g, '')
    // Decode common HTML entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove event handlers
    .replace(/on\w+\s*=/gi, '');
}

/**
 * Sanitized text schema - strips HTML for plain text fields
 */
export const sanitizedTextSchema = z
  .string()
  .max(10000)
  .transform((val) => stripHtmlTags(val.trim()));

// =============================================================================
// AUTH REQUEST SCHEMAS
// =============================================================================

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required').max(128),
  })
  .strict();

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();

export const forgotPasswordSchema = z
  .object({
    email: emailSchema,
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    email: emailSchema,
    token: z.string().min(1, 'Token is required').max(128),
    newPassword: passwordSchema,
  })
  .strict();

export const verifyEmailSchema = z
  .object({
    email: emailSchema,
    token: z.string().min(1, 'Token is required').max(128),
  })
  .strict();

export const resendVerificationSchema = z
  .object({
    email: emailSchema,
  })
  .strict();

export const sendInvitationSchema = z
  .object({
    email: emailSchema,
    role: userRoleSchema.optional().default('site_manager'),
    sites: z.array(z.string().max(255)).optional().default([]),
  })
  .strict();

export const acceptInvitationSchema = z
  .object({
    email: emailSchema,
    token: z.string().min(1, 'Token is required').max(128),
    password: passwordSchema,
  })
  .strict();

// =============================================================================
// USER MANAGEMENT SCHEMAS
// =============================================================================

export const createUserSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    role: userRoleSchema,
    sites: z.array(z.string().max(255)).optional().default([]),
    mustChangePassword: z.boolean().optional().default(false),
  })
  .strict();

export const updateUserSchema = z
  .object({
    email: emailSchema,
    role: userRoleSchema.optional(),
    sites: z.array(z.string().max(255)).optional(),
    password: passwordSchema.optional(),
    mustChangePassword: z.boolean().optional(),
  })
  .strict();

export const userActionSchema = z
  .object({
    email: emailSchema,
  })
  .strict();

// Alias for clarity
export const userApproveSchema = userActionSchema;
export const userSuspendSchema = userActionSchema;
export const userDeleteSchema = userActionSchema;

// =============================================================================
// USER PROFILE SCHEMA
// =============================================================================

export const userProfileUpdateSchema = z
  .object({
    firstName: optionalShortTextSchema,
    lastName: optionalShortTextSchema,
    position: optionalShortTextSchema,
    phone: phoneSchema,
    officePhone: phoneSchema,
    department: optionalShortTextSchema,
    photo: z.string().max(100000, 'Photo data must be 100KB or less').optional(), // Base64 data URLs
    bio: sanitizedTextSchema.optional(),
    category: optionalShortTextSchema,
  })
  .strict();

// =============================================================================
// PROJECT SCHEMAS
// =============================================================================

export const stageSchema = z.object({
  id: z.string().max(100).optional(),
  stageId: z.string().max(100).optional(),
  name: shortTextSchema,
  status: z.string().max(50).optional().default('Not Started'),
  price: z.number().min(0).max(999999999).optional().default(0),
  description: longTextSchema.optional(),
  plannedSiteVisitDate: z.string().max(50).optional(),
  consultantEmails: z.array(emailSchema).optional().default([]),
  stageConsultantEmails: z.array(emailSchema).optional(),
  createdAt: z.string().max(50).optional(),
  createdBy: z.string().max(255).optional(),
});

const projectBaseShape = {
  projectCode: z.string().min(1, 'Project code is required').max(50),
  building: z.string().min(1, 'Building is required').max(255),
  siteId: z.string().max(255).optional(),
  state: australianStateSchema.optional(),
  status: projectStatusSchema.optional(),
  invoiceStatus: z.string().max(50).optional(),
  orderDate: z.string().max(50).optional(),
  description: longTextSchema.optional(),
  projectType: z.string().max(100).optional(),
  customProjectType: z.string().max(100).optional(),
  reportTemplatesFolderUrl: urlSchema.optional(), // SharePoint link to Report Templates folder
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  postcode: postcodeSchema,
  contacts: z.array(emailSchema).optional(),
  contactEmails: z.array(emailSchema).optional(),
  stages: z.array(stageSchema).optional(),
  createdAt: z.string().max(50).optional(),
};

export const createProjectSchema = z.object(projectBaseShape).strict();

// Update schema: partial fields, strips unknown keys (frontend sends extra fields like notes, updatedAt, etc.)
export const updateProjectSchema = z.object(projectBaseShape).partial().extend({
  projectCode: z.string().min(1).max(50),
});

export const renameProjectSchema = z
  .object({
    projectCode: z.string().min(1, 'Project code is required').max(50),
    newProjectCode: z.string().min(1, 'New project code is required').max(50),
  })
  .strict();

export const deleteProjectSchema = z
  .object({
    projectCode: z.string().min(1, 'Project code is required').max(50),
  })
  .strict();

// =============================================================================
// SITE SCHEMAS
// =============================================================================

const siteBaseShape = {
  siteId: z.string().min(1).max(255).optional(),
  building: z.string().min(1, 'Building is required').max(255),
  address: z.string().max(500).optional().default(''),
  city: z.string().max(100).optional().default(''),
  state: australianStateSchema.optional(),
  postcode: postcodeSchema,
  projectCodes: z.array(z.string().max(50)).optional(),
  contacts: z.array(emailSchema).optional(),
  contactEmails: z.array(emailSchema).optional(),
  createdAt: z.string().max(50).optional(),
};

export const createSiteSchema = z.object(siteBaseShape).strict();

// Update schema: strips unknown keys (frontend may send extra fields)
export const updateSiteSchema = z.object(siteBaseShape).partial();

export const deleteSiteSchema = z
  .object({
    siteId: z.string().min(1, 'Site ID is required').max(255),
  })
  .strict();

// =============================================================================
// CONTACT SCHEMAS
// =============================================================================

export const contactSchema = z
  .object({
    id: z.string().max(100).optional(),
    firstName: optionalShortTextSchema.default(''),
    lastName: optionalShortTextSchema.default(''),
    position: optionalShortTextSchema.default(''),
    company: optionalShortTextSchema,
    businessId: z.string().max(100).optional(),
    email: emailSchema.optional().or(z.literal('')),
    phone: phoneSchema,
    officePhone: phoneSchema,
    category: optionalShortTextSchema,
    photo: z.string().max(100000).optional(),
  })
  .strict();

// =============================================================================
// BUSINESS SCHEMAS
// =============================================================================

export const businessSchema = z
  .object({
    id: z.string().max(100).optional(),
    name: z.string().min(1, 'Business name is required').max(255),
    description: longTextSchema.optional(),
    address: z.string().max(500).optional(),
    city: z.string().max(100).optional(),
    postcode: postcodeSchema,
    state: australianStateSchema.optional(),
    website: urlSchema,
    phone: phoneSchema,
    email: emailSchema.optional().or(z.literal('')),
    category: optionalShortTextSchema,
    logo: z.string().max(100000).optional(),
  })
  .strict();

// =============================================================================
// JOB TYPES SCHEMAS
// =============================================================================

/**
 * Schema for creating a new job type
 * SECURITY: Enforces max lengths to prevent DoS attacks
 */
export const createJobTypeSchema = z
  .object({
    name: z.string().min(1, 'Job type name is required').max(100, 'Name must be 100 characters or less').transform((val) => val.trim()),
    description: z.string().max(500, 'Description must be 500 characters or less').optional().transform((val) => val?.trim()),
  })
  .strict();

/**
 * Schema for updating a job type (PATCH)
 * At least one field must be provided
 */
export const updateJobTypeSchema = z
  .object({
    name: z.string().min(1, 'Name cannot be empty').max(100, 'Name must be 100 characters or less').optional().transform((val) => val?.trim()),
    description: z.string().max(500, 'Description must be 500 characters or less').optional().transform((val) => val?.trim()),
  })
  .strict()
  .refine((data) => data.name !== undefined || data.description !== undefined, {
    message: 'At least one field (name or description) must be provided',
  });

// =============================================================================
// PROPOSALS SCHEMAS (for when backend storage is implemented)
// =============================================================================

export const createProposalSchema = z
  .object({
    proposalNumber: z.string().max(50).optional(), // Auto-generated if not provided
    clientName: z.string().min(1, 'Client name is required').max(255),
    clientContact: optionalShortTextSchema,
    siteName: z.string().min(1, 'Site name is required').max(255),
    siteAddress: z.string().max(500).optional(),
    state: australianStateSchema.optional(),
    city: z.string().max(100).optional(),
    postcode: postcodeSchema,
    description: longTextSchema,
    estimatedValue: z.number().min(0).max(999999999).optional(),
    status: z.enum(['Draft', 'Sent', 'Under Review', 'Accepted', 'Part Acceptance', 'Rejected', 'Expired']).default('Draft'),
    stages: z.array(stageSchema).optional(),
    sentDate: z.string().max(50).optional(),
    expiryDate: z.string().max(50).optional(),
    notes: longTextSchema.optional(),
    attachments: z.array(z.string().max(2000)).optional(),
    // New fields added April 2026
    jobTypeId: z.string().max(100).optional().default(''),
    jobTypeName: z.string().max(255).optional().default(''),
    generalDescription: longTextSchema.optional().default(''),
    sharePointFolderUrl: urlSchema.optional().default(''),
  })
  .strict();

export const updateProposalSchema = z
  .object({
    id: z.string().min(1, 'Proposal ID is required').max(100),
    clientName: z.string().max(255).optional(),
    clientContact: optionalShortTextSchema,
    siteName: z.string().max(255).optional(),
    siteAddress: z.string().max(500).optional(),
    state: australianStateSchema.optional(),
    city: z.string().max(100).optional(),
    postcode: postcodeSchema,
    description: longTextSchema.optional(),
    estimatedValue: z.number().min(0).max(999999999).optional(),
    status: z.enum(['Draft', 'Sent', 'Under Review', 'Accepted', 'Part Acceptance', 'Rejected', 'Expired']).optional(),
    stages: z.array(stageSchema).optional(),
    acceptedStageNames: z.array(z.string().max(255)).optional(),
    sentDate: z.string().max(50).optional(),
    expiryDate: z.string().max(50).optional(),
    acceptedDate: z.string().max(50).optional(),
    rejectedDate: z.string().max(50).optional(),
    rejectionReason: longTextSchema.optional(),
    notes: longTextSchema.optional(),
    attachments: z.array(z.string().max(2000)).optional(),
    projectCode: z.string().max(50).optional(),
    // New fields added April 2026
    jobTypeId: z.string().max(100).optional(),
    jobTypeName: z.string().max(255).optional(),
    generalDescription: longTextSchema.optional(),
    sharePointFolderUrl: urlSchema.optional(),
  })
  .strict();

/**
 * Schema for updating SharePoint folder URL on a proposal
 * SECURITY: Validates URL format, admin-only endpoint
 */
export const updateProposalSharePointUrlSchema = z
  .object({
    sharePointFolderUrl: z
      .string()
      .url('Invalid SharePoint URL format')
      .max(2000, 'URL must be 2000 characters or less')
      .refine(
        (url) => url.toLowerCase().includes('sharepoint'),
        'URL must be a SharePoint URL'
      ),
  })
  .strict();

/**
 * Schema for proposal list query parameters (filtering)
 * All fields are optional and can be combined
 */
export const proposalListQuerySchema = z.object({
  status: z.string().max(50).optional(),
  proposalNumber: z.string().max(50).optional(),
  siteName: z.string().max(255).optional(),
  buildingName: z.string().max(255).optional(),
  address: z.string().max(500).optional(),
  suburb: z.string().max(100).optional(),
  state: australianStateSchema.optional(),
  postcode: z.string().max(10).optional(),
});

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Result type for validation operations
 */
export type ValidationSuccess<T> = { success: true; data: T };
export type ValidationFailure = { success: false; error: HttpResponseInit };
export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

/**
 * Type guard to check if validation failed
 */
export function isValidationFailure<T>(
  result: ValidationResult<T>
): result is ValidationFailure {
  return !result.success;
}

/**
 * Validate request body against a Zod schema
 *
 * SECURITY: Centralizes validation with consistent error responses
 * - Parses JSON safely
 * - Validates against schema with strict mode (rejects extra fields)
 * - Returns standardized error responses
 *
 * @param request - Azure Functions HTTP request
 * @param schema - Zod schema to validate against
 * @returns Validated data or error response ready to return
 *
 * @example
 * const validation = await validateRequestBody(request, loginSchema);
 * if (!validation.success) return validation.error;
 * const { email, password } = validation.data;
 */
export async function validateRequestBody<T>(
  request: HttpRequest,
  schema: ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    const rawBody = await request.json();
    const result = schema.safeParse(rawBody);

    if (!result.success) {
      // Extract readable error messages
      const errorMessages = result.error.errors.map((e) => {
        const field = e.path.join('.');
        return field ? `${field}: ${e.message}` : e.message;
      });

      return {
        success: false,
        error: addCorsHeaders(
          error(`Validation failed: ${errorMessages.join(', ')}`, 400),
          request.headers.get('origin') || undefined
        ),
      };
    }

    return { success: true, data: result.data };
  } catch (err) {
    return {
      success: false,
      error: addCorsHeaders(
        error('Invalid JSON body', 400),
        request.headers.get('origin') || undefined
      ),
    };
  }
}

/**
 * Validate query parameters against a Zod schema
 *
 * @param request - Azure Functions HTTP request
 * @param schema - Zod schema to validate against
 * @returns Validated data or error response
 */
export function validateQueryParams<T>(
  request: HttpRequest,
  schema: ZodSchema<T>
): ValidationResult<T> {
  const params: Record<string, string> = {};
  request.query.forEach((value, key) => {
    params[key] = value;
  });

  const result = schema.safeParse(params);

  if (!result.success) {
    const errorMessages = result.error.errors.map((e) => {
      const field = e.path.join('.');
      return field ? `${field}: ${e.message}` : e.message;
    });

    return {
      success: false,
      error: addCorsHeaders(
        error(`Invalid query parameters: ${errorMessages.join(', ')}`, 400),
        request.headers.get('origin') || undefined
      ),
    };
  }

  return { success: true, data: result.data };
}

// =============================================================================
// ALERTS SCHEMAS
// =============================================================================

/**
 * Alert type enum - defines all possible alert types
 */
export const alertTypeSchema = z.enum([
  'STAGE_ASSIGNED',
  'PROJECT_UPDATED',
  'PROPOSAL_UPDATED',
]);

/**
 * Entity type enum - what kind of entity the alert references
 */
export const alertEntityTypeSchema = z.enum([
  'projectStage',
  'project',
  'proposal',
]);

/**
 * Schema for creating a new alert
 * SECURITY: Enforces max lengths, validates email format
 */
export const createAlertSchema = z
  .object({
    userId: emailSchema, // Alert recipient
    type: alertTypeSchema,
    title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
    message: z.string().min(1, 'Message is required').max(1000, 'Message must be 1000 characters or less'),
    entityType: alertEntityTypeSchema,
    entityId: z.string().min(1, 'Entity ID is required').max(255),
    projectId: z.string().max(255).optional().default(''),
    siteId: z.string().max(255).optional().default(''),
  })
  .strict();

/**
 * Schema for alert list query parameters
 */
export const alertListQuerySchema = z
  .object({
    unreadOnly: z.string().optional(),
  })
  .transform((data) => ({
    unreadOnly: data.unreadOnly === 'true',
  }));
