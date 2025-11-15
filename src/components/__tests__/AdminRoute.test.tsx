import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });

// Test component that verifies all users can access protected routes
const ProtectedRouteTest = () => {
  const { user } = useAuth();

  if (!user) {
    return <div data-testid="not-authenticated">Not Authenticated</div>;
  }

  return <div data-testid="authenticated">Authenticated: {user.email}</div>;
};

describe('ProtectedRoute - All Users Have Equal Access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should allow admin access to protected routes', async () => {
    const mockAdmin = {
      email: 'admin@example.com',
      role: 'admin' as const,
      sites: [],
    };

    localStorage.setItem('jwt_token', 'admin.jwt.token');
    (authApi.getProfile as any).mockResolvedValueOnce(mockAdmin);
    (usersApi.getAllUsers as any).mockResolvedValueOnce([mockAdmin]);

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/sites']}>
          <AuthProvider>
            <ProtectedRouteTest />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Should render authenticated page
    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toBeInTheDocument();
      expect(screen.getByText(/admin@example.com/)).toBeInTheDocument();
    });
  });

  it('should allow consultant access to protected routes', async () => {
    const mockConsultant = {
      email: 'consultant@example.com',
      role: 'consultant' as const,
      sites: [],
    };

    localStorage.setItem('jwt_token', 'consultant.jwt.token');
    (authApi.getProfile as any).mockResolvedValueOnce(mockConsultant);
    (usersApi.getAllUsers as any).mockResolvedValueOnce([mockConsultant]);

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/sites']}>
          <AuthProvider>
            <ProtectedRouteTest />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toBeInTheDocument();
      expect(screen.getByText(/consultant@example.com/)).toBeInTheDocument();
    });
  });

  it('should allow site_manager access to protected routes', async () => {
    const mockSiteManager = {
      email: 'manager@example.com',
      role: 'site_manager' as const,
      sites: ['Tower A'],
    };

    localStorage.setItem('jwt_token', 'manager.jwt.token');
    (authApi.getProfile as any).mockResolvedValueOnce(mockSiteManager);
    (usersApi.getAllUsers as any).mockResolvedValueOnce([mockSiteManager]);

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/sites']}>
          <AuthProvider>
            <ProtectedRouteTest />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      // All users now have equal access
      expect(screen.getByTestId('authenticated')).toBeInTheDocument();
      expect(screen.getByText(/manager@example.com/)).toBeInTheDocument();
    });
  });

  it('should deny unauthenticated users access to protected routes', async () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/sites']}>
          <AuthProvider>
            <ProtectedRouteTest />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('not-authenticated')).toBeInTheDocument();
    });
  });
});
