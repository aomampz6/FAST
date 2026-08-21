import { useAuth } from './AuthContext';

/**
 * Central role-based access-control helpers — the standard way to show/hide
 * UI by role anywhere in the app, instead of each page repeating its own
 * `role === 'admin'` check (which is easy to get subtly inconsistent across
 * pages, e.g. one page allowing `'admin'` and another `'Admin'`).
 *
 * Usage:
 *   const isAdmin = useHasRole(['admin']);
 *   ...
 *   <RoleGate allow={['admin']}>{adminOnlyStuff}</RoleGate>
 *
 * This only ever controls what renders — it is a UI convenience, not a
 * security boundary. Every admin-only action must still be enforced by the
 * backend's own `requireRole()` middleware (src/middleware/auth.js), the
 * same way a hidden button here doesn't stop a direct API call.
 */
export function useHasRole(allow) {
    const { role } = useAuth();
    return allow.includes(role);
}

export function RoleGate({ allow, children, fallback = null }) {
    return useHasRole(allow) ? children : fallback;
}
