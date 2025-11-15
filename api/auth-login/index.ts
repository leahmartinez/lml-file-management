import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getUserByEmail } from "../src/database/tableStorage";
import { verifyPassword, generateToken } from "../src/utils/auth";
import { success, error, addCorsHeaders } from "../src/utils/response";

interface LoginRequest {
  email: string;
  password: string;
}

export async function authLoginHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return addCorsHeaders({ status: 200 }, request.headers.get('origin') || undefined);
    }

    context.log('Login attempt - method:', request.method);
    context.log('Login attempt - origin:', request.headers.get('origin'));

    const body = await request.json() as LoginRequest;
    const { email, password } = body;

    context.log('Login attempt - email:', email ? email.substring(0, 10) + '...' : 'missing');

    if (!email || !password) {
      context.log('Login failed - missing email or password');
      return addCorsHeaders(
        error('Email and password are required', 400),
        request.headers.get('origin') || undefined
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    context.log('Login attempt - normalized email:', normalizedEmail);

    const user = await getUserByEmail(normalizedEmail);
    if (!user) {
      context.log('Login failed - user not found:', normalizedEmail);
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
      context.log('Login failed - email not verified:', normalizedEmail);
      return addCorsHeaders(
        error('Please verify your email address before logging in. Check your inbox for the verification link.', 403),
        request.headers.get('origin') || undefined
      );
    }

    if (user.accountStatus === 'suspended') {
      context.log('Login failed - account suspended:', normalizedEmail);
      return addCorsHeaders(
        error('Your account has been suspended. Please contact your administrator.', 403),
        request.headers.get('origin') || undefined
      );
    }

    if (user.accountStatus === 'pending') {
      context.log('Login failed - account pending approval:', normalizedEmail);
      return addCorsHeaders(
        error('Your account is pending approval by an administrator. You will receive an email when your account is approved.', 403),
        request.headers.get('origin') || undefined
      );
    }

    context.log('Login successful for:', normalizedEmail);

    const token = generateToken({
      email: user.email,
      role: user.role,
      sites: JSON.parse(user.sites || '[]'),
    });

    return addCorsHeaders(
      success({
        token,
        user: {
          email: user.email,
          role: user.role,
          sites: JSON.parse(user.sites || '[]'),
          lastLogin: user.lastLogin,
          accountStatus: user.accountStatus,
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

