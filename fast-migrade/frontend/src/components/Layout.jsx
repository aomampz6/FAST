import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../shared/auth/AuthContext';

const PAGE_TITLES = [
    { path: '/troubleshoot', title: 'Troubleshoot' },
    { path: '/onu-setup', title: 'ONU Setup' },
    { path: '/phonebook', title: 'Phonebook' },
    { path: '/profile', title: 'Profile' },
    { path: '/admin', title: 'Admin' },
];

export default function Layout() {
    const { role, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);

    function handleLogout() {
        logout();
        navigate('/login', { replace: true });
    }

    const match = PAGE_TITLES.find((entry) => location.pathname.startsWith(entry.path));
    const pageTitle = match ? match.title : 'Dashboard';

    return (
        <div className="app-shell">
            <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
                <div className="sidebar-header">
                    <div className="logo">
                        <div className="logo-box">
                            <span className="logo-mark">FS</span>
                        </div>
                        <div>
                            <h1 className="logo-text">FAST</h1>
                            <p className="subtitle">Field Assistant</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="sidebar-toggle"
                        onClick={() => setCollapsed((prev) => !prev)}
                        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {collapsed ? '›' : '‹'}
                    </button>
                </div>

                <nav className="sidebar-nav">
                    <NavLink to="/" end className="nav-item">
                        <span>Dashboard</span>
                    </NavLink>
                    <NavLink to="/troubleshoot" className="nav-item">
                        <span>Troubleshoot</span>
                    </NavLink>
                    <NavLink to="/onu-setup" className="nav-item">
                        <span>ONU Setup</span>
                    </NavLink>
                    <NavLink to="/phonebook" className="nav-item">
                        <span>Phonebook</span>
                    </NavLink>
                    <NavLink to="/profile" className="nav-item">
                        <span>Profile</span>
                    </NavLink>
                    {role === 'admin' && (
                        <NavLink to="/admin" className="nav-item">
                            <span>Admin</span>
                        </NavLink>
                    )}
                </nav>

                <div className="sidebar-footer-block">
                    <button type="button" className="nav-item logout-btn" onClick={handleLogout}>
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            <div className="main-content">
                <header className="top-header">
                    <h2>{pageTitle}</h2>
                    <div className="header-actions">
                        <div className="user-profile">
                            <span className="user-avatar">{role ? role[0].toUpperCase() : 'U'}</span>
                            <span>{role}</span>
                        </div>
                    </div>
                </header>
                <main className="content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
