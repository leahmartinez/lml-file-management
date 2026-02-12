/**
 * Registration Handler
 *
 * SECURITY:
 * - Rate limited to prevent spam registrations (3 per hour)
 * - Input validated with Zod schema
 * - Password strength enforced
 * - Email normalized to prevent duplicates
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getUserByEmail, createUser } from '../database/tableStorage';
import { hashPassword, generateSecureToken, generateTokenExpiry } from '../utils/auth';
import { sendVerificationEmail } from '../utils/email';
import { success, error, addCorsHeaders } from '../utils/response';
import { validateRequestBody, registerSchema, isValidationFailure } from '../utils/validation';
import { withRateLimit, RATE_LIMITS } from '../utils/rateLimit';

async function authRegisterHandlerImpl(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return addCorsHeaders({ status: 200 }, request.headers.get('origin') || undefined);
    }

    context.log('User registration attempt');

    // SECURITY: Validate input using Zod schema
    const validation = await validateRequestBody(request, registerSchema);
    if (isValidationFailure(validation)) {
      return validation.error;
    }

    const { email, password } = validation.data;
    // email is already normalized (lowercase, trimmed) by schema transform

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return addCorsHeaders(
        error('An account with this email already exists', 409),
        request.headers.get('origin') || undefined
      );
    }

    context.log('Creating new user:', email);

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate email verification token
    const verificationToken = generateSecureToken();
    const verificationExpiry = generateTokenExpiry(24);

    // Create user with pending status
    await createUser({
      email,
      passwordHash,
      role: 'site_manager',
      sites: [],
      createdBy: 'self-registration',
      accountStatus: 'pending',
      emailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpiry: verificationExpiry,
    });

    context.log('User created, sending verification email');

    // Send verification email
    await sendVerificationEmail(email, verificationToken, context);

    return addCorsHeaders(
      success({
        message: 'Registration successful! Please check your email to verify your account.',
        email,
      }),
      request.headers.get('origin') || undefined
    );

  } catch (err: any) {
    context.error('Registration error:', err);
    return addCorsHeaders(
      error('Registration failed. Please try again later.', 500),
      request.headers.get('origin') || undefined
    );
  }
}

// SECURITY: Wrap handler with rate limiting (3 registrations per hour)
export const authRegisterHandler = withRateLimit(
  authRegisterHandlerImpl,
  RATE_LIMITS.AUTH_REGISTER
);

// Default export for function.json
export default authRegisterHandler;
