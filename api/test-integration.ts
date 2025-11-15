/**
 * Integration tests for LiftWatch API
 * Tests all 16 function endpoints on Flex Consumption
 */

import https from 'https';

const API_BASE = 'https://liftwatch-api-flex.azurewebsites.net/api';

interface TestResult {
  name: string;
  endpoint: string;
  method: string;
  status: number;
  passed: boolean;
  error?: string;
  response?: any;
}

const results: TestResult[] = [];

function makeRequest(
  method: string,
  path: string,
  body?: any,
  headers?: Record<string, string>
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const fullUrl = API_BASE + path;

    const options = {
      method,
      rejectUnauthorized: false, // For testing only - allows self-signed certs
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = https.request(fullUrl, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({ status: res.statusCode || 500, body: data });
      });
    });

    req.on('error', (err) => {
      console.error(`Request error for ${method} ${fullUrl}:`, err.message);
      reject(err);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error(`Request timeout for ${method} ${fullUrl}`));
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test(
  name: string,
  method: string,
  endpoint: string,
  expectedStatus: number | number[],
  body?: any,
  headers?: Record<string, string>
): Promise<void> {
  try {
    const { status, body: responseBody } = await makeRequest(method, endpoint, body, headers);

    const expectedStatuses = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
    const passed = expectedStatuses.includes(status);

    let response;
    try {
      response = JSON.parse(responseBody);
    } catch {
      response = responseBody;
    }

    results.push({
      name,
      endpoint,
      method,
      status,
      passed,
      response: passed ? undefined : response,
    });

    console.log(`${passed ? '✅' : '❌'} ${name} - ${method} ${endpoint} (${status})`);
  } catch (error: any) {
    results.push({
      name,
      endpoint,
      method,
      status: 0,
      passed: false,
      error: error.message,
    });
    console.log(`❌ ${name} - Error: ${error.message}`);
  }
}

async function runTests(): Promise<void> {
  console.log('Testing LiftWatch API Integration\n');

  // Health endpoint
  await test('Health Check', 'GET', '/health', 200);

  // Auth endpoints
  await test('Login - Invalid Credentials', 'POST', '/auth/login', 401, {
    email: 'test@example.com',
    password: 'wrongpassword',
  });

  await test('Register - Missing Data', 'POST', '/auth/register', [400, 500], {
    password: 'password123',
  });

  await test('Forgot Password - Empty Email', 'POST', '/auth/forgot-password', [400, 500], {
    email: '',
  });

  await test('Reset Password - Missing Token', 'POST', '/auth/reset-password', [400, 401, 500], {
    email: 'test@example.com',
    token: '',
    newPassword: 'newpass123',
  });

  await test('Verify Email - Missing Token', 'POST', '/auth/verify-email', [400, 401, 500], {
    email: 'test@example.com',
    token: '',
  });

  await test('Resend Verification', 'POST', '/auth/resend-verification', [200, 400, 401], {
    email: 'test@example.com',
  });

  await test('Send Invitation', 'POST', '/auth/send-invitation', 401, {
    email: 'newuser@example.com',
    invitedEmail: 'invite@example.com',
  }, { Authorization: 'Bearer invalid' });

  await test('Accept Invitation', 'POST', '/auth/accept-invitation', [400, 401, 404, 500], {
    email: 'user@example.com',
    token: 'invalid-token',
    password: 'newpass123',
  });

  // User endpoints
  await test('Get Users - Unauthorized', 'GET', '/users', 401);

  await test('Get Users - Invalid Token', 'GET', '/users', 401, undefined, {
    Authorization: 'Bearer invalid-token',
  });

  await test('Approve User', 'POST', '/users/approve', 401, {
    email: 'user@example.com',
  }, { Authorization: 'Bearer invalid' });

  await test('Suspend User', 'POST', '/users/suspend', 401, {
    email: 'user@example.com',
  }, { Authorization: 'Bearer invalid' });

  await test('Delete User', 'DELETE', '/users/delete', 401, undefined, {
    Authorization: 'Bearer invalid',
  });

  await test('Update User', 'PUT', '/users/update', 401, {
    email: 'user@example.com',
    role: 'user',
  }, { Authorization: 'Bearer invalid' });

  // System endpoints
  await test('Profile - Unauthorized', 'GET', '/profile', 401);

  await test('Initialize', 'GET', '/initialize', [200, 500]);

  // CORS tests
  await test('CORS Preflight - Auth Login', 'OPTIONS', '/auth/login', 200);

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  const percentage = ((passed / total) * 100).toFixed(1);

  console.log(`\nTest Results: ${passed}/${total} passed (${percentage}%)`);

  if (results.some((r) => !r.passed)) {
    console.log('\nFailed tests:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  ${r.name}: ${r.method} ${r.endpoint} (status: ${r.status})`);
      });
  }

  process.exit(results.every((r) => r.passed) ? 0 : 1);
}

runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
