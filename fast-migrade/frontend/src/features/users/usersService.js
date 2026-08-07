import httpClient from '../../shared/api/httpClient';

export async function getUsers() {
    const { data } = await httpClient.get('/users');
    return data;
}

export async function createUser(payload) {
    const { data } = await httpClient.post('/users', payload);
    return data;
}

export async function updateUser(id, payload) {
    const { data } = await httpClient.put(`/users/${id}`, payload);
    return data;
}

export async function deleteUser(id) {
    await httpClient.delete(`/users/${id}`);
}

export async function setUserStatus(id, isActive) {
    const { data } = await httpClient.patch(`/users/${id}/status`, { isActive });
    return data;
}
