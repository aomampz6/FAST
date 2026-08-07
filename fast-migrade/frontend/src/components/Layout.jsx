import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../shared/auth/AuthContext';

export default function Layout() {
    const { role, logout } = useAuth();
    const navigate = useNavigate();

    function handleLogout() {
        logout();
        navigate('/login', { replace: true });
    }

    return (
        <div className="app-shell">
            <aside className="sidebar">
                <h1 className="sidebar-title">FAST</h1>
                <nav className="sidebar-nav">
                    <NavLink to="/" end>
                        Dashboard
                    </NavLink>
                    <NavLink to="/troubleshoot">Troubleshoot</NavLink>
                    <NavLink to="/onu-setup">ONU Setup</NavLink>
                    <NavLink to="/phonebook">Phonebook</NavLink>
                    <NavLink to="/profile">Profile</NavLink>
                    {role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
                </nav>
                <button className="logout-btn" onClick={handleLogout}>
                    Logout
                </button>
            </aside>
            <main className="content">
                <Outlet />
            </main>
        </div>
    );
}
