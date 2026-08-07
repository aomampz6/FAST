import httpClient from '../../shared/api/httpClient';

export async function getScoms() {
    const { data } = await httpClient.get('/scoms');
    return data;
}

export async function createScom(payload) {
    const { data } = await httpClient.post('/scoms', payload);
    return data;
}

export async function updateScom(id, payload) {
    const { data } = await httpClient.put(`/scoms/${id}`, payload);
    return data;
}

export async function deleteScom(id) {
    await httpClient.delete(`/scoms/${id}`);
}
