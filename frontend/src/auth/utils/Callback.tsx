import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../../config';

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
            cache: 'no-store', // Prevent caching
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
            },
          });
          
          // Handle both 200 OK and 304 Not Modified
          if (response.ok || response.status === 304) {
            let data;
            try {
              data = await response.json();
            } catch (jsonError) {
              // If 304 and no body, try to get from localStorage or retry
              const cachedUser = localStorage.getItem('user');
              if (cachedUser) {
                try {
                  const parsedUser = JSON.parse(cachedUser);
                  if (parsedUser && parsedUser.sub) {
                    console.log('Using cached user data:', parsedUser);
                    setAuthData('cookie', parsedUser);
                    setStatus('Authentication successful! Redirecting...');
                    setTimeout(() => {
                      navigate('/protected', { replace: true });
                    }, 500);
                    return;
                  }
                } catch (parseError) {
                  console.warn('Failed to parse cached user:', parseError);
                }
              }
              
              // Retry with no-cache headers
              console.warn('304 response with no body, retrying...');
              const retryResponse = await fetch(`${API_URL}/auth/me`, {
                credentials: 'include',
                cache: 'no-store',
                headers: {
                  'Cache-Control': 'no-cache',
                  'Pragma': 'no-cache',
                },
              });
              if (!retryResponse.ok && retryResponse.status !== 304) {
                throw new Error('Failed to fetch user info after retry');
              }
              data = await retryResponse.json();
            }
            
            const user = data?.user;
            
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
            throw new Error(`Failed to fetch user info: ${response.status}`);
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

