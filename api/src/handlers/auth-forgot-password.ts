import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getUserByEmail, updateUser } from '../database/tableStorage';
import { generateSecureToken, generateTokenExpiry } from '../utils/auth';
import { sendPasswordResetEmail } from '../utils/email';
import { success, error, addCorsHeaders } from '../utils/response';

interface ForgotPasswordRequest {
  email: string;
}

export async function authForgotPasswordHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return addCorsHeaders({ status: 200 }, request.headers.get('origin') || undefined);
    }

    context.log('Password reset request');

    const body = await request.json() as ForgotPasswordRequest;
    const { email } = body;

    if (!email) {
      return addCorsHeaders(
        error('Email is required', 400),
        request.headers.get('origin') || undefined
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Get user
    const user = await getUserByEmail(normalizedEmail);

    // Always return success to prevent email enumeration attacks
    if (!user) {
      context.log('User not found, but returning success for security');
      return addCorsHeaders(
        success({
          message: 'If an account with this email exists, a password reset link has been sent.',
        }),
        request.headers.get('origin') || undefined
      );
    }

    context.log('Generating password reset token for:', normalizedEmail);

    // Generate password reset token (expires in 1 hour)
    const resetToken = generateSecureToken();
    const resetExpiry = generateTokenExpiry(1);

    // Update user with reset token
    await updateUser(normalizedEmail, {
      passwordResetToken: resetToken,
      passwordResetExpiry: resetExpiry,
    });

    // Send password reset email
    await sendPasswordResetEmail(normalizedEmail, resetToken, context);

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

// Default export for function.json
export default authForgotPasswordHandler;
