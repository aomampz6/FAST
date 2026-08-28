import { Link, useNavigate } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { useAuth } from '../shared/auth/AuthContext';
import { useTheme } from '../shared/hooks/useTheme';
import '../features/admin/admin.css';

export default function AdminLayout({ children }) {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [theme, toggleTheme] = useTheme();

    function handleLogout() {
        logout();
        navigate('/login', { replace: true });
    }

    return (
        <div className="admin-shell">
            <header className="admin-topbar">
                <Link to="/" className="admin-back-link">
                    ← กลับสู่หน้าหลัก
                </Link>
                <span className="admin-topbar-title">แผงควบคุมผู้ดูแลระบบ</span>
                <div className="admin-topbar-actions">
                    <button
                        type="button"
                        className="icon-btn"
                        onClick={toggleTheme}
                        aria-label={theme === 'light' ? 'สลับเป็นโหมดมืด' : 'สลับเป็นโหมดสว่าง'}
                    >
                        {theme === 'light' ? <Moon /> : <Sun />}
                    </button>
                    <button type="button" className="admin-logout-btn" onClick={handleLogout}>
                        ออกจากระบบ
                    </button>
                </div>
            </header>
            {children}
        </div>
    );
}
