/**
 * HTTP Response utilities
 */

import { HttpResponseInit } from "@azure/functions";

/**
 * Success response
 */
export function success(data: any, status: number = 200): HttpResponseInit {
  return {
    status,
    jsonBody: data,
    headers: {
      'Content-Type': 'application/json',
    },
  };
}

/**
 * Error response
 */
export function error(message: string, status: number = 400): HttpResponseInit {
  return {
    status,
    jsonBody: { error: message },
    headers: {
      'Content-Type': 'application/json',
    },
  };
}

/**
 * Unauthorized response
 */
export function unauthorized(message: string = 'Unauthorized'): HttpResponseInit {
  return error(message, 401);
}

/**
 * Forbidden response
 */
export function forbidden(message: string = 'Forbidden'): HttpResponseInit {
  return error(message, 403);
}

/**
 * Not found response
 */
export function notFound(message: string = 'Not found'): HttpResponseInit {
  return error(message, 404);
}

/**
 * Server error response
 */
export function serverError(message: string = 'Internal server error'): HttpResponseInit {
  return error(message, 500);
}

/**
 * Add CORS headers
 */
export function addCorsHeaders(response: HttpResponseInit | { status: number }, origin?: string): HttpResponseInit {
  // Default allowed origins for local development
  const defaultOrigins = ['http://localhost:8080', 'http://localhost:5173', 'http://127.0.0.1:8080'];
  const envOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(o => o.trim());
  const allowedOrigins = envOrigins.length > 0 ? envOrigins : defaultOrigins;
  const requestOrigin = origin || '';

  // Allow request origin if it's in the allowed list, or use first allowed origin
  const isAllowed = requestOrigin && allowedOrigins.some(o => o.trim() === requestOrigin);
  const corsOrigin = isAllowed ? requestOrigin : (allowedOrigins[0] || '*');

  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };

  // Handle simple status-only responses (for OPTIONS preflight requests)
  if ('status' in response && Object.keys(response).length === 1) {
    return {
      status: response.status,
      headers: corsHeaders,
      body: '', // Explicitly set empty body for OPTIONS
    };
  }

  // For responses with content (jsonBody or body), merge CORS headers properly
  const httpResponse = response as HttpResponseInit;

  // If jsonBody exists, convert it to a proper body string for serialization
  // Azure Functions may not automatically serialize jsonBody in all scenarios
  const finalBody = httpResponse.jsonBody
    ? JSON.stringify(httpResponse.jsonBody)
    : httpResponse.body;

  // Build merged headers
  const mergedHeaders = {
    ...(httpResponse.headers || {}),
    ...corsHeaders,
  };

  // Ensure Content-Type is set for JSON bodies
  if (finalBody && !mergedHeaders['Content-Type']) {
    mergedHeaders['Content-Type'] = 'application/json';
  }

  return {
    status: httpResponse.status,
    body: finalBody,
    headers: mergedHeaders,
  };
}

