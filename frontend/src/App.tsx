import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginComponent } from './LoginComponent/LoginComponent';
import { ProtectedPages } from './Protected_pages/ProtectedPages';
import { Callback } from './pages/Callback';
import './App.css';

function Home() {
  const { isAuthenticated } = useAuth();
  
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
      <Route path="/auth/callback" element={<Callback />} />
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
