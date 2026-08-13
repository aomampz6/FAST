import httpClient from '../../shared/api/httpClient';

export async function getParameters() {
    const { data } = await httpClient.get('/parameters');
    return data;
}

export async function createParameter(payload) {
    const { data } = await httpClient.post('/parameters', payload);
    return data;
}

export async function updateParameter(id, payload) {
    const { data } = await httpClient.put(`/parameters/${id}`, payload);
    return data;
}

export async function deleteParameter(id) {
    await httpClient.delete(`/parameters/${id}`);
}
