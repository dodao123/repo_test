import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './route_protect/ProtectedRoute';
import { LoginComponent } from './login_component/LoginComponent';
import { ProtectedPages } from './protected_pages/ProtectedPages';
import { Callback } from './utils/Callback';
import './App.css';

function Home() {
  const { isAuthenticated, user, isLoading } = useAuth();
  
  console.log('[Home] Rendered - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading, 'user:', user?.sub || 'none');
  
  return (
    <>
      <div>
        <h1>Welcome to the App</h1>
        <p>This is the home page.</p>
        {!isAuthenticated && (
          <p>
            <a href="/login" rel="noopener noreferrer">Please login to access protected content</a>
          </p>
        )}
        {isAuthenticated && (
          <p>
            <a href="/protected" rel="noopener noreferrer">Go to protected page</a>
          </p>
        )}
      </div>
    </>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<LoginComponent />} />
      <Route path="/callback" element={<Callback />} />
      <Route
        path="/protected"
        element={
          <ProtectedRoute>
            <ProtectedPages />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
