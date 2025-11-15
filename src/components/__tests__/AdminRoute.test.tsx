import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import AdminPage from '@/pages/AdminPage';
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

// Test component that checks access
const AdminRouteTest = () => {
  const { user } = useAuth();

  if (!user || (user.role !== 'admin' && user.role !== 'consultant')) {
    return <div data-testid="redirect">Redirected</div>;
  }

  return <AdminPage />;
};

describe('AdminRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should allow admin access to admin route', async () => {
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
        <MemoryRouter initialEntries={['/admin']}>
          <AuthProvider>
            <AdminRouteTest />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Should render admin page (not redirect)
    await waitFor(() => {
      expect(screen.queryByTestId('redirect')).not.toBeInTheDocument();
    });
  });

  it('should allow consultant access to admin route', async () => {
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
        <MemoryRouter initialEntries={['/admin']}>
          <AuthProvider>
            <AdminRouteTest />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('redirect')).not.toBeInTheDocument();
    });
  });

  it('should deny site_manager access to admin route', async () => {
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
        <MemoryRouter initialEntries={['/admin']}>
          <AuthProvider>
            <AdminRouteTest />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      // Should redirect (show redirect message)
      expect(screen.getByTestId('redirect')).toBeInTheDocument();
    });
  });
});
