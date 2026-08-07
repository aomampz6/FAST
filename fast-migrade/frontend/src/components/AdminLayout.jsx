import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../shared/auth/AuthContext';
import '../features/admin/admin.css';

export default function AdminLayout({ children }) {
    const { logout } = useAuth();
    const navigate = useNavigate();

    function handleLogout() {
        logout();
        navigate('/login', { replace: true });
    }

    return (
        <div className="admin-shell">
            <header className="admin-topbar">
                <Link to="/" className="admin-back-link">
                    ← Back to App
                </Link>
                <span className="admin-topbar-title">Admin Panel</span>
                <button type="button" className="admin-logout-btn" onClick={handleLogout}>
                    Logout
                </button>
            </header>
            {children}
        </div>
    );
}
