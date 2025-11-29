import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { API_URL } from '../config';

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
    // Check for stored auth data on mount from cookies
    const checkAuth = async () => {
      try {
        // Try to get user info from backend using cookie
        const response = await fetch(`${API_URL}/auth/me`, {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          // Token is in cookie, we don't need to store it in state
          setAccessToken('cookie'); // Placeholder to indicate token exists
        } else {
          // No valid auth, clear state
          setUser(null);
          setAccessToken(null);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setUser(null);
        setAccessToken(null);
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

