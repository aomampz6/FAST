import { useCallback, useEffect, useState } from 'react';
import { getParameters, createParameter, updateParameter, deleteParameter } from './parametersService';

export function useParameters() {
    const [parameters, setParameters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getParameters();
            setParameters(data);
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
        parameters,
        loading,
        error,
        refresh,
        createParameter: async (payload) => {
            await createParameter(payload);
            await refresh();
        },
        updateParameter: async (id, payload) => {
            await updateParameter(id, payload);
            await refresh();
        },
        deleteParameter: async (id) => {
            await deleteParameter(id);
            await refresh();
        },
    };
}
