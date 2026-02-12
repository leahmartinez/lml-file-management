/**
 * Forgot Password Handler
 *
 * SECURITY:
 * - Rate limited to prevent abuse (3 requests per hour)
 * - Input validated with Zod schema
 * - Consistent response to prevent user enumeration
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getUserByEmail, updateUser } from '../database/tableStorage';
import { generateSecureToken, generateTokenExpiry } from '../utils/auth';
import { sendPasswordResetEmail } from '../utils/email';
import { success, error, addCorsHeaders } from '../utils/response';
import { validateRequestBody, forgotPasswordSchema, isValidationFailure } from '../utils/validation';
import { withRateLimit, RATE_LIMITS } from '../utils/rateLimit';

async function authForgotPasswordHandlerImpl(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return addCorsHeaders({ status: 200 }, request.headers.get('origin') || undefined);
    }

    context.log('Password reset request');

    // SECURITY: Validate input using Zod schema
    const validation = await validateRequestBody(request, forgotPasswordSchema);
    if (isValidationFailure(validation)) {
      return validation.error;
    }

    const { email } = validation.data;
    // email is already normalized by schema transform

    // Get user
    const user = await getUserByEmail(email);

    // SECURITY: Always return success to prevent email enumeration attacks
    if (!user) {
      context.log('User not found, but returning success for security');
      return addCorsHeaders(
        success({
          message: 'If an account with this email exists, a password reset link has been sent.',
        }),
        request.headers.get('origin') || undefined
      );
    }

    context.log('Generating password reset token for:', email);

    // Generate password reset token (expires in 1 hour)
    const resetToken = generateSecureToken();
    const resetExpiry = generateTokenExpiry(1);

    // Update user with reset token
    await updateUser(email, {
      passwordResetToken: resetToken,
      passwordResetExpiry: resetExpiry,
    });

    // Send password reset email
    await sendPasswordResetEmail(email, resetToken, context);

    return addCorsHeaders(
      success({
        message: 'If an account with this email exists, a password reset link has been sent.',
      }),
      request.headers.get('origin') || undefined
    );

  } catch (err: any) {
    context.error('Forgot password error:', err);
    return addCorsHeaders(
      error('Failed to process password reset request. Please try again later.', 500),
      request.headers.get('origin') || undefined
    );
  }
}

// SECURITY: Wrap handler with rate limiting (3 requests per hour)
export const authForgotPasswordHandler = withRateLimit(
  authForgotPasswordHandlerImpl,
  RATE_LIMITS.AUTH_PASSWORD_RESET
);

// Default export for function.json
export default authForgotPasswordHandler;
