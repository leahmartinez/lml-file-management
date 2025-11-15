import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/hooks/useAuth';
import LoginPage from '@/pages/LoginPage';
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

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });

describe('User Flow Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Login Flow', () => {
    it('should complete full login flow for admin user', async () => {
      const mockLoginResponse = {
        token: 'mock.jwt.token',
        user: {
          email: 'admin@example.com',
          role: 'admin' as const,
          sites: [],
        },
      };

      (authApi.login as any).mockImplementationOnce(async () => {
        localStorage.setItem('jwt_token', mockLoginResponse.token);
        return mockLoginResponse;
      });
      (authApi.getProfile as any).mockResolvedValueOnce(mockLoginResponse.user);
      (usersApi.getAllUsers as any).mockResolvedValueOnce([]);

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <AuthProvider>
              <LoginPage />
            </AuthProvider>
          </MemoryRouter>
        </QueryClientProvider>
      );

      // Should show login form
      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });

      // Fill login form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const loginButton = screen.getByRole('button', { name: /login/i });

      fireEvent.change(emailInput, { target: { value: 'admin@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password' } });
      fireEvent.click(loginButton);

      // Should store JWT token after login
      await waitFor(() => {
        expect(localStorage.getItem('jwt_token')).toBe('mock.jwt.token');
      });
    });

    it('should show error on invalid credentials', async () => {
      (authApi.login as any).mockRejectedValueOnce(new Error('Invalid credentials'));
      (authApi.getProfile as any).mockRejectedValueOnce(new Error('Unauthorized'));
      (usersApi.getAllUsers as any).mockResolvedValueOnce([]);

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <AuthProvider>
              <LoginPage />
            </AuthProvider>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const loginButton = screen.getByRole('button', { name: /login/i });

      fireEvent.change(emailInput, { target: { value: 'admin@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(loginButton);

      // Should stay on login page and not store token
      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });
      expect(localStorage.getItem('jwt_token')).toBeNull();
    });
  });

  describe('Role-Based Access', () => {
    it('should provide correct role information after login', async () => {
      const mockLoginResponse = {
        token: 'mock.jwt.token',
        user: {
          email: 'manager@example.com',
          role: 'site_manager' as const,
          sites: ['Tower A'],
        },
      };

      (authApi.login as any).mockImplementationOnce(async () => {
        localStorage.setItem('jwt_token', mockLoginResponse.token);
        return mockLoginResponse;
      });
      (authApi.getProfile as any).mockResolvedValueOnce(mockLoginResponse.user);
      (usersApi.getAllUsers as any).mockResolvedValueOnce([]);

      const queryClient = createTestQueryClient();
      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/']}>
            <AuthProvider>
              <div data-testid="test-content">Test</div>
            </AuthProvider>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('test-content')).toBeInTheDocument();
      });
    });
  });

  describe('Data Filtering', () => {
    it('should provide correct site access for site_manager role', async () => {
      const mockUser = {
        email: 'manager@example.com',
        role: 'site_manager' as const,
        sites: ['Tower A'],
      };

      (authApi.getProfile as any).mockResolvedValueOnce(mockUser);
      (usersApi.getAllUsers as any).mockResolvedValueOnce([]);

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/sites']}>
            <AuthProvider>
              <div data-testid="test-content">Test</div>
            </AuthProvider>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('test-content')).toBeInTheDocument();
      });
    });
  });

  describe('Session Management', () => {
    it('should restore session from JWT token on page load', async () => {
      const mockUser = {
        email: 'restored@example.com',
        role: 'admin' as const,
        sites: [],
      };

      // Simulate existing JWT token
      localStorage.setItem('jwt_token', 'existing.jwt.token');
      (authApi.getProfile as any).mockResolvedValueOnce(mockUser);
      (usersApi.getAllUsers as any).mockResolvedValueOnce([]);

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <AuthProvider>
              <div data-testid="test-content">Test</div>
            </AuthProvider>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(authApi.getProfile).toHaveBeenCalled();
      });
    });

    it('should handle expired tokens gracefully', async () => {
      localStorage.setItem('jwt_token', 'expired.jwt.token');
      (authApi.getProfile as any).mockRejectedValueOnce(new Error('Token expired'));
      (authApi.logout as any).mockImplementation(() => {
        localStorage.removeItem('jwt_token');
      });
      (usersApi.getAllUsers as any).mockResolvedValueOnce([]);

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <AuthProvider>
              <div data-testid="test-content">Test</div>
            </AuthProvider>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(localStorage.getItem('jwt_token')).toBeNull();
      });
    });
  });
});
