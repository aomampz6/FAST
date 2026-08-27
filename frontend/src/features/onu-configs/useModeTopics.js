import { useCallback, useEffect, useState } from 'react';
import { getModeTopics, createModeTopic, updateModeTopic, deleteModeTopic } from './modeTopicsService';

export function useModeTopics() {
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getModeTopics();
            setTopics(data);
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
        topics,
        loading,
        error,
        refresh,
        createModeTopic: async (payload) => {
            await createModeTopic(payload);
            await refresh();
        },
        updateModeTopic: async (id, payload) => {
            await updateModeTopic(id, payload);
            await refresh();
        },
        deleteModeTopic: async (id) => {
            await deleteModeTopic(id);
            await refresh();
        },
    };
}
