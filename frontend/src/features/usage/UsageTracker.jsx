import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../shared/auth/AuthContext';
import { trackPageView } from './usageService';

// Renders nothing — sits once inside <AuthProvider> in App.jsx so a single
// effect sees route changes under both Layout (technician pages) and
// AdminLayout, and reports each page opened to the admin
// "สถิติการเข้าใช้งาน" tab. Logins are recorded server-side (auth.hooks),
// not from here.
export default function UsageTracker() {
    const { pathname } = useLocation();
    const { isAuthenticated } = useAuth();
    // StrictMode runs effects twice in dev, and a re-render with the same
    // pathname shouldn't count as a second visit either.
    const lastSent = useRef(null);

    useEffect(() => {
        if (!isAuthenticated || pathname === '/login') {
            lastSent.current = null;
            return;
        }
        if (lastSent.current === pathname) return;
        lastSent.current = pathname;
        // Best effort — a failed ping must never surface to the user.
        trackPageView(pathname).catch(() => {});
    }, [pathname, isAuthenticated]);

    return null;
}
