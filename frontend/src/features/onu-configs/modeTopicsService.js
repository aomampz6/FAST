import httpClient from '../../shared/api/httpClient';

export async function getModeTopics() {
    const { data } = await httpClient.get('/mode-topics');
    return data;
}

export async function createModeTopic(payload) {
    const { data } = await httpClient.post('/mode-topics', payload);
    return data;
}

export async function updateModeTopic(id, payload) {
    const { data } = await httpClient.put(`/mode-topics/${id}`, payload);
    return data;
}

export async function deleteModeTopic(id) {
    await httpClient.delete(`/mode-topics/${id}`);
}
