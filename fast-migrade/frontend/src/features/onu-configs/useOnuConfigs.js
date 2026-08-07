import { useCallback, useEffect, useState } from 'react';
import {
    getOnuConfigs,
    createOnuConfig,
    updateOnuConfig,
    deleteOnuConfig,
    addOnuConfigImages,
    removeOnuConfigImage,
} from './onuConfigsService';

export function useOnuConfigs() {
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getOnuConfigs();
            setConfigs(data);
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
        configs,
        loading,
        error,
        refresh,
        createOnuConfig: async (payload) => {
            await createOnuConfig(payload);
            await refresh();
        },
        updateOnuConfig: async (id, payload) => {
            await updateOnuConfig(id, payload);
            await refresh();
        },
        deleteOnuConfig: async (id) => {
            await deleteOnuConfig(id);
            await refresh();
        },
        addOnuConfigImages: async (id, files) => {
            await addOnuConfigImages(id, files);
            await refresh();
        },
        removeOnuConfigImage: async (id, imageId) => {
            await removeOnuConfigImage(id, imageId);
            await refresh();
        },
    };
}
