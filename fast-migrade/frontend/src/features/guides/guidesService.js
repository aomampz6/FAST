import httpClient from '../../shared/api/httpClient';

export async function listGuides() {
    const { data } = await httpClient.get('/guides');
    return data; // [{ filename, size, updatedAt }]
}

export async function readGuide(filename) {
    const { data } = await httpClient.get(`/guides/${encodeURIComponent(filename)}`);
    return data; // { filename, content }
}

export async function writeGuide(filename, content) {
    const { data } = await httpClient.put(`/guides/${encodeURIComponent(filename)}`, { content });
    return data;
}
