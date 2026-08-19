import { useCallback, useEffect, useRef, useState } from 'react';
import { getUsers, createUser, updateUser, deleteUser, setUserStatus } from './usersService';

export const USERS_PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

/**
 * One page of the user roster, driven by server-side search and pagination.
 *
 * `search` is debounced so typing in the admin search box doesn't fire a
 * request per keystroke; page changes and mutations refetch immediately.
 */
export function useUsers({ search = '', page = 1, limit = USERS_PAGE_SIZE, role, isActive } = {}) {
    const [users, setUsers] = useState([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [resolvedPage, setResolvedPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Guards against a slow earlier response landing after a newer one and
    // overwriting the page the admin is actually looking at.
    const requestIdRef = useRef(0);

    const fetchPage = useCallback(async () => {
        const requestId = requestIdRef.current + 1;
        requestIdRef.current = requestId;

        setLoading(true);
        setError(null);
        try {
            const data = await getUsers({ search, page, limit, role, isActive });
            if (requestIdRef.current !== requestId) return;
            setUsers(data.items);
            setTotal(data.total);
            setTotalPages(data.totalPages);
            setResolvedPage(data.page);
        } catch (err) {
            if (requestIdRef.current !== requestId) return;
            setError(err.response?.data?.message || err.message);
        } finally {
            if (requestIdRef.current === requestId) setLoading(false);
        }
    }, [search, page, limit, role, isActive]);

    useEffect(() => {
        // Only the search term needs debouncing — paging and filter changes are
        // deliberate single actions, so they fetch straight away.
        if (!search) {
            fetchPage();
            return undefined;
        }
        const timer = setTimeout(fetchPage, SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [fetchPage, search]);

    return {
        users,
        total,
        totalPages,
        page: resolvedPage,
        loading,
        error,
        refresh: fetchPage,
        createUser: async (payload) => {
            await createUser(payload);
            await fetchPage();
        },
        updateUser: async (id, payload) => {
            await updateUser(id, payload);
            await fetchPage();
        },
        deleteUser: async (id) => {
            await deleteUser(id);
            await fetchPage();
        },
        setUserStatus: async (id, nextIsActive) => {
            await setUserStatus(id, nextIsActive);
            await fetchPage();
        },
    };
}
