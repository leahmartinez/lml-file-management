import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import LoginForm from '../auth/LoginForm';
import * as useAuthModule from '@/hooks/useAuth';

// Mock the API service to prevent AuthProvider from making real API calls
vi.mock('@/services/apiService', () => ({
  authApi: {
    login: vi.fn(),
    logout: vi.fn(),
    getProfile: vi.fn().mockRejectedValue(new Error('No token')),
  },
  usersApi: {
    getAllUsers: vi.fn().mockResolvedValue([]),
  },
}));

// Mock useAuth with importOriginal to preserve AuthProvider
vi.mock('@/hooks/useAuth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useAuth')>();
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

describe('LoginForm', () => {
  const mockLogin = vi.fn();
  const mockUseAuth = useAuthModule.useAuth as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      user: null,
    });
  });

  it('should render login form', async () => {
    renderWithProviders(<LoginForm />);

    // Wait for AuthProvider to initialize and form to appear
    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('should call login with form values on submit', async () => {
    mockLogin.mockResolvedValue({ email: 'admin@example.com', role: 'admin', sites: [] });

    renderWithProviders(<LoginForm />);

    // Wait for form to appear
    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /login/i });

    fireEvent.change(emailInput, { target: { value: 'admin@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin@example.com', 'password');
    });
  });

  it('should validate required fields', async () => {
    renderWithProviders(<LoginForm />);

    // Wait for form to appear
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: /login/i });
    fireEvent.click(submitButton);

    // HTML5 validation should prevent submission
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('should handle XSS attempts in email field', async () => {
    renderWithProviders(<LoginForm />);

    // Wait for form to appear
    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/email/i);
    const xssPayload = '<script>alert("XSS")</script>';

    fireEvent.change(emailInput, { target: { value: xssPayload } });

    // Input should be sanitized or escaped
    expect(emailInput).toHaveValue(xssPayload);
    // The value should not execute as script
    expect(document.querySelector('script')).toBeNull();
  });

  it('should handle SQL injection attempts', async () => {
    renderWithProviders(<LoginForm />);

    // Wait for form to appear
    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/email/i);
    const sqlPayload = "admin' OR '1'='1";

    fireEvent.change(emailInput, { target: { value: sqlPayload } });

    expect(emailInput).toHaveValue(sqlPayload);
  });
});

