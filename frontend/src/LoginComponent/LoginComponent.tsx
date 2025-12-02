import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../Contexts/AuthContext';
import './LoginComponent.css';

export const LoginComponent = () => {
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Check if already authenticated - redirect to protected
  useEffect(() => {
    const error = searchParams.get('error');
    console.log('[LoginComponent] isAuthenticated:', isAuthenticated, 'authLoading:', authLoading, 'error:', error);
    
    // If already authenticated, redirect to protected regardless of error param
    if (!authLoading && isAuthenticated) {
      console.log('[LoginComponent] Already authenticated, redirecting to /protected');
      navigate('/protected', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, searchParams]);

  const handleLogin = async () => {
    // If already authenticated, redirect to protected instead of starting login flow
    if (isAuthenticated) {
      console.log('[LoginComponent] Already authenticated, navigating to /protected');
      navigate('/protected', { replace: true });
      return;
    }

    setIsLoading(true);
    try {
      await login();
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="login-container">
        <div className="login-card">
          <p>Đang kiểm tra đăng nhập...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Đăng nhập</h1>
          <p>Đăng nhập bằng tài khoản MindX của bạn</p>
        </div>

        <div className="login-content">
          <button 
            onClick={handleLogin}
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? 'Đang chuyển hướng...' : 'Đăng nhập với MindX'}
          </button>

          <p className="login-hint">
            Bạn sẽ được chuyển đến trang đăng nhập MindX để xác thực
          </p>
        </div>
      </div>
    </div>
  );
};

