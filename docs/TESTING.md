# Testing Guide

This document provides an overview of the comprehensive test suite for the LiftWatch Asset View application.

## Test Structure

The test suite is organized into several categories:

### 1. Unit Tests (`src/lib/__tests__/`, `src/hooks/__tests__/`)
- **Password Utilities** (`passwordUtils.test.ts`): Tests for password hashing, verification, and migration
- **Authentication Hook** (`useAuth.test.tsx`): Tests for login, logout, and user management
- **Component Tests**: Tests for individual React components

### 2. Security Tests (`src/security/__tests__/`)
- **Authentication Security** (`authSecurity.test.tsx`): Tests for password security, authorization bypass attempts, session management
- **XSS Protection** (`xssProtection.test.ts`): Tests for cross-site scripting vulnerabilities and input sanitization

### 3. Integration Tests (`src/integration/__tests__/`)
- **User Flows** (`userFlows.test.tsx`): End-to-end user flow tests including login, role-based access, and data filtering

### 4. Component Tests (`src/components/__tests__/`)
- **Protected Routes** (`ProtectedRoute.test.tsx`): Tests for route protection
- **Admin Routes** (`AdminRoute.test.tsx`): Tests for admin-only route access
- **Login Form** (`LoginForm.test.tsx`): Tests for login form functionality and security

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm test
```

### Run tests with UI
```bash
npm run test:ui
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run tests once (CI mode)
```bash
npm run test:run
```

## Test Coverage

The test suite covers:

### Functionality Tests
- ✅ Password hashing and verification
- ✅ User authentication (login/logout)
- ✅ Role-based access control
- ✅ Data filtering by user role
- ✅ Protected routes
- ✅ Form validation
- ✅ User session persistence

### Security Tests
- ✅ Password security (no plain text storage)
- ✅ Authorization bypass prevention
- ✅ XSS protection
- ✅ Input validation
- ✅ Session security
- ✅ Role escalation prevention
- ✅ SQL injection attempts
- ✅ Script injection attempts

### Integration Tests
- ✅ Complete login flow
- ✅ Role-based route access
- ✅ Data filtering by role
- ✅ Error handling

## Security Test Scenarios

### Authentication Security
1. **Password Hashing**: Verifies passwords are hashed before storage
2. **No Plain Text Storage**: Ensures passwords are never stored in plain text
3. **Password Omission**: Verifies passwords are not included in user objects after login
4. **Authorization Bypass**: Tests prevention of unauthorized access to admin routes
5. **Role Escalation**: Tests prevention of role manipulation via localStorage
6. **Session Security**: Tests proper session cleanup on logout

### XSS Protection
1. **Script Tag Injection**: Tests that script tags are escaped
2. **HTML Entity Escaping**: Tests proper escaping of HTML entities
3. **JavaScript Protocol**: Tests handling of javascript: protocol in links
4. **User Data Rendering**: Tests safe rendering of user-provided data

### Input Validation
1. **Long Username**: Tests handling of extremely long usernames
2. **Special Characters**: Tests handling of special characters in usernames
3. **SQL Injection**: Tests prevention of SQL injection attempts
4. **XSS Payloads**: Tests prevention of XSS attacks

## Test Data

Mock data is defined in `src/test/mockData.ts`:
- Mock users with different roles
- Mock assets
- Mock sites
- Mock projects

## Continuous Integration

Tests are automatically run in CI/CD pipeline:
- On push to `main` or `dev` branches
- On pull requests
- Before deployment to Azure Static Web Apps

## Writing New Tests

When adding new features, ensure you:

1. **Add unit tests** for new utilities or hooks
2. **Add component tests** for new UI components
3. **Add security tests** for any authentication/authorization changes
4. **Add integration tests** for new user flows
5. **Update this document** with new test scenarios

### Example Test Structure

```typescript
import { describe, it, expect } from 'vitest';

describe('FeatureName', () => {
  describe('Functionality', () => {
    it('should do something', () => {
      // Test implementation
    });
  });

  describe('Security', () => {
    it('should prevent security issue', () => {
      // Security test
    });
  });
});
```

## Test Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up localStorage and mocks after tests
3. **Mocking**: Use mocks for external dependencies (fetch, localStorage)
4. **Assertions**: Use descriptive assertions
5. **Coverage**: Aim for high test coverage, especially for security-critical code

## Known Limitations

1. **E2E Tests**: Currently using integration tests instead of full E2E tests (Playwright/Cypress could be added)
2. **File Upload Tests**: File upload functionality may need additional mocking
3. **CSV Data Tests**: CSV parsing tests may need actual file mocks

## Troubleshooting

### Tests failing with "Cannot find module"
- Ensure all dependencies are installed: `npm install`
- Check that test files are in the correct location

### Tests timing out
- Increase timeout in vitest.config.ts if needed
- Check for async operations that aren't being awaited

### localStorage issues
- Ensure tests clean up localStorage in `beforeEach` or `afterEach`
- Check that test setup file clears localStorage

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Azure Static Web Apps Testing](https://docs.microsoft.com/azure/static-web-apps/)

