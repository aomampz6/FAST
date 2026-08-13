import { useCallback, useEffect, useState } from 'react';
import { getScoms, createScom, updateScom, deleteScom } from './scomsService';

export function useScoms() {
    const [scoms, setScoms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getScoms();
            setScoms(data);
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
        scoms,
        loading,
        error,
        refresh,
        createScom: async (payload) => {
            await createScom(payload);
            await refresh();
        },
        updateScom: async (id, payload) => {
            await updateScom(id, payload);
            await refresh();
        },
        deleteScom: async (id) => {
            await deleteScom(id);
            await refresh();
        },
    };
}
