/**
 * API Service Layer
 * Handles all communication with the backend Azure Functions API
 */

// Get API base URL from runtime environment (Static Web Apps appsettings)
// Falls back to build-time environment variable if available
// In production, uses VITE_API_BASE_URL from Static Web Apps config
// In development, uses local Azure Functions dev server
function getApiBaseUrl(): string {
  // Try to get from window.__apiConfig (injected by Static Web Apps)
  if (typeof window !== 'undefined' && (window as any).__apiConfig?.apiBaseUrl) {
    return (window as any).__apiConfig.apiBaseUrl;
  }

  // Try build-time environment variable (Vite)
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  // Development: use local dev server
  if (import.meta.env.DEV) {
    return 'http://localhost:7071/api';
  }

  // Production fallback: use Static Web Apps integrated API
  return '/api';
}

const API_BASE_URL = getApiBaseUrl();

export interface ApiUser {
  email: string;
  role: 'super_admin' | 'national_manager' | 'site_manager' | 'admin' | 'consultant' | 'user' | 'subconsultant';
  sites: string[];
  createdAt?: string;
  lastLogin?: string;
  createdBy?: string;
  accountStatus?: 'pending' | 'active' | 'suspended';
  emailVerified?: boolean;
  mustChangePassword?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: ApiUser;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  role: string;
  sites: string[];
  mustChangePassword?: boolean;
}

export interface UpdateUserRequest {
  role?: string;
  sites?: string[];
  password?: string;
  mustChangePassword?: boolean;
}

/**
 * Get stored JWT token
 */
function getToken(): string | null {
  return localStorage.getItem('jwt_token');
}

/**
 * Store JWT token
 */
function setToken(token: string): void {
  localStorage.setItem('jwt_token', token);
}

/**
 * Remove JWT token
 */
function removeToken(): void {
  localStorage.removeItem('jwt_token');
}

/**
 * Make authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error(
      'API base URL is not configured. Set VITE_API_BASE_URL in Azure Static Web Apps Configuration (or provide apiBaseUrl via SWA app config).'
    );
  }
  const token = getToken();
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: HeadersInit = {
    ...options.headers,
  };

  // Only add Content-Type header if there's a request body
  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['X-LML-Token'] = token;
    if (import.meta.env.DEV) {
      console.log('🔑 Sending token for:', endpoint);
    }
  } else {
    if (import.meta.env.DEV) {
      console.warn('⚠️  No token found for:', endpoint);
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    // Try to get error details
    let errorDetails: any;
    try {
      const text = await response.text();
      errorDetails = text ? JSON.parse(text) : { error: response.statusText };
    } catch {
      errorDetails = { error: response.statusText };
    }
    
    // Log for debugging (only in dev)
    if (import.meta.env.DEV) {
      console.error('API Error:', {
        url,
        status: response.status,
        statusText: response.statusText,
        error: errorDetails,
      });
    }
    
    throw new Error(errorDetails.error || errorDetails.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Authentication API
 */
export const authApi = {
  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    // Store token
    if (response.token) {
      setToken(response.token);
    }

    return response;
  },

  /**
   * Register new user
   */
  async register(email: string, password: string): Promise<{ message: string; email: string }> {
    return apiRequest<{ message: string; email: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  /**
   * Verify email with token
   */
  async verifyEmail(email: string, token: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ email, token }),
    });
  },

  /**
   * Resend verification email
   */
  async resendVerification(email: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  /**
   * Request password reset
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  /**
   * Reset password with token
   */
  async resetPassword(email: string, token: string, newPassword: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, token, newPassword }),
    });
  },

  /**
   * Send invitation to new user (Admin only)
   */
  async sendInvitation(email: string, role: string, sites: string[]): Promise<{ message: string; email: string }> {
    return apiRequest<{ message: string; email: string }>('/auth/send-invitation', {
      method: 'POST',
      body: JSON.stringify({ email, role, sites }),
    });
  },

  /**
   * Accept invitation and set password
   */
  async acceptInvitation(email: string, token: string, password: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>('/auth/accept-invitation', {
      method: 'POST',
      body: JSON.stringify({ email, token, password }),
    });
  },

  /**
   * Logout (clear token)
   */
  logout(): void {
    removeToken();
  },

  /**
   * Get current user profile
   */
  async getProfile(): Promise<ApiUser> {
    return apiRequest<ApiUser>('/profile');
  },
};

/**
 * User Management API (Admin/Consultant only)
 */
export const usersApi = {
  /**
   * Get all users
   */
  async getAllUsers(): Promise<ApiUser[]> {
    return apiRequest<ApiUser[]>('/users');
  },

  /**
   * Create a new user
   */
  async createUser(userData: CreateUserRequest): Promise<ApiUser> {
    return apiRequest<ApiUser>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  /**
   * Update a user
   */
  async updateUser(email: string, updates: UpdateUserRequest): Promise<ApiUser> {
    return apiRequest<ApiUser>(`/users/update?email=${encodeURIComponent(email)}`, {
      method: 'PUT',
      body: JSON.stringify({ ...updates, email }), // Include email in body as well
    });
  },

  /**
   * Delete a user
   */
  async deleteUser(email: string): Promise<void> {
    await apiRequest(`/users/delete?email=${encodeURIComponent(email)}`, {
      method: 'DELETE',
      body: JSON.stringify({ email }), // Include email in body
    });
  },

  /**
   * Approve a pending user account
   */
  async approveUser(email: string): Promise<{ message: string; email: string }> {
    return apiRequest<{ message: string; email: string }>('/users/approve', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  /**
   * Suspend a user account
   */
  async suspendUser(email: string): Promise<{ message: string; email: string }> {
    return apiRequest<{ message: string; email: string }>('/users/suspend', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
};

/**
 * User Profiles API - Get and update user profile information
 */
export const profileApi = {
  /**
   * Get current user's profile
   */
  async getMyProfile(): Promise<any> {
    return apiRequest<any>('/user/profile', {
      method: 'GET',
    });
  },

  /**
   * Update current user's profile
   */
  async updateMyProfile(updates: any): Promise<any> {
    return apiRequest<any>('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  /**
   * Get a user's profile by email
   */
  async getUserProfile(email: string): Promise<any> {
    return apiRequest<any>(`/profiles/${encodeURIComponent(email)}`, {
      method: 'GET',
    });
  },

  /**
   * Update another user's profile (super_admin only)
   */
  async updateUserProfile(email: string, updates: any): Promise<any> {
    return apiRequest<any>(`/profiles/${encodeURIComponent(email)}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },
};

/**
 * Contacts API - Get and manage contacts (users + external)
 */
export const contactsApi = {
  /**
   * Get all contacts (combined users and external contacts)
   * Filtered by user's site access if not admin
   */
  async getContacts(): Promise<any[]> {
    return apiRequest<any[]>('/contacts', {
      method: 'GET',
    });
  },

  /**
   * Get a specific contact
   */
  async getContact(id: string): Promise<any> {
    return apiRequest<any>(`/contacts?id=${encodeURIComponent(id)}`, {
      method: 'GET',
    });
  },

  /**
   * Add external contact (admin/consultant only)
   */
  async createContact(contact: any): Promise<any> {
    return apiRequest<any>('/contacts', {
      method: 'POST',
      body: JSON.stringify(contact),
    });
  },

  /**
   * Update external contact (admin/consultant only)
   */
  async updateContact(id: string, updates: any): Promise<any> {
    return apiRequest<any>(`/contacts?id=${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  /**
   * Delete external contact (admin/consultant only)
   */
  async deleteContact(id: string): Promise<void> {
    await apiRequest<void>(`/contacts?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });
  },
};

/**
 * Business API - Manage businesses
 */
export const businessesApi = {
  async getAll(): Promise<any[]> {
    return apiRequest<any[]>('/businesses', { method: 'GET' });
  },

  async create(business: any): Promise<any> {
    return apiRequest<any>('/businesses', {
      method: 'POST',
      body: JSON.stringify(business),
    });
  },

  async update(id: string, updates: any): Promise<any> {
    return apiRequest<any>(`/businesses?id=${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ ...updates, id }),
    });
  },

  async delete(id: string): Promise<void> {
    await apiRequest<void>(`/businesses?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
};

/**
 * Sites API - Manage sites
 */
export const sitesApi = {
  async create(site: any): Promise<any> {
    return apiRequest<any>('/sites', {
      method: 'POST',
      body: JSON.stringify(site),
    });
  },

  async update(site: any): Promise<any> {
    return apiRequest<any>('/sites', {
      method: 'PUT',
      body: JSON.stringify(site),
    });
  },

  async delete(siteId: string): Promise<void> {
    await apiRequest<void>('/sites/delete', {
      method: 'DELETE',
      body: JSON.stringify({ siteId }),
    });
  },
};

/**
 * Projects API - Manage projects and stages
 */
export const projectsApi = {
  async create(project: any): Promise<any> {
    return apiRequest<any>('/projects', {
      method: 'POST',
      body: JSON.stringify(project),
    });
  },

  async update(project: any): Promise<any> {
    return apiRequest<any>('/projects', {
      method: 'PUT',
      body: JSON.stringify(project),
    });
  },

  async delete(projectCode: string): Promise<void> {
    await apiRequest<void>('/projects/delete', {
      method: 'DELETE',
      body: JSON.stringify({ projectCode }),
    });
  },

  async rename(projectCode: string, newProjectCode: string): Promise<any> {
    return apiRequest<any>('/projects/rename', {
      method: 'PUT',
      body: JSON.stringify({ projectCode, newProjectCode }),
    });
  },
};

/**
 * Initialize database (for setup)
 */
export const initApi = {
  async initialize(): Promise<{ message: string }> {
    return apiRequest<{ message: string }>('/initialize', {
      method: 'GET',
    });
  },
};

