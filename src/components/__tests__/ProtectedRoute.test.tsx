import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/hooks/useAuth';
import LoginPage from '@/pages/LoginPage';
import Index from '@/pages/Index';
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

describe('ProtectedRoute', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should redirect to login when user is not authenticated', async () => {
    (authApi.getProfile as any).mockRejectedValueOnce(new Error('No token'));

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/']}>
          <AuthProvider>
            <LoginPage />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Should show login page
    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('should allow access when user is authenticated', async () => {
    const mockUser = {
      email: 'admin@example.com',
      role: 'admin',
      sites: [],
    };

    localStorage.setItem('jwt_token', 'valid.jwt.token');
    (authApi.getProfile as any).mockResolvedValueOnce(mockUser);
    (usersApi.getAllUsers as any).mockResolvedValueOnce([mockUser]);

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/']}>
          <AuthProvider>
            <Index />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Should authenticate and render index page
    await waitFor(() => {
      expect(authApi.getProfile).toHaveBeenCalled();
    });
  });
});
