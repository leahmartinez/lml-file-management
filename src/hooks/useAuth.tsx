import { useState, useEffect, createContext, useContext, useMemo, useCallback } from 'react';
import { authLog, errorLog } from '@/lib/logger';
import { authApi, usersApi, ApiUser } from '@/services/apiService';
import { initializeAllMockData, isMockDataInitialized } from '@/utils/mockFullDataGenerator';

// Mock users for local development
const MOCK_USERS: Record<string, { password: string; role: User['role']; sites: string[] }> = {
  'leah@lmllift.com': {
    password: 'password',
    role: 'admin',
    sites: [],
  },
  'user@lmllift.com': {
    password: 'password',
    role: 'user',
    sites: [],
  },
};

/**
 * Check if we're using mock authentication (local development mode)
 * Separate from VITE_USE_MOCK_DATA to allow mock auth with real CSV data
 */
function useMockAuth(): boolean {
  if (import.meta.env.PROD) {
    return false;
  }
  return import.meta.env.VITE_USE_MOCK_AUTH === 'true';
}

// Updated User interface to match API (uses email instead of username)
export interface User {
  email: string;
  role: 'admin' | 'user' | 'subconsultant' | 'site_manager' | 'consultant' | 'national_manager';
  sites: string[];
  createdAt?: string;
  lastLogin?: string;
  createdBy?: string;
  password?: string;
  mustChangePassword?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<User | null>;
  logout: () => void;
  allUsers: User[];
  updateUsers: (users: User[]) => Promise<void>;
  refreshUsers: () => Promise<void>;
  updateUserPassword: (email: string, newPassword: string, options?: { mustChangePassword?: boolean }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const clearAuthState = useCallback(() => {
    setUser(null);
    setAllUsers([]);
    localStorage.removeItem('current_user');
    localStorage.removeItem('jwt_token');
  }, []);

  const getMockUsers = useCallback((): User[] => {
    try {
      const stored = localStorage.getItem('mockUsers');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (error) {
      errorLog("useAuth: Failed to parse mockUsers from localStorage", error);
    }

    return Object.entries(MOCK_USERS).map(([email, userData]) => ({
      email,
      role: userData.role,
      sites: userData.sites,
      password: userData.password,
      mustChangePassword: false,
    }));
  }, []);

  const persistMockUsers = useCallback((users: User[]) => {
    localStorage.setItem('mockUsers', JSON.stringify(users));
  }, []);

  // Load current user from token on mount
  useEffect(() => {
    const loadUser = async () => {
      authLog("useAuth: Loading user from token...");

      // In mock mode, restore user from localStorage
      if (useMockAuth()) {
        authLog("useAuth: Using mock authentication mode");
        // Initialize complete mock data pipeline (sites, contacts, projects, proposals)
        // Only initialize on first load - don't overwrite existing data and deletions
        if (!isMockDataInitialized()) {
          authLog("useAuth: First app load - initializing mock data");
          initializeAllMockData();
        } else {
          authLog("useAuth: Mock data already initialized, skipping initialization");
        }

        const storedUser = localStorage.getItem('current_user');
        if (storedUser) {
          try {
            const user = JSON.parse(storedUser);
            authLog("useAuth: Restored user from localStorage:", user);
            setUser(user);
            // Load users list for admin
            if (user.role === 'admin') {
              refreshUsers().catch((error) => {
                errorLog("useAuth: Failed to refresh users on app mount:", error);
              });
            }
          } catch (error) {
            authLog("useAuth: Failed to parse stored user");
            clearAuthState();
          }
        }
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

        // Load all users if admin - NON-BLOCKING on app mount
        // Fire-and-forget: fetch users in background after profile loads
        if (profile.role === 'admin') {
          refreshUsers().catch((error) => {
            errorLog("useAuth: Failed to refresh users on app mount:", error);
          });
        }
      } catch (error) {
        authLog("useAuth: No valid token or failed to load profile");
        // Clear invalid token
        authApi.logout();
        clearAuthState();
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, [clearAuthState, refreshUsers]);

  // Load all users from API or mock data
  const refreshUsers = useCallback(async () => {
    try {
      // Use mock users in local development mode
      if (useMockAuth()) {
        authLog("useAuth: Loading mock users...");
        const mockUsers = getMockUsers();

        if (!localStorage.getItem('mockUsers')) {
          persistMockUsers(mockUsers);
        }

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
      setAllUsers([]);
      // If unauthorized, user might not have permission
      if (error.message?.includes('401') || error.message?.includes('403')) {
        authLog("useAuth: User doesn't have permission to view users");
      }
    }
  }, [getMockUsers, persistMockUsers]);

  const updateUserPassword = useCallback(async (email: string, newPassword: string, options?: { mustChangePassword?: boolean }) => {
    if (!useMockAuth()) return;

    const mockUsers = getMockUsers();
    const updatedUsers = mockUsers.map((u) =>
      u.email.toLowerCase() === email.toLowerCase()
        ? { ...u, password: newPassword, mustChangePassword: options?.mustChangePassword ?? false }
        : u
    );

    persistMockUsers(updatedUsers);
    setAllUsers(updatedUsers);

    if (user?.email.toLowerCase() === email.toLowerCase()) {
      const updatedUser = updatedUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (updatedUser) {
        setUser(updatedUser);
        localStorage.setItem('current_user', JSON.stringify(updatedUser));
      }
    }
  }, [getMockUsers, persistMockUsers, user?.email]);

  const login = async (email: string, password: string): Promise<User | null> => {
    authLog("useAuth: Login attempt for email:", email);

    try {
      // Use mock authentication if enabled
      if (useMockAuth()) {
        // Try exact match first, then case-insensitive lookup
        const mockUsers = getMockUsers();
        let mockUser = mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());

        if (!mockUser) {
          authLog("useAuth: Mock auth failed - user not found");
          clearAuthState();
          return null;
        }

        if (mockUser.password && mockUser.password !== password) {
          authLog("useAuth: Mock auth failed - wrong password for known user");
          clearAuthState();
          return null;
        }

        authLog("useAuth: Mock login successful");
        const loggedInUser: User = {
          email,
          role: mockUser.role || 'user',
          sites: mockUser.sites || [],
          lastLogin: new Date().toISOString(),
          mustChangePassword: !!mockUser.mustChangePassword,
        };

        setUser(loggedInUser);
        // Store mock auth in localStorage
        localStorage.setItem('jwt_token', `mock_token_${email}`);
        localStorage.setItem('current_user', JSON.stringify(loggedInUser));

        // Immediately refresh users list to include current user
        setTimeout(() => {
          refreshUsers().catch(err => console.error('Failed to refresh users after login:', err));
        }, 100);

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

      // Load all users if admin - NON-BLOCKING to prevent login delay
      // Use fire-and-forget pattern: fetch users in background after login completes
      if (loggedInUser.role === 'admin') {
        // Don't await refreshUsers() - this prevents adding 1.5-3s delay to login
        // Instead, call it as a side effect that happens asynchronously after login
        refreshUsers().catch((error) => {
          errorLog("useAuth: Failed to refresh users after login:", error);
        });
      }

      return loggedInUser;
    } catch (error: any) {
      errorLog("useAuth: Login failed:", error);
      clearAuthState();
      return null;
    }
  };

  const logout = () => {
    authLog("useAuth: Logging out user");
    authApi.logout();
    setUser(null);
    setAllUsers([]);
    // Clear stored user from localStorage
    localStorage.removeItem('current_user');
    localStorage.removeItem('jwt_token');
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
    updateUserPassword,
  }), [user, allUsers, updateUsers, refreshUsers, updateUserPassword]);

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
