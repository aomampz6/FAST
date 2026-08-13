import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { loginRequest } from '../../features/auth/authService';

const AuthContext = createContext(null);

const TOKEN_KEY = 'fast_token';
const ROLE_KEY = 'fast_role';

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
    const [role, setRole] = useState(() => localStorage.getItem(ROLE_KEY));

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
        () => ({ token, role, isAuthenticated: !!token, login, logout }),
        [token, role, login, logout]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
