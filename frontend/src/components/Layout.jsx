import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    LogOut,
    Menu,
    Moon,
    Phone,
    Router as RouterIcon,
    Settings,
    Sun,
    User,
    Wrench,
    X,
    Zap,
} from 'lucide-react';
import { useAuth } from '../shared/auth/AuthContext';

function useTheme() {
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    return [theme, () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))];
}

const PAGE_TITLES = [
    { path: '/troubleshoot', title: 'ตรวจสอบและแก้ไขงานเสีย' },
    { path: '/onu-setup', title: 'การตั้งค่าอุปกรณ์ FTTx (ONU)' },
    { path: '/ata-setup', title: 'การตั้งค่าอุปกรณ์ ATA' },
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
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [theme, toggleTheme] = useTheme();

    // Closing on every route change covers both a nav-link tap and the
    // browser back/forward buttons, so the drawer never stays stuck open
    // over the new page on mobile.
    useEffect(() => {
        setMobileNavOpen(false);
    }, [location.pathname]);

    function handleLogout() {
        logout();
        navigate('/login', { replace: true });
    }

    const match = PAGE_TITLES.find((entry) => location.pathname.startsWith(entry.path));
    const pageTitle = match ? match.title : 'หน้าหลัก';

    return (
        <div className="app-shell">
            <div
                className={`mobile-nav-overlay${mobileNavOpen ? ' active' : ''}`}
                onClick={() => setMobileNavOpen(false)}
            />

            <aside className={`sidebar${collapsed ? ' collapsed' : ''}${mobileNavOpen ? ' mobile-open' : ''}`}>
                <div className="sidebar-header">
                    <div className="logo">
                        <div className="logo-box">
                            <Zap className="logo-mark" style={{ width: 24, height: 24 }} />
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
                    <button
                        type="button"
                        className="mobile-nav-close"
                        onClick={() => setMobileNavOpen(false)}
                        aria-label="ปิดเมนู"
                    >
                        <X size={20} />
                    </button>
                </div>

                <nav className="sidebar-nav">
                    <NavLink to="/" end className="nav-item" data-label="หน้าหลัก">
                        <span className="nav-icon"><LayoutDashboard size={22} /></span>
                        <span>หน้าหลัก</span>
                    </NavLink>
                    <NavLink to="/troubleshoot" className="nav-item" data-label="ตรวจสอบงานเสีย">
                        <span className="nav-icon"><Wrench size={22} /></span>
                        <span>ตรวจสอบงานเสีย</span>
                    </NavLink>
                    <NavLink to="/onu-setup" className="nav-item" data-label="ตั้งค่าอุปกรณ์ ONU">
                        <span className="nav-icon"><RouterIcon size={22} /></span>
                        <span>ตั้งค่าอุปกรณ์ ONU</span>
                    </NavLink>
                    <NavLink to="/phonebook" className="nav-item" data-label="สมุดโทรศัพท์">
                        <span className="nav-icon"><Phone size={22} /></span>
                        <span>สมุดโทรศัพท์</span>
                    </NavLink>
                    <NavLink to="/profile" className="nav-item" data-label="ข้อมูลส่วนตัว">
                        <span className="nav-icon"><User size={22} /></span>
                        <span>ข้อมูลส่วนตัว</span>
                    </NavLink>
                    {role === 'admin' && (
                        <NavLink to="/admin" className="nav-item" data-label="ผู้ดูแลระบบ">
                            <span className="nav-icon"><Settings size={22} /></span>
                            <span>ผู้ดูแลระบบ</span>
                        </NavLink>
                    )}
                </nav>

                <div className="sidebar-footer-block">
                    <button
                        type="button"
                        className="nav-item logout-btn"
                        onClick={handleLogout}
                        data-label="ออกจากระบบ"
                    >
                        <span className="nav-icon"><LogOut size={22} /></span>
                        <span>ออกจากระบบ</span>
                    </button>
                </div>
            </aside>

            <div className="main-content">
                <header className="top-header">
                    <button
                        type="button"
                        className="mobile-nav-toggle"
                        onClick={() => setMobileNavOpen(true)}
                        aria-label="เปิดเมนู"
                    >
                        <Menu size={22} />
                    </button>
                    <h2>{pageTitle}</h2>
                    <div className="header-actions">
                        <button
                            type="button"
                            className="icon-btn"
                            onClick={toggleTheme}
                            aria-label={theme === 'light' ? 'สลับเป็นโหมดมืด' : 'สลับเป็นโหมดสว่าง'}
                        >
                            {theme === 'light' ? <Moon /> : <Sun />}
                        </button>
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
