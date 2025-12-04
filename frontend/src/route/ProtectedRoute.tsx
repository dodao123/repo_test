import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, user, accessToken } = useAuth();

  // Debug logging
  console.log('[ProtectedRoute] Render:', {
    isLoading,
    isAuthenticated,
    hasUser: !!user,
    hasAccessToken: !!accessToken,
    userSub: user?.sub || user?.email || 'none'
  });

  // Wait for auth check to complete
  if (isLoading) {
    console.log('[ProtectedRoute] Still loading, showing loading screen');
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh'
      }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.warn('[ProtectedRoute] Not authenticated, redirecting to /login', {
      user: user ? 'exists' : 'null',
      accessToken: accessToken ? 'exists' : 'null',
      isLoading
    });
    return <Navigate to="/login" replace />;
  }

  console.log('[ProtectedRoute] Authenticated, rendering protected content');
  return <>{children}</>;
};

