import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getUserByEmail, updateUser } from "../src/database/tableStorage";
import { hashPassword, isTokenExpired } from "../src/utils/auth";
import { success, error, addCorsHeaders } from "../src/utils/response";

interface ResetPasswordRequest {
  email: string;
  token: string;
  newPassword: string;
}

export async function authResetPasswordHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return addCorsHeaders({ status: 200 }, request.headers.get('origin') || undefined);
    }

    context.log('Password reset attempt');

    const body = await request.json() as ResetPasswordRequest;
    const { email, token, newPassword } = body;

    if (!email || !token || !newPassword) {
      return addCorsHeaders(
        error('Email, token, and new password are required', 400),
        request.headers.get('origin') || undefined
      );
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return addCorsHeaders(
        error('Password must be at least 8 characters long', 400),
        request.headers.get('origin') || undefined
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Get user
    const user = await getUserByEmail(normalizedEmail);
    if (!user) {
      return addCorsHeaders(
        error('Invalid or expired password reset token', 400),
        request.headers.get('origin') || undefined
      );
    }

    // Check if token matches
    if (user.passwordResetToken !== token) {
      context.log('Invalid token provided for:', normalizedEmail);
      return addCorsHeaders(
        error('Invalid or expired password reset token', 400),
        request.headers.get('origin') || undefined
      );
    }

    // Check if token has expired
    if (isTokenExpired(user.passwordResetExpiry)) {
      context.log('Expired token for:', normalizedEmail);
      return addCorsHeaders(
        error('Password reset token has expired. Please request a new one.', 400),
        request.headers.get('origin') || undefined
      );
    }

    context.log('Resetting password for:', normalizedEmail);

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update user - set new password and clear reset token
    await updateUser(normalizedEmail, {
      passwordHash,
      passwordResetToken: undefined,
      passwordResetExpiry: undefined,
    });

    context.log('Password reset successful for:', normalizedEmail);

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

