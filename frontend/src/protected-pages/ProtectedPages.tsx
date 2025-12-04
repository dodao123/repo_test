import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/contexts/AuthContext';
import { TodoList } from './TodoList';
import './ProtectedPages.css';

export const ProtectedPages = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login', { replace: true });
        } catch (error) {
            console.error('Logout error:', error);
            navigate('/login', { replace: true });
        }
    };

    return (
        <div className="protected-container">
            <header className="app-header">
                <div className="user-welcome">
                    Welcome, <strong>{user?.name || user?.email}</strong>
                </div>
                <button onClick={handleLogout} className="logout-button-small">
                    Logout
                </button>
            </header>

            <main className="app-content">
                <TodoList />
            </main>
        </div>
    );
};
