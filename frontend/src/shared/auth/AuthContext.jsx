import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { loginRequest, getMe } from '../../features/auth/authService';

const AuthContext = createContext(null);

const TOKEN_KEY = 'fast_token';
const ROLE_KEY = 'fast_role';

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
    const [role, setRole] = useState(() => localStorage.getItem(ROLE_KEY));
    const [profile, setProfile] = useState(null);

    // The JWT itself only carries {id, role} — the account's own details
    // (username, fullName, empId, name/department columns, e-mail) live on the
    // User document, so they're fetched once per session (login, or an existing
    // token on page reload) rather than decoded from the token. Shared here
    // (rather than fetched per-page) so the header (fullName) and the profile
    // page (everything else) read from one request.
    useEffect(() => {
        if (!token) {
            setProfile(null);
            return;
        }
        getMe()
            .then(setProfile)
            .catch(() => setProfile(null));
    }, [token]);

    const login = useCallback(async (username, password) => {
        const result = await loginRequest(username, password);
        localStorage.setItem(TOKEN_KEY, result.token);
        localStorage.setItem(ROLE_KEY, result.role);
        setToken(result.token);
        setRole(result.role);
        return result;
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(ROLE_KEY);
        setToken(null);
        setRole(null);
    }, []);

    const value = useMemo(
        () => ({ token, role, profile, fullName: profile?.fullName || null, isAuthenticated: !!token, login, logout }),
        [token, role, profile, login, logout]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
