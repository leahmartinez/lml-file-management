/**
 * Reset Password Handler
 *
 * SECURITY:
 * - Rate limited to prevent brute force token guessing (3 requests per hour)
 * - Input validated with Zod schema
 * - Password strength enforced
 * - Tokens cleared after successful reset
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getUserByEmail, updateUser } from '../database/tableStorage';
import { hashPassword, isTokenExpired } from '../utils/auth';
import { success, error, addCorsHeaders } from '../utils/response';
import { validateRequestBody, resetPasswordSchema, isValidationFailure } from '../utils/validation';
import { withRateLimit, RATE_LIMITS } from '../utils/rateLimit';

async function authResetPasswordHandlerImpl(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return addCorsHeaders({ status: 200 }, request.headers.get('origin') || undefined);
    }

    context.log('Password reset attempt');

    // SECURITY: Validate input using Zod schema
    const validation = await validateRequestBody(request, resetPasswordSchema);
    if (isValidationFailure(validation)) {
      return validation.error;
    }

    const { email, token, newPassword } = validation.data;
    // email is already normalized by schema transform

    // Get user
    const user = await getUserByEmail(email);
    if (!user) {
      return addCorsHeaders(
        error('Invalid or expired password reset token', 400),
        request.headers.get('origin') || undefined
      );
    }

    // Check if token matches
    if (user.passwordResetToken !== token) {
      context.log('Invalid token provided for:', email);
      return addCorsHeaders(
        error('Invalid or expired password reset token', 400),
        request.headers.get('origin') || undefined
      );
    }

    // Check if token has expired
    if (isTokenExpired(user.passwordResetExpiry)) {
      context.log('Expired token for:', email);
      return addCorsHeaders(
        error('Password reset token has expired. Please request a new one.', 400),
        request.headers.get('origin') || undefined
      );
    }

    context.log('Resetting password for:', email);

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update user - set new password and clear reset token
    await updateUser(email, {
      passwordHash,
      passwordResetToken: undefined,
      passwordResetExpiry: undefined,
    });

    context.log('Password reset successful for:', email);

    return addCorsHeaders(
      success({
        message: 'Password reset successful! You can now log in with your new password.',
      }),
      request.headers.get('origin') || undefined
    );

  } catch (err: any) {
    context.error('Reset password error:', err);
    return addCorsHeaders(
      error('Failed to reset password. Please try again.', 500),
      request.headers.get('origin') || undefined
    );
  }
}

// SECURITY: Wrap handler with rate limiting (3 requests per hour)
export const authResetPasswordHandler = withRateLimit(
  authResetPasswordHandlerImpl,
  RATE_LIMITS.AUTH_PASSWORD_RESET
);

// Default export for function.json
export default authResetPasswordHandler;
