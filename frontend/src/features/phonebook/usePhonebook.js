import { useCallback, useEffect, useState } from 'react';
import {
    getPhonebook,
    createGroup,
    updateGroup,
    deleteGroup,
    addContact,
    updateContact,
    deleteContact,
} from './phonebookService';

export function usePhonebook() {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getPhonebook();
            setGroups(data);
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
        groups,
        loading,
        error,
        refresh,
        createGroup: async (payload) => {
            await createGroup(payload);
            await refresh();
        },
        updateGroup: async (groupId, payload) => {
            await updateGroup(groupId, payload);
            await refresh();
        },
        deleteGroup: async (groupId) => {
            await deleteGroup(groupId);
            await refresh();
        },
        addContact: async (groupId, payload) => {
            await addContact(groupId, payload);
            await refresh();
        },
        updateContact: async (groupId, contactId, payload) => {
            await updateContact(groupId, contactId, payload);
            await refresh();
        },
        deleteContact: async (groupId, contactId) => {
            await deleteContact(groupId, contactId);
            await refresh();
        },
    };
}
