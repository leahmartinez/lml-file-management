import { useState, useEffect, createContext, useContext, useMemo, useCallback } from 'react';
import { authLog, errorLog } from '@/lib/logger';
import { authApi, usersApi, ApiUser } from '@/services/apiService';

// Mock users for local development
const MOCK_USERS: Record<string, { password: string; role: User['role']; sites: string[] }> = {
  'admin@lml.com': {
    password: 'password',
    role: 'admin',
    sites: [],
  },
  'consultant@lml.com': {
    password: 'password',
    role: 'consultant',
    sites: [],
  },
  'manager@lml.com': {
    password: 'password',
    role: 'national_manager',
    sites: [],
  },
  'site_manager_a@lml.com': {
    password: 'password',
    role: 'site_manager',
    sites: ['Melbourne Central'],
  },
  'site_manager_b@lml.com': {
    password: 'password',
    role: 'site_manager',
    sites: ['Sydney Tower'],
  },
};

/**
 * Check if we're using mock authentication (local development mode)
 */
function useMockAuth(): boolean {
  return import.meta.env.VITE_USE_MOCK_DATA === 'true';
}

// Updated User interface to match API (uses email instead of username)
export interface User {
  email: string;
  role: 'national_manager' | 'site_manager' | 'admin' | 'consultant';
  sites: string[];
  createdAt?: string;
  lastLogin?: string;
  createdBy?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<User | null>;
  logout: () => void;
  allUsers: User[];
  updateUsers: (users: User[]) => Promise<void>;
  refreshUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load current user from token on mount
  useEffect(() => {
    const loadUser = async () => {
      authLog("useAuth: Loading user from token...");

      // In mock mode, skip API calls
      if (useMockAuth()) {
        authLog("useAuth: Using mock authentication mode");
        setIsLoading(false);
        return;
      }

      // Check if token exists before making API call
      // This prevents unnecessary API calls for unauthenticated users
      const token = localStorage.getItem('jwt_token');

      if (!token) {
        authLog("useAuth: No token found, skipping profile load");
        setIsLoading(false);
        return;
      }

      try {
        // Try to get profile from API using stored token
        const profile = await authApi.getProfile();
        authLog("useAuth: Profile loaded from API:", profile);

        setUser({
          email: profile.email,
          role: profile.role,
          sites: profile.sites,
          lastLogin: profile.lastLogin,
        });

        // Load all users if admin/consultant - NON-BLOCKING on app mount
        // Fire-and-forget: fetch users in background after profile loads
        if (profile.role === 'admin' || profile.role === 'consultant') {
          refreshUsers().catch((error) => {
            errorLog("useAuth: Failed to refresh users on app mount:", error);
          });
        }
      } catch (error) {
        authLog("useAuth: No valid token or failed to load profile");
        // Clear invalid token
        authApi.logout();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  // Load all users from API or mock data
  const refreshUsers = useCallback(async () => {
    try {
      // Use mock users in local development mode
      if (useMockAuth()) {
        authLog("useAuth: Loading mock users...");
        const mockUsers: User[] = Object.entries(MOCK_USERS).map(([email, userData]) => ({
          email,
          role: userData.role,
          sites: userData.sites,
        }));
        setAllUsers(mockUsers);
        authLog("useAuth: Mock users loaded:", mockUsers.length);
        return;
      }

      // Use API for real users
      authLog("useAuth: Fetching all users from API...");
      const users = await usersApi.getAllUsers();
      authLog("useAuth: Users loaded from API:", users.length);
      setAllUsers(users);
    } catch (error: any) {
      errorLog("useAuth: Failed to fetch users:", error);
      // If unauthorized, user might not have permission
      if (error.message?.includes('401') || error.message?.includes('403')) {
        authLog("useAuth: User doesn't have permission to view users");
      }
    }
  }, []);

  const login = async (email: string, password: string): Promise<User | null> => {
    authLog("useAuth: Login attempt for email:", email);

    try {
      // Use mock authentication if enabled
      if (useMockAuth()) {
        const mockUser = MOCK_USERS[email];
        if (!mockUser || mockUser.password !== password) {
          authLog("useAuth: Mock auth failed - invalid credentials");
          return null;
        }

        authLog("useAuth: Mock login successful");
        const loggedInUser: User = {
          email,
          role: mockUser.role,
          sites: mockUser.sites,
          lastLogin: new Date().toISOString(),
        };

        setUser(loggedInUser);
        // Store mock auth in localStorage
        localStorage.setItem('jwt_token', `mock_token_${email}`);
        return loggedInUser;
      }

      // Use API for real authentication
      const response = await authApi.login(email, password);
      authLog("useAuth: Login successful");

      const loggedInUser: User = {
        email: response.user.email,
        role: response.user.role,
        sites: response.user.sites,
        lastLogin: response.user.lastLogin,
      };

      setUser(loggedInUser);

      // Load all users if admin/consultant - NON-BLOCKING to prevent login delay
      // Use fire-and-forget pattern: fetch users in background after login completes
      if (loggedInUser.role === 'admin' || loggedInUser.role === 'consultant') {
        // Don't await refreshUsers() - this prevents adding 1.5-3s delay to login
        // Instead, call it as a side effect that happens asynchronously after login
        refreshUsers().catch((error) => {
          errorLog("useAuth: Failed to refresh users after login:", error);
        });
      }

      return loggedInUser;
    } catch (error: any) {
      errorLog("useAuth: Login failed:", error);
      return null;
    }
  };

  const logout = () => {
    authLog("useAuth: Logging out user");
    authApi.logout();
    setUser(null);
    setAllUsers([]);
  };

  const updateUsers = useCallback(async (users: User[]) => {
    // This is called from admin components when users are updated
    // We should refresh from API instead of accepting local updates
    await refreshUsers();
  }, [refreshUsers]);

  const authContextValue = useMemo(() => ({
    user,
    login,
    logout,
    allUsers,
    updateUsers,
    refreshUsers,
  }), [user, allUsers, updateUsers, refreshUsers]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
