import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { API_URL } from '../../config';

interface User {
  sub: string;
  email?: string;
  name?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  setAuthData: (token: string, userData: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('[AuthContext] useEffect triggered - checking auth');
    console.log('[AuthContext] Current URL:', window.location.href);

    // Check for stored auth data on mount from cookies
    const checkAuth = async () => {
      console.log('[AuthContext] checkAuth started');

      // First, try to load from localStorage immediately (synchronous)
      // This ensures user is set before any component renders
      const cachedUser = localStorage.getItem('user');
      console.log('[AuthContext] Cached user in localStorage:', cachedUser ? 'EXISTS' : 'NONE');

      if (cachedUser) {
        try {
          const parsedUser = JSON.parse(cachedUser);
          console.log('[AuthContext] Loading user from localStorage:', parsedUser.sub || parsedUser.email);
          setUser(parsedUser);
          setAccessToken('cookie');
          // Set loading to false immediately if we have cached data
          // This prevents redirect loop while API call is in progress
          setIsLoading(false);
        } catch (e) {
          console.error('[AuthContext] Failed to parse cached user:', e);
          // Invalid cache, continue to fetch
        }
      }

      // Then verify with backend (async, non-blocking)
      try {
        console.log('[AuthContext] Fetching /auth/me from:', API_URL);
        const response = await fetch(`${API_URL}/auth/me`, {
          credentials: 'include',
          cache: 'no-cache', // Prevent 304 for auth check
        });
        console.log('[AuthContext] /auth/me response status:', response.status);

        if (response.ok) {
          // Handle 304 Not Modified - user data already set from localStorage above
          if (response.status === 304) {
            console.log('[AuthContext] 304 Not Modified, using cached user data');
            // User data should already be set from localStorage above
          } else {
            // Normal response, parse JSON
            const data = await response.json();
            if (data.user) {
              console.log('[AuthContext] User loaded from API:', data.user.sub || data.user.email);
              setUser(data.user);
              setAccessToken('cookie');
              // Update localStorage cache
              localStorage.setItem('user', JSON.stringify(data.user));
            }
          }
        } else if (response.status === 401 || response.status === 403) {
          // Unauthorized - clear auth
          console.warn('[AuthContext] Unauthorized (401/403), clearing auth');
          setUser(null);
          setAccessToken(null);
          localStorage.removeItem('user');
        } else {
          // Other errors - keep cached data if available (already set above)
          console.warn('[AuthContext] Auth check returned status:', response.status, '- keeping cached data if available');
          // Don't clear user/accessToken if we have cached data
        }
      } catch (error) {
        console.error('[AuthContext] Auth check failed:', error);
        // On error, keep cached data if available (already set above)
        // Don't clear user/accessToken - let cached data persist
        if (!cachedUser) {
          // Only clear if no cache available
          console.warn('[AuthContext] No cached data, clearing auth');
          setUser(null);
          setAccessToken(null);
        } else {
          console.log('[AuthContext] Keeping cached user data after error');
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        credentials: 'include',
      });
      const data = await response.json();

      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const logout = async () => {
    try {
      // Call backend to clear httpOnly cookie
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    // Clear localStorage
    localStorage.removeItem('user');
    setUser(null);
    setAccessToken(null);
  };

  const setAuthData = (_token: string, userData: User) => {
    // Token is stored in cookie by backend, we just need to store user data
    // Parameter _token is kept for interface compatibility but not used
    setAccessToken('cookie'); // Placeholder to indicate token exists
    setUser(userData);
    // Store user data in localStorage for quick access (optional, can be removed)
    localStorage.setItem('user', JSON.stringify(userData));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: !!user && !!accessToken && !isLoading,
        isLoading,
        login,
        logout,
        setAuthData,
      }}
    >
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

