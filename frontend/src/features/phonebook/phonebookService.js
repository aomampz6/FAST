import httpClient from '../../shared/api/httpClient';

export async function getPhonebook() {
    const { data } = await httpClient.get('/phonebook');
    return data;
}

export async function createGroup(payload) {
    const { data } = await httpClient.post('/phonebook', payload);
    return data;
}

export async function updateGroup(groupId, payload) {
    const { data } = await httpClient.put(`/phonebook/${groupId}`, payload);
    return data;
}

export async function deleteGroup(groupId) {
    await httpClient.delete(`/phonebook/${groupId}`);
}

export async function addContact(groupId, payload) {
    const { data } = await httpClient.post(`/phonebook/${groupId}/contacts`, payload);
    return data;
}

export async function updateContact(groupId, contactId, payload) {
    const { data } = await httpClient.put(`/phonebook/${groupId}/contacts/${contactId}`, payload);
    return data;
}

export async function deleteContact(groupId, contactId) {
    const { data } = await httpClient.delete(`/phonebook/${groupId}/contacts/${contactId}`);
    return data;
}
