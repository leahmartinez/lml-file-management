/**
 * Resend Verification Email Handler
 *
 * SECURITY:
 * - Rate limited to prevent abuse (10 requests per 15 min)
 * - Input validated with Zod schema
 * - Consistent response to prevent user enumeration
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getUserByEmail, updateUser } from '../database/tableStorage';
import { generateSecureToken, generateTokenExpiry } from '../utils/auth';
import { sendVerificationEmail } from '../utils/email';
import { success, error, addCorsHeaders } from '../utils/response';
import { validateRequestBody, resendVerificationSchema, isValidationFailure } from '../utils/validation';
import { withRateLimit, RATE_LIMITS } from '../utils/rateLimit';

async function authResendVerificationHandlerImpl(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return addCorsHeaders({ status: 200 }, request.headers.get('origin') || undefined);
    }

    context.log('Resend verification email attempt');

    // SECURITY: Validate input using Zod schema
    const validation = await validateRequestBody(request, resendVerificationSchema);
    if (isValidationFailure(validation)) {
      return validation.error;
    }

    const { email } = validation.data;
    // email is already normalized by schema transform

    // Get user
    const user = await getUserByEmail(email);
    if (!user) {
      // SECURITY: Don't reveal if user exists or not
      return addCorsHeaders(
        success({
          message: 'If an account with this email exists and is not verified, a new verification email has been sent.',
        }),
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

    context.log('Generating new verification token for:', email);

    // Generate new verification token
    const verificationToken = generateSecureToken();
    const verificationExpiry = generateTokenExpiry(24);

    // Update user with new token
    await updateUser(email, {
      emailVerificationToken: verificationToken,
      emailVerificationExpiry: verificationExpiry,
    });

    // Send verification email
    await sendVerificationEmail(email, verificationToken, context);

    return addCorsHeaders(
      success({
        message: 'Verification email sent! Please check your inbox.',
      }),
      request.headers.get('origin') || undefined
    );

  } catch (err: any) {
    context.error('Resend verification error:', err);
    return addCorsHeaders(
      error('Failed to resend verification email. Please try again later.', 500),
      request.headers.get('origin') || undefined
    );
  }
}

// SECURITY: Wrap handler with rate limiting (10 requests per 15 minutes)
export const authResendVerificationHandler = withRateLimit(
  authResendVerificationHandlerImpl,
  RATE_LIMITS.AUTH_VERIFY
);

// Default export for function.json
export default authResendVerificationHandler;
