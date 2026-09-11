import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
    ChevronDown,
    LayoutDashboard,
    LogOut,
    Menu,
    Moon,
    Phone,
    Router as RouterIcon,
    Settings,
    Sun,
    User,
    Wifi,
    Wrench,
    X,
    Zap,
} from 'lucide-react';
import { useAuth } from '../shared/auth/AuthContext';
import { toTitleCase } from '../shared/format/names';
import { RoleGate } from '../shared/auth/access';
import { useTheme } from '../shared/hooks/useTheme';

const PAGE_TITLES = [
    { path: '/troubleshoot', title: 'ตรวจสอบและแก้ไขงานเสีย' },
    { path: '/onu-setup', title: 'การตั้งค่าอุปกรณ์ FTTx (ONU)' },
    { path: '/ata-setup', title: 'การตั้งค่าอุปกรณ์ ATA' },
    { path: '/ap-setup', title: 'การตั้งค่าอุปกรณ์ Access Point' },
    { path: '/phonebook', title: 'ข้อมูล สมุดโทรศัพท์' },
    { path: '/profile', title: 'ข้อมูลส่วนตัว' },
    { path: '/admin', title: 'ผู้ดูแลระบบ' },
];

// Sub-routes grouped under the "การตั้งค่าอุปกรณ์" sidebar entry.
const DEVICE_SETUP_LINKS = [
    { path: '/onu-setup', label: 'ONU', Icon: RouterIcon },
    { path: '/ata-setup', label: 'ATA', Icon: Phone },
    { path: '/ap-setup', label: 'Access Point', Icon: Wifi },
];

const ROLE_LABEL = {
    admin: 'ผู้ดูแลระบบ',
    user: 'ช่างเทคนิค',
};

export default function Layout() {
    const { role, logout, fullName } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [theme, toggleTheme] = useTheme();

    const isDeviceSetupRoute = DEVICE_SETUP_LINKS.some((link) => location.pathname.startsWith(link.path));
    const [deviceMenuOpen, setDeviceMenuOpen] = useState(isDeviceSetupRoute);

    // Closing on every route change covers both a nav-link tap and the
    // browser back/forward buttons, so the drawer never stays stuck open
    // over the new page on mobile.
    useEffect(() => {
        setMobileNavOpen(false);
    }, [location.pathname]);

    // A deep link straight into one of the device setup pages should land
    // with the submenu already open, not collapsed around the active link.
    useEffect(() => {
        if (isDeviceSetupRoute) setDeviceMenuOpen(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDeviceSetupRoute]);

    function handleLogout() {
        logout();
        navigate('/login', { replace: true });
    }

    // Collapsed sidebar has no room to show a submenu inline, so opening it
    // also expands the sidebar back out.
    function toggleDeviceMenu() {
        if (collapsed) setCollapsed(false);
        setDeviceMenuOpen((prev) => !prev);
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
                    <div className="nav-group">
                        <button
                            type="button"
                            className={`nav-item nav-group-toggle${deviceMenuOpen ? ' expanded' : ''}${isDeviceSetupRoute ? ' active' : ''}`}
                            onClick={toggleDeviceMenu}
                            aria-expanded={deviceMenuOpen}
                            data-label="การตั้งค่าอุปกรณ์"
                        >
                            <span className="nav-icon"><RouterIcon size={22} /></span>
                            <span>การตั้งค่าอุปกรณ์</span>
                            <ChevronDown size={16} className="nav-group-chevron" />
                        </button>
                        <div className={`nav-submenu${deviceMenuOpen ? ' open' : ''}`}>
                            {DEVICE_SETUP_LINKS.map(({ path, label, Icon }) => (
                                <NavLink key={path} to={path} className="nav-item nav-subitem" data-label={label}>
                                    <span className="nav-icon"><Icon size={18} /></span>
                                    <span>{label}</span>
                                </NavLink>
                            ))}
                        </div>
                    </div>
                    <NavLink to="/phonebook" className="nav-item" data-label="สมุดโทรศัพท์">
                        <span className="nav-icon"><Phone size={22} /></span>
                        <span>สมุดโทรศัพท์</span>
                    </NavLink>
                    <NavLink to="/profile" className="nav-item" data-label="ข้อมูลส่วนตัว">
                        <span className="nav-icon"><User size={22} /></span>
                        <span>ข้อมูลส่วนตัว</span>
                    </NavLink>
                    <RoleGate allow={['admin']}>
                        <NavLink to="/admin" className="nav-item" data-label="ผู้ดูแลระบบ">
                            <span className="nav-icon"><Settings size={22} /></span>
                            <span>ผู้ดูแลระบบ</span>
                        </NavLink>
                    </RoleGate>
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
                            <span className="user-avatar">
                                {(fullName?.trim()?.[0] || role?.[0] || 'U').toUpperCase()}
                            </span>
                            <div className="user-profile-text">
                                <span className="user-profile-name">{toTitleCase(fullName) || ROLE_LABEL[role] || role}</span>
                                <span className={`role-badge role-badge-${role}`}>{ROLE_LABEL[role] || role}</span>
                            </div>
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
