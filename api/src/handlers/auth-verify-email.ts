import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getUserByEmail, updateUser } from '../database/tableStorage';
import { isTokenExpired } from '../utils/auth';
import { success, error, addCorsHeaders } from '../utils/response';

interface VerifyEmailRequest {
  email: string;
  token: string;
}

export async function authVerifyEmailHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return addCorsHeaders({ status: 200 }, request.headers.get('origin') || undefined);
    }

    context.log('Email verification attempt');

    const body = await request.json() as VerifyEmailRequest;
    const { email, token } = body;

    if (!email || !token) {
      return addCorsHeaders(
        error('Email and verification token are required', 400),
        request.headers.get('origin') || undefined
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Get user
    const user = await getUserByEmail(normalizedEmail);
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

    context.log('Email verified successfully:', normalizedEmail);

    // Update user - mark email as verified and clear token
    await updateUser(normalizedEmail, {
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

// Default export for function.json
export default authVerifyEmailHandler;
