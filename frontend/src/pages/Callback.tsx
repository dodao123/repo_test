import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config';

export const Callback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuthData } = useAuth();
  const [status, setStatus] = useState('Processing authentication...');
  const hasProcessed = useRef(false); // Prevent multiple calls

  useEffect(() => {
    // Prevent multiple executions
    if (hasProcessed.current) {
      return;
    }

    const processCallback = async () => {
      hasProcessed.current = true; // Mark as processing

      try {
        // Check for error first
        const error = searchParams.get('error');
        if (error) {
          console.error('Authentication error:', error);
          setStatus(`Authentication failed: ${error}`);
          setTimeout(() => navigate('/login', { replace: true }), 2000);
          return;
        }

        // Token is now in cookie, fetch user info from backend
        setStatus('Fetching user information...');
        try {
          const response = await fetch(`${API_URL}/auth/me`, {
            credentials: 'include', // Include cookies
          });
          
          if (response.ok) {
            const data = await response.json();
            const user = data.user;
            
            // Ensure user has at least sub
            if (!user || !user.sub) {
              throw new Error('Invalid user data');
            }

            console.log('User data fetched from backend:', user);
            setAuthData('cookie', user); // Token is in cookie
            setStatus('Authentication successful! Redirecting...');
            
            // Small delay to show success message
            setTimeout(() => {
              navigate('/protected', { replace: true });
            }, 500);
          } else {
            throw new Error('Failed to fetch user info');
          }
        } catch (fetchError) {
          console.error('Failed to fetch user info:', fetchError);
          setStatus('Authentication failed. Redirecting to login...');
          setTimeout(() => navigate('/login', { replace: true }), 2000);
        }
      } catch (error) {
        console.error('Callback processing error:', error);
        setStatus('Authentication failed. Redirecting to login...');
        setTimeout(() => navigate('/login', { replace: true }), 2000);
      }
    };

    processCallback();
  }, [searchParams, navigate, setAuthData]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      gap: '1rem'
    }}>
      <p>{status}</p>
      {status.includes('Processing') && (
        <div style={{ 
          width: '40px', 
          height: '40px', 
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #646cff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      )}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

