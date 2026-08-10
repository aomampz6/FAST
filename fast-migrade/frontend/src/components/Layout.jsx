import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../shared/auth/AuthContext';

const PAGE_TITLES = [
    { path: '/troubleshoot', title: 'ตรวจสอบและแก้ไขงานเสีย' },
    { path: '/onu-setup', title: 'การตั้งค่าอุปกรณ์ FTTx (ONU)' },
    { path: '/phonebook', title: 'ข้อมูล สมุดโทรศัพท์' },
    { path: '/profile', title: 'ข้อมูลส่วนตัว' },
    { path: '/admin', title: 'ผู้ดูแลระบบ' },
];

const ROLE_LABEL = {
    admin: 'ผู้ดูแลระบบ',
    user: 'ช่างเทคนิค',
};

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
    const pageTitle = match ? match.title : 'หน้าหลัก';

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
                            <p className="subtitle">Field Assistant System</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="sidebar-toggle"
                        onClick={() => setCollapsed((prev) => !prev)}
                        aria-label={collapsed ? 'ขยายแถบเมนู' : 'ย่อแถบเมนู'}
                    >
                        {collapsed ? '›' : '‹'}
                    </button>
                </div>

                <nav className="sidebar-nav">
                    <NavLink to="/" end className="nav-item">
                        <span>หน้าหลัก</span>
                    </NavLink>
                    <NavLink to="/troubleshoot" className="nav-item">
                        <span>ตรวจสอบงานเสีย</span>
                    </NavLink>
                    <NavLink to="/onu-setup" className="nav-item">
                        <span>ตั้งค่าอุปกรณ์ ONU</span>
                    </NavLink>
                    <NavLink to="/phonebook" className="nav-item">
                        <span>สมุดโทรศัพท์</span>
                    </NavLink>
                    <NavLink to="/profile" className="nav-item">
                        <span>ข้อมูลส่วนตัว</span>
                    </NavLink>
                    {role === 'admin' && (
                        <NavLink to="/admin" className="nav-item">
                            <span>ผู้ดูแลระบบ</span>
                        </NavLink>
                    )}
                </nav>

                <div className="sidebar-footer-block">
                    <button type="button" className="nav-item logout-btn" onClick={handleLogout}>
                        <span>ออกจากระบบ</span>
                    </button>
                </div>
            </aside>

            <div className="main-content">
                <header className="top-header">
                    <h2>{pageTitle}</h2>
                    <div className="header-actions">
                        <div className="user-profile">
                            <span className="user-avatar">{role ? role[0].toUpperCase() : 'U'}</span>
                            <span>{ROLE_LABEL[role] || role}</span>
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
