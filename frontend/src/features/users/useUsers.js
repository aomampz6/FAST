import { useCallback, useEffect, useState } from 'react';
import { getUsers, createUser, updateUser, deleteUser, setUserStatus } from './usersService';

export function useUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getUsers();
            setUsers(data);
        } catch (err) {
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return {
        users,
        loading,
        error,
        refresh,
        createUser: async (payload) => {
            await createUser(payload);
            await refresh();
        },
        updateUser: async (id, payload) => {
            await updateUser(id, payload);
            await refresh();
        },
        deleteUser: async (id) => {
            await deleteUser(id);
            await refresh();
        },
        setUserStatus: async (id, isActive) => {
            await setUserStatus(id, isActive);
            await refresh();
        },
    };
}
