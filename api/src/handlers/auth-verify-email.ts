/**
 * Email Verification Handler
 *
 * SECURITY:
 * - Rate limited to prevent token brute forcing (10 attempts per 15 min)
 * - Input validated with Zod schema
 * - Tokens cleared after successful verification
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getUserByEmail, updateUser } from '../database/tableStorage';
import { isTokenExpired } from '../utils/auth';
import { success, error, addCorsHeaders } from '../utils/response';
import { validateRequestBody, verifyEmailSchema, isValidationFailure } from '../utils/validation';
import { withRateLimit, RATE_LIMITS } from '../utils/rateLimit';

async function authVerifyEmailHandlerImpl(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return addCorsHeaders({ status: 200 }, request.headers.get('origin') || undefined);
    }

    context.log('Email verification attempt');

    // SECURITY: Validate input using Zod schema
    const validation = await validateRequestBody(request, verifyEmailSchema);
    if (isValidationFailure(validation)) {
      return validation.error;
    }

    const { email, token } = validation.data;
    // email is already normalized by schema transform

    // Get user
    const user = await getUserByEmail(email);
    if (!user) {
      return addCorsHeaders(
        error('User not found', 404),
        request.headers.get('origin') || undefined
      );
    }

    // Check if already verified
    if (user.emailVerified) {
      return addCorsHeaders(
        error('Email is already verified', 400),
        request.headers.get('origin') || undefined
      );
    }

    // Check if token matches
    if (user.emailVerificationToken !== token) {
      return addCorsHeaders(
        error('Invalid verification token', 400),
        request.headers.get('origin') || undefined
      );
    }

    // Check if token has expired
    if (isTokenExpired(user.emailVerificationExpiry)) {
      return addCorsHeaders(
        error('Verification token has expired. Please request a new one.', 400),
        request.headers.get('origin') || undefined
      );
    }

    context.log('Email verified successfully:', email);

    // Update user - mark email as verified and clear token
    await updateUser(email, {
      emailVerified: true,
      emailVerificationToken: undefined,
      emailVerificationExpiry: undefined,
    });

    return addCorsHeaders(
      success({
        message: 'Email verified successfully! Your account is now pending admin approval.',
      }),
      request.headers.get('origin') || undefined
    );

  } catch (err: any) {
    context.error('Email verification error:', err);
    return addCorsHeaders(
      error('Email verification failed. Please try again.', 500),
      request.headers.get('origin') || undefined
    );
  }
}

// SECURITY: Wrap handler with rate limiting (10 attempts per 15 minutes)
export const authVerifyEmailHandler = withRateLimit(
  authVerifyEmailHandlerImpl,
  RATE_LIMITS.AUTH_VERIFY
);

// Default export for function.json
export default authVerifyEmailHandler;
