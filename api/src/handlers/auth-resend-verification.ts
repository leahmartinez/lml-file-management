import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getUserByEmail, updateUser } from '../database/tableStorage';
import { generateSecureToken, generateTokenExpiry } from '../utils/auth';
import { sendVerificationEmail } from '../utils/email';
import { success, error, addCorsHeaders } from '../utils/response';

export async function authResendVerificationHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return addCorsHeaders({ status: 200 }, request.headers.get('origin') || undefined);
    }

    context.log('Resend verification email attempt');

    const body = await request.json() as { email: string };
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
    if (!user) {
      // Don't reveal if user exists or not (security best practice)
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

    context.log('Generating new verification token for:', normalizedEmail);

    // Generate new verification token
    const verificationToken = generateSecureToken();
    const verificationExpiry = generateTokenExpiry(24);

    // Update user with new token
    await updateUser(normalizedEmail, {
      emailVerificationToken: verificationToken,
      emailVerificationExpiry: verificationExpiry,
    });

    // Send verification email
    await sendVerificationEmail(normalizedEmail, verificationToken, context);

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

// Default export for function.json
export default authResendVerificationHandler;
