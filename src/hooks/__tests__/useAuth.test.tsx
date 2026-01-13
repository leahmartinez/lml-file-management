import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../useAuth';
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

describe('useAuth', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
    // Set default mock implementations
    (authApi.logout as any).mockImplementation(() => {
      localStorage.removeItem('jwt_token');
    });
    (authApi.login as any).mockRejectedValue(new Error('Login not mocked'));
    (authApi.getProfile as any).mockRejectedValue(new Error('No token'));
    (usersApi.getAllUsers as any).mockRejectedValue(new Error('Users not mocked'));
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('login', () => {
    it('should successfully login with correct credentials', async () => {
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

      let user;
      await act(async () => {
        user = await result.current.login('admin@example.com', 'password');
      });

      expect(user).toBeDefined();
      expect(user?.email).toBe('admin@example.com');
      expect(user?.role).toBe('admin');
      expect(result.current.user).toBeDefined();
      expect(localStorage.getItem('jwt_token')).toBe('mock.jwt.token');
    });

    it('should reject login with incorrect credentials', async () => {
      (authApi.login as any).mockRejectedValueOnce(new Error('Invalid credentials'));
      (usersApi.getAllUsers as any).mockResolvedValueOnce([]);

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(result.current.login).toBeDefined();
      });

      let user;
      await act(async () => {
        user = await result.current.login('admin@example.com', 'wrongpassword');
      });

      expect(user).toBeNull();
      expect(result.current.user).toBeNull();
      expect(localStorage.getItem('jwt_token')).toBeNull();
    });

    it('should reject login with non-existent email', async () => {
      (authApi.login as any).mockRejectedValueOnce(new Error('User not found'));
      (usersApi.getAllUsers as any).mockResolvedValueOnce([]);

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(result.current.login).toBeDefined();
      });

      let user;
      await act(async () => {
        user = await result.current.login('nonexistent@example.com', 'password');
      });

      expect(user).toBeNull();
      expect(result.current.user).toBeNull();
    });

    it('should handle API errors gracefully', async () => {
      (authApi.login as any).mockRejectedValueOnce(new Error('Network error'));
      (usersApi.getAllUsers as any).mockResolvedValueOnce([]);

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(result.current.login).toBeDefined();
      });

      let user;
      await act(async () => {
        user = await result.current.login('admin@example.com', 'password');
      });

      expect(user).toBeNull();
      expect(result.current.user).toBeNull();
    });
  });

  describe('logout', () => {
    it('should clear user and token on logout', async () => {
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

      expect(result.current.user).toBeDefined();
      expect(localStorage.getItem('jwt_token')).toBeTruthy();

      act(() => {
        result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(localStorage.getItem('jwt_token')).toBeNull();
    });
  });

  describe('session restoration', () => {
    it('should restore user from JWT token on mount', async () => {
      const mockUser = {
        email: 'restored@example.com',
        role: 'admin' as const,
        sites: [],
      };

      localStorage.setItem('jwt_token', 'existing.jwt.token');
      (authApi.getProfile as any).mockResolvedValueOnce(mockUser);
      (usersApi.getAllUsers as any).mockResolvedValueOnce([mockUser]);

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(result.current.user?.email).toBe('restored@example.com');
      });
    });

    it('should clear invalid token on mount', async () => {
      localStorage.setItem('jwt_token', 'invalid.jwt.token');
      (authApi.getProfile as any).mockRejectedValueOnce(new Error('Invalid token'));
      (usersApi.getAllUsers as any).mockResolvedValueOnce([]);

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(result.current.user).toBeNull();
      });

      expect(localStorage.getItem('jwt_token')).toBeNull();
    });

    it('should handle missing token gracefully', async () => {
      (authApi.getProfile as any).mockRejectedValueOnce(new Error('No token'));
      (usersApi.getAllUsers as any).mockResolvedValueOnce([]);

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(result.current.user).toBeNull();
      });
    });
  });

  describe('role-based access', () => {
    it('should correctly set admin role', async () => {
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

      expect(result.current.user?.role).toBe('admin');
    });

    it('should correctly set site_manager role with sites', async () => {
      const mockResponse = {
        token: 'mock.jwt.token',
        user: {
          email: 'manager@example.com',
          role: 'site_manager' as const,
          sites: ['Tower A', 'Tower B'],
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

      expect(result.current.user?.role).toBe('site_manager');
      expect(result.current.user?.sites).toEqual(['Tower A', 'Tower B']);
    });
  });

  describe('user management (admin only)', () => {
    it('should load all users for admin role', async () => {
      const mockUser = {
        email: 'admin@example.com',
        role: 'admin' as const,
        sites: [],
      };

      const mockAllUsers = [
        mockUser,
        {
          email: 'manager@example.com',
          role: 'site_manager' as const,
          sites: ['Tower A'],
        },
      ];

      localStorage.setItem('jwt_token', 'admin.jwt.token');
      (authApi.getProfile as any).mockResolvedValueOnce(mockUser);
      // Reset and set new mock implementation to return the users list
      (usersApi.getAllUsers as any).mockReset().mockImplementation(async () => mockAllUsers);

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(result.current.user).toBeDefined();
      });

      await waitFor(() => {
        expect(result.current.allUsers.length).toBe(2);
      }, { timeout: 3000 });
    });

    it('should handle getAllUsers errors gracefully', async () => {
      const mockUser = {
        email: 'admin@example.com',
        role: 'admin' as const,
        sites: [],
      };

      localStorage.setItem('jwt_token', 'admin.jwt.token');
      (authApi.getProfile as any).mockResolvedValueOnce(mockUser);
      (usersApi.getAllUsers as any).mockRejectedValueOnce(new Error('Failed to load users'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(result.current.user).toBeDefined();
      });

      // Should still have user even if allUsers fails to load
      expect(result.current.allUsers).toEqual([]);
    });
  });

  describe('refreshUsers', () => {
    it('should reload all users when refreshUsers is called', async () => {
      const mockUser = {
        email: 'admin@example.com',
        role: 'admin' as const,
        sites: [],
      };

      const initialUsers = [mockUser];
      const updatedUsers = [
        mockUser,
        {
          email: 'newuser@example.com',
          role: 'site_manager' as const,
          sites: ['Tower C'],
        },
      ];

      localStorage.setItem('jwt_token', 'admin.jwt.token');
      (authApi.getProfile as any).mockResolvedValueOnce(mockUser);
      // Reset default mock and set new mock to return different values on successive calls
      (usersApi.getAllUsers as any)
        .mockReset()
        .mockImplementationOnce(async () => initialUsers)
        .mockImplementationOnce(async () => updatedUsers);

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(result.current.user).toBeDefined();
      });

      await waitFor(() => {
        expect(result.current.allUsers.length).toBe(1);
      }, { timeout: 3000 });

      await act(async () => {
        await result.current.refreshUsers();
      });

      await waitFor(() => {
        expect(result.current.allUsers.length).toBe(2);
      });
    });
  });
});
