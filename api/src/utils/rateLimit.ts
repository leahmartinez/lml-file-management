/**
 * Rate Limiting for Azure Functions
 *
 * SECURITY: Implements IP-based and User-based rate limiting to prevent:
 * - Brute force attacks on authentication endpoints
 * - Denial of service through excessive requests
 * - Resource exhaustion attacks
 *
 * Uses Azure Table Storage for distributed state across serverless instances.
 *
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html
 * @see RFC 6585 - 429 Too Many Requests
 */

import { HttpRequest, HttpResponseInit } from '@azure/functions';
import { TableClient, TableEntity } from '@azure/data-tables';
import { addCorsHeaders } from './response';

// =============================================================================
// CONFIGURATION
// =============================================================================

export interface RateLimitConfig {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum requests allowed per window */
  maxRequests: number;
  /** Prefix for storage key (identifies endpoint category) */
  keyPrefix: string;
}

/**
 * Rate limit configurations for different endpoint categories
 *
 * SECURITY: Stricter limits on auth endpoints to prevent brute force attacks
 */
export const RATE_LIMITS = {
  // Authentication endpoints - strictest limits
  AUTH_LOGIN: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 min
    keyPrefix: 'RL_LOGIN',
  } as RateLimitConfig,

  AUTH_REGISTER: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 registrations per hour
    keyPrefix: 'RL_REGISTER',
  } as RateLimitConfig,

  AUTH_PASSWORD_RESET: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 reset requests per hour
    keyPrefix: 'RL_PWRESET',
  } as RateLimitConfig,

  AUTH_VERIFY: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10, // 10 verification attempts
    keyPrefix: 'RL_VERIFY',
  } as RateLimitConfig,

  AUTH_INVITATION: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20, // 20 invitations per hour
    keyPrefix: 'RL_INVITE',
  } as RateLimitConfig,

  // Standard authenticated endpoints - moderate limits
  STANDARD: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
    keyPrefix: 'RL_STD',
  } as RateLimitConfig,

  // Write operations - more restrictive
  WRITE: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 writes per minute
    keyPrefix: 'RL_WRITE',
  } as RateLimitConfig,

  // Admin operations
  ADMIN: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 50, // 50 admin ops per minute
    keyPrefix: 'RL_ADMIN',
  } as RateLimitConfig,
} as const;

// =============================================================================
// STORAGE (Azure Table Storage)
// =============================================================================

interface RateLimitEntity extends TableEntity {
  count: number;
  windowStart: string;
}

let rateLimitTable: TableClient | null = null;

/**
 * Get or create the rate limit table client
 */
function getRateLimitTable(): TableClient | null {
  if (rateLimitTable) return rateLimitTable;

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString || connectionString.includes('your-')) {
    // Not configured - skip rate limiting in development
    return null;
  }

  try {
    rateLimitTable = TableClient.fromConnectionString(connectionString, 'RateLimits');
    return rateLimitTable;
  } catch (err) {
    console.error('Failed to create rate limit table client:', err);
    return null;
  }
}

/**
 * Initialize the RateLimits table
 * Call this during application startup
 */
export async function initializeRateLimitTable(): Promise<void> {
  const table = getRateLimitTable();
  if (!table) return;

  try {
    await table.createTable();
    console.log('RateLimits table created or already exists');
  } catch (error: any) {
    // 409 = table already exists, which is fine
    if (error.statusCode !== 409) {
      console.error('Failed to create RateLimits table:', error);
    }
  }
}

// =============================================================================
// CLIENT IDENTIFICATION
// =============================================================================

/**
 * Extract client IP from request
 *
 * SECURITY: Handles Azure proxy headers correctly to get real client IP
 */
export function getClientIP(request: HttpRequest): string {
  // X-Forwarded-For: client, proxy1, proxy2
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  // Azure-specific headers
  const clientIP =
    request.headers.get('x-client-ip') || request.headers.get('x-real-ip');
  if (clientIP) {
    return clientIP.trim();
  }

  return 'unknown';
}

/**
 * Generate a sanitized key for storage
 * Removes characters that aren't allowed in Azure Table Storage keys
 */
function sanitizeKey(key: string): string {
  // Azure Table Storage key restrictions: no /, \, #, ?, control chars
  return key.replace(/[\/\\#?\x00-\x1f\x7f-\x9f]/g, '_').substring(0, 250);
}

// =============================================================================
// RATE LIMIT CHECK
// =============================================================================

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Remaining requests in current window */
  remaining: number;
  /** When the current window resets */
  resetTime: Date;
  /** Seconds until retry allowed (only set when blocked) */
  retryAfter?: number;
}

/**
 * Check rate limit for a request
 *
 * @param request - The HTTP request
 * @param config - Rate limit configuration
 * @param userEmail - Optional user email for user-based limiting
 * @returns Rate limit result
 */
export async function checkRateLimit(
  request: HttpRequest,
  config: RateLimitConfig,
  userEmail?: string
): Promise<RateLimitResult> {
  const table = getRateLimitTable();

  // Skip rate limiting if storage not configured (development mode)
  if (!table) {
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetTime: new Date(Date.now() + config.windowMs),
    };
  }

  try {
    const now = new Date();
    const ip = getClientIP(request);

    // Create partition key (by hour for efficient cleanup)
    const hourBucket = now.toISOString().slice(0, 13).replace(/[:-]/g, '');
    const partitionKey = sanitizeKey(`${config.keyPrefix}_${hourBucket}`);

    // Create row key (IP + optional user)
    const identifier = userEmail ? `${ip}_${userEmail}` : ip;
    const rowKey = sanitizeKey(identifier);

    // Try to get existing record
    let entity: RateLimitEntity | null = null;
    try {
      const result = await table.getEntity<RateLimitEntity>(partitionKey, rowKey);
      entity = result;
    } catch (err: any) {
      // 404 = no existing record
      if (err.statusCode !== 404) {
        throw err;
      }
    }

    const windowStart = new Date(now.getTime() - config.windowMs);

    if (entity) {
      const entityWindowStart = new Date(entity.windowStart);

      // Check if still in same window
      if (entityWindowStart > windowStart) {
        // Check if limit exceeded
        if (entity.count >= config.maxRequests) {
          const retryAfter = Math.ceil(
            (entityWindowStart.getTime() + config.windowMs - now.getTime()) / 1000
          );

          return {
            allowed: false,
            remaining: 0,
            resetTime: new Date(entityWindowStart.getTime() + config.windowMs),
            retryAfter: Math.max(1, retryAfter),
          };
        }

        // Increment count
        entity.count += 1;
        await table.updateEntity(entity, 'Merge');

        return {
          allowed: true,
          remaining: config.maxRequests - entity.count,
          resetTime: new Date(entityWindowStart.getTime() + config.windowMs),
        };
      }
    }

    // New window - create or reset entity
    const newEntity: RateLimitEntity = {
      partitionKey,
      rowKey,
      count: 1,
      windowStart: now.toISOString(),
    };

    try {
      await table.upsertEntity(newEntity, 'Replace');
    } catch (err) {
      console.error('Failed to upsert rate limit entity:', err);
    }

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: new Date(now.getTime() + config.windowMs),
    };
  } catch (err) {
    // SECURITY: Fail open on rate limit errors to maintain availability
    // Log for monitoring but don't block legitimate requests
    console.error('Rate limit check failed:', err);

    return {
      allowed: true,
      remaining: config.maxRequests,
      resetTime: new Date(Date.now() + config.windowMs),
    };
  }
}

// =============================================================================
// RESPONSE HELPERS
// =============================================================================

/**
 * Create 429 Too Many Requests response
 *
 * SECURITY: Includes proper headers per RFC 6585
 * - Retry-After: tells client when to retry
 * - X-RateLimit-*: standard rate limit headers
 */
export function rateLimitExceeded(
  request: HttpRequest,
  result: RateLimitResult
): HttpResponseInit {
  return addCorsHeaders(
    {
      status: 429,
      jsonBody: {
        error: 'Too many requests. Please try again later.',
        retryAfter: result.retryAfter,
      },
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(result.retryAfter || 60),
        'X-RateLimit-Limit': '0',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': result.resetTime.toISOString(),
      },
    },
    request.headers.get('origin') || undefined
  );
}

/**
 * Add rate limit headers to a successful response
 */
export function addRateLimitHeaders(
  response: HttpResponseInit,
  result: RateLimitResult,
  config: RateLimitConfig
): HttpResponseInit {
  const headers = {
    ...(response.headers || {}),
    'X-RateLimit-Limit': String(config.maxRequests),
    'X-RateLimit-Remaining': String(Math.max(0, result.remaining)),
    'X-RateLimit-Reset': result.resetTime.toISOString(),
  };

  return {
    ...response,
    headers,
  };
}

// =============================================================================
// HANDLER WRAPPER
// =============================================================================

/**
 * Wrap an Azure Functions handler with rate limiting
 *
 * @param handler - The actual handler function
 * @param config - Rate limit configuration
 * @param getUserEmail - Optional function to extract user email from request
 * @returns Wrapped handler with rate limiting
 *
 * @example
 * // Wrap login handler with strict auth rate limiting
 * export const authLoginHandler = withRateLimit(
 *   authLoginHandlerImpl,
 *   RATE_LIMITS.AUTH_LOGIN
 * );
 *
 * @example
 * // Wrap with user-based limiting
 * export const projectsHandler = withRateLimit(
 *   projectsHandlerImpl,
 *   RATE_LIMITS.WRITE,
 *   (req) => extractUserEmailFromJWT(req)
 * );
 */
export function withRateLimit(
  handler: (request: HttpRequest, ...args: any[]) => Promise<HttpResponseInit>,
  config: RateLimitConfig,
  getUserEmail?: (request: HttpRequest) => string | undefined
): (request: HttpRequest, ...args: any[]) => Promise<HttpResponseInit> {
  return async (request: HttpRequest, ...args: any[]): Promise<HttpResponseInit> => {
    // Skip rate limiting for CORS preflight requests
    if (request.method === 'OPTIONS') {
      return handler(request, ...args);
    }

    // Get optional user identifier
    const userEmail = getUserEmail?.(request);

    // Check rate limit
    const result = await checkRateLimit(request, config, userEmail);

    if (!result.allowed) {
      return rateLimitExceeded(request, result);
    }

    // Call the actual handler
    const response = await handler(request, ...args);

    // Add rate limit headers to response
    return addRateLimitHeaders(response, result, config);
  };
}
