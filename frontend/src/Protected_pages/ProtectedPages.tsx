import { useNavigate } from 'react-router-dom';
import { useAuth } from '../Contexts/AuthContext';
import { API_URL } from '../config';
import './ProtectedPages.css';

export const ProtectedPages = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      // Redirect to login after successful logout
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
      // Still redirect even if logout fails
      navigate('/login', { replace: true });
    }
  };

  const handleTestProtectedAPI = async () => {
    try {
      const response = await fetch(`${API_URL}/api/protected`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Success! Message: ${data.message}\nUser: ${JSON.stringify(data.user, null, 2)}`);
      } else {
        alert('Failed to access protected API');
      }
    } catch (error) {
      console.error('API error:', error);
      alert('Error calling protected API');
    }
  };

  return (
    <div className="protected-container">
      <div className="protected-content">
        <h1>Protected Page</h1>
        <p>This page is only accessible to authenticated users.</p>
        
        <div className="user-info">
          <h2>User Information</h2>
          <div className="info-item">
            <strong>User ID:</strong> {user?.sub || 'N/A'}
          </div>
          <div className="info-item">
            <strong>Email:</strong> {user?.email || 'N/A'}
          </div>
          <div className="info-item">
            <strong>Name:</strong> {user?.name || 'N/A'}
          </div>
        </div>

        <div className="actions">
          <button onClick={handleTestProtectedAPI} className="test-button">
            Test Protected API
          </button>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

