/**
 * Login Handler
 *
 * SECURITY:
 * - Rate limited to prevent brute force attacks (5 attempts per 15 minutes)
 * - Input validated with Zod schema
 * - Consistent error messages to prevent user enumeration
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getUserByEmail, updateUser } from '../database/tableStorage';
import { verifyPassword, generateToken } from '../utils/auth';
import { success, error, addCorsHeaders } from '../utils/response';
import { safeParseJsonArray } from '../utils/json';
import { validateRequestBody, loginSchema, isValidationFailure } from '../utils/validation';
import { withRateLimit, RATE_LIMITS } from '../utils/rateLimit';

async function authLoginHandlerImpl(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return addCorsHeaders({ status: 200 }, request.headers.get('origin') || undefined);
    }

    // SECURITY: Validate input using Zod schema
    const validation = await validateRequestBody(request, loginSchema);
    if (isValidationFailure(validation)) {
      context.log('Login failed - validation error');
      return validation.error;
    }

    const { email, password } = validation.data;
    // email is already normalized (lowercase, trimmed) by schema transform

    context.log('Login attempt - email:', email.substring(0, 10) + '...');

    const user = await getUserByEmail(email);
    if (!user) {
      context.log('Login failed - user not found:', email);
      return addCorsHeaders(
        error('Invalid email or password', 401),
        request.headers.get('origin') || undefined
      );
    }

    context.log('Login attempt - user found, verifying password...');

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      context.log('Login failed - password incorrect');
      return addCorsHeaders(
        error('Invalid email or password', 401),
        request.headers.get('origin') || undefined
      );
    }

    if (!user.emailVerified) {
      context.log('Login failed - email not verified:', email);
      return addCorsHeaders(
        error('Please verify your email address before logging in. Check your inbox for the verification link.', 403),
        request.headers.get('origin') || undefined
      );
    }

    if (user.accountStatus === 'suspended') {
      context.log('Login failed - account suspended:', email);
      return addCorsHeaders(
        error('Your account has been suspended. Please contact your administrator.', 403),
        request.headers.get('origin') || undefined
      );
    }

    if (user.accountStatus === 'pending') {
      context.log('Login failed - account pending approval:', email);
      return addCorsHeaders(
        error('Your account is pending approval by an administrator. You will receive an email when your account is approved.', 403),
        request.headers.get('origin') || undefined
      );
    }

    context.log('Login successful for:', email);

    const loginTimestamp = new Date().toISOString();
    const updatedUser = await updateUser(user.email, {
      lastLogin: loginTimestamp,
    });

    const token = generateToken({
      email: updatedUser.email,
      role: updatedUser.role,
      sites: safeParseJsonArray(updatedUser.sites, []),
    });

    return addCorsHeaders(
      success({
        token,
        user: {
          email: updatedUser.email,
          role: updatedUser.role,
          sites: safeParseJsonArray(updatedUser.sites, []),
          lastLogin: updatedUser.lastLogin,
          accountStatus: updatedUser.accountStatus,
          mustChangePassword: updatedUser.mustChangePassword || false,
        },
      }),
      request.headers.get('origin') || undefined
    );
  } catch (err: any) {
    context.error('Login error:', err);
    return addCorsHeaders(
      error('Server error', 500),
      request.headers.get('origin') || undefined
    );
  }
}

// SECURITY: Wrap handler with rate limiting (5 attempts per 15 minutes)
export const authLoginHandler = withRateLimit(
  authLoginHandlerImpl,
  RATE_LIMITS.AUTH_LOGIN
);

// Default export for function.json
export default authLoginHandler;
