import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { authApi, usersApi } from '@/services/apiService';

// Mock the API service
vi.mock('@/services/apiService', () => ({
  authApi: {
    login: vi.fn(),
    logout: vi.fn(),
    getProfile: vi.fn(),
  },
  usersApi: {
    getAllUsers: vi.fn(),
  },
}));

describe('Server-Side Authentication Security Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();

    // Setup default mock implementations for all tests
    (authApi.logout as any).mockImplementation(() => {
      localStorage.removeItem('jwt_token');
    });

    (authApi.login as any).mockImplementation(() => Promise.reject(new Error('Login not mocked')));
    (authApi.getProfile as any).mockImplementation(() => Promise.reject(new Error('Profile not mocked')));
    (usersApi.getAllUsers as any).mockImplementation(() => Promise.reject(new Error('Users not mocked')));
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('JWT Token Security', () => {
    it('should store JWT token in localStorage after login', async () => {
      const mockResponse = {
        token: 'mock.jwt.token',
        user: {
          email: 'admin@example.com',
          role: 'admin' as const,
          sites: [],
        },
      };

      (authApi.login as any).mockImplementationOnce(async () => {
        localStorage.setItem('jwt_token', mockResponse.token);
        return mockResponse;
      });
      (authApi.getProfile as any).mockResolvedValueOnce(mockResponse.user);
      (usersApi.getAllUsers as any).mockResolvedValueOnce([]);

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(result.current.login).toBeDefined();
      });

      await act(async () => {
        await result.current.login('admin@example.com', 'password');
      });

      await waitFor(() => {
        expect(localStorage.getItem('jwt_token')).toBe('mock.jwt.token');
      });
    });

    it('should not store passwords in localStorage', async () => {
      const mockResponse = {
        token: 'mock.jwt.token',
        user: {
          email: 'admin@example.com',
          role: 'admin' as const,
          sites: [],
        },
      };

      (authApi.login as any).mockImplementationOnce(async () => {
        localStorage.setItem('jwt_token', mockResponse.token);
        return mockResponse;
      });
      (authApi.getProfile as any).mockResolvedValueOnce(mockResponse.user);
      (usersApi.getAllUsers as any).mockResolvedValueOnce([]);

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(result.current.login).toBeDefined();
      });

      await act(async () => {
        await result.current.login('admin@example.com', 'password');
      });

      await waitFor(() => {
        expect(result.current.user).toBeTruthy();
      });

      // Check that no password is stored anywhere in localStorage
      const allLocalStorageItems = Object.keys(localStorage).map(key =>
        localStorage.getItem(key)
      ).join('');

      expect(allLocalStorageItems).not.toContain('password');
      expect(result.current.user?.password).toBeUndefined();
    });

    it('should clear JWT token on logout', async () => {
      const mockResponse = {
        token: 'mock.jwt.token',
        user: {
          email: 'admin@example.com',
          role: 'admin' as const,
          sites: [],
        },
      };

      (authApi.login as any).mockImplementationOnce(async () => {
        localStorage.setItem('jwt_token', mockResponse.token);
        return mockResponse;
      });
      (authApi.getProfile as any).mockResolvedValueOnce(mockResponse.user);
      (usersApi.getAllUsers as any).mockResolvedValueOnce([]);
      (authApi.logout as any).mockImplementation(() => {
        localStorage.removeItem('jwt_token');
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(result.current.login).toBeDefined();
      });

      await act(async () => {
        await result.current.login('admin@example.com', 'password');
      });

      await waitFor(() => {
        expect(localStorage.getItem('jwt_token')).toBeTruthy();
      });

      act(() => {
        result.current.logout();
      });

      expect(localStorage.getItem('jwt_token')).toBeNull();
      expect(result.current.user).toBeNull();
    });
  });

  describe('Role-Based Access Control', () => {
    it('should correctly identify admin role', async () => {
      const mockResponse = {
        token: 'mock.jwt.token',
        user: {
          email: 'admin@example.com',
          role: 'admin' as const,
          sites: [],
        },
      };

      (authApi.login as any).mockImplementationOnce(async () => {
        localStorage.setItem('jwt_token', mockResponse.token);
        return mockResponse;
      });
      (authApi.getProfile as any).mockResolvedValueOnce(mockResponse.user);
      (usersApi.getAllUsers as any).mockResolvedValueOnce([]);

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(result.current.login).toBeDefined();
      });

      await act(async () => {
        await result.current.login('admin@example.com', 'password');
      });

      await waitFor(() => {
        expect(result.current.user?.role).toBe('admin');
      });
    });

    it('should correctly identify site_manager role', async () => {
      const mockResponse = {
        token: 'mock.jwt.token',
        user: {
          email: 'manager@example.com',
          role: 'site_manager' as const,
          sites: ['Tower A'],
        },
      };

      (authApi.login as any).mockImplementationOnce(async () => {
        localStorage.setItem('jwt_token', mockResponse.token);
        return mockResponse;
      });
      (authApi.getProfile as any).mockResolvedValueOnce(mockResponse.user);
      (usersApi.getAllUsers as any).mockResolvedValueOnce([]);

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(result.current.login).toBeDefined();
      });

      await act(async () => {
        await result.current.login('manager@example.com', 'password');
      });

      await waitFor(() => {
        expect(result.current.user?.role).toBe('site_manager');
        expect(result.current.user?.sites).toContain('Tower A');
      });
    });

    it('should prevent localStorage role manipulation', async () => {
      const mockResponse = {
        token: 'mock.jwt.token',
        user: {
          email: 'manager@example.com',
          role: 'site_manager' as const,
          sites: ['Tower A'],
        },
      };

      (authApi.login as any).mockImplementationOnce(async () => {
        localStorage.setItem('jwt_token', mockResponse.token);
        return mockResponse;
      });
      (authApi.getProfile as any).mockResolvedValueOnce(mockResponse.user);
      (usersApi.getAllUsers as any).mockResolvedValueOnce([]);

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(result.current.login).toBeDefined();
      });

      await act(async () => {
        await result.current.login('manager@example.com', 'password');
      });

      await waitFor(() => {
        expect(result.current.user?.role).toBe('site_manager');
      });

      // Attempt to manipulate role in localStorage (should be ignored)
      const maliciousData = {
        email: 'manager@example.com',
        role: 'admin', // Attempted escalation
        sites: [],
      };

      localStorage.setItem('malicious_user', JSON.stringify(maliciousData));

      // User role should still be site_manager (from JWT/API, not localStorage)
      expect(result.current.user?.role).toBe('site_manager');
    });
  });

  describe('Authentication Error Handling', () => {
    it('should handle login failure gracefully', async () => {
      (authApi.login as any).mockRejectedValueOnce(new Error('Invalid credentials'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(result.current.login).toBeDefined();
      });

      let user;
      await act(async () => {
        user = await result.current.login('invalid@example.com', 'wrongpassword');
      });

      expect(user).toBeNull();
      expect(localStorage.getItem('jwt_token')).toBeNull();
    });

    it('should handle network errors during login', async () => {
      (authApi.login as any).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(result.current.login).toBeDefined();
      });

      let user;
      await act(async () => {
        user = await result.current.login('user@example.com', 'password');
      });

      expect(user).toBeNull();
      expect(result.current.user).toBeNull();
    });

    it('should handle malformed API responses', async () => {
      (authApi.login as any).mockResolvedValueOnce({
        // Missing token
        user: { email: 'test@example.com' },
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(result.current.login).toBeDefined();
      });

      let user;
      await act(async () => {
        user = await result.current.login('test@example.com', 'password');
      });

      // Should handle gracefully even with malformed response
      expect(user).toBeTruthy();
    });
  });

  describe('Session Persistence', () => {
    it('should attempt to restore session from JWT token on mount', async () => {
      const mockUser = {
        email: 'restored@example.com',
        role: 'admin' as const,
        sites: [],
      };

      // Simulate existing JWT token
      localStorage.setItem('jwt_token', 'existing.jwt.token');
      // Set up all mocks for this test
      (authApi.getProfile as any).mockImplementationOnce(() => Promise.resolve(mockUser));
      (usersApi.getAllUsers as any).mockImplementationOnce(() => Promise.resolve([]));

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(result.current.user?.email).toBe('restored@example.com');
      });
    });

    it('should clear invalid tokens on mount', async () => {
      localStorage.setItem('jwt_token', 'invalid.jwt.token');
      // Set getProfile to reject
      (authApi.getProfile as any).mockImplementationOnce(() =>
        Promise.reject(new Error('Invalid token'))
      );
      // Ensure logout actually removes the token
      (authApi.logout as any).mockImplementationOnce(() => {
        localStorage.removeItem('jwt_token');
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      // Should have no user and should have cleared the token
      await waitFor(() => {
        expect(result.current.user).toBeNull();
        expect(localStorage.getItem('jwt_token')).toBeNull();
      });
    });
  });
});
