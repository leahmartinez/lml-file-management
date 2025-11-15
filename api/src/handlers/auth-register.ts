import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getUserByEmail, createUser } from '../database/tableStorage';
import { hashPassword, generateSecureToken, generateTokenExpiry } from '../utils/auth';
import { sendVerificationEmail } from '../utils/email';
import { success, error, addCorsHeaders } from '../utils/response';

interface RegisterRequest {
  email: string;
  password: string;
}

export async function authRegisterHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return addCorsHeaders({ status: 200 }, request.headers.get('origin') || undefined);
    }

    context.log('User registration attempt');

    const body = await request.json() as RegisterRequest;
    const { email, password } = body;

    if (!email || !password) {
      return addCorsHeaders(
        error('Email and password are required', 400),
        request.headers.get('origin') || undefined
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return addCorsHeaders(
        error('Invalid email format', 400),
        request.headers.get('origin') || undefined
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return addCorsHeaders(
        error('Password must be at least 8 characters long', 400),
        request.headers.get('origin') || undefined
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await getUserByEmail(normalizedEmail);
    if (existingUser) {
      return addCorsHeaders(
        error('An account with this email already exists', 409),
        request.headers.get('origin') || undefined
      );
    }

    context.log('Creating new user:', normalizedEmail);

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate email verification token
    const verificationToken = generateSecureToken();
    const verificationExpiry = generateTokenExpiry(24);

    // Create user with pending status
    await createUser({
      email: normalizedEmail,
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
    await sendVerificationEmail(normalizedEmail, verificationToken, context);

    return addCorsHeaders(
      success({
        message: 'Registration successful! Please check your email to verify your account.',
        email: normalizedEmail,
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

// Default export for function.json
export default authRegisterHandler;
