import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './LoginComponent.css';

export const LoginComponent = () => {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await login();
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
    }
  };

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

