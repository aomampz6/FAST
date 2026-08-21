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

export async function addScomImages(id, files) {
    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append('images', file));
    const { data } = await httpClient.post(`/scoms/${id}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
}

export async function removeScomImage(id, imageId) {
    const { data } = await httpClient.delete(`/scoms/${id}/images/${imageId}`);
    return data;
}

export function getScomImageUrl(key) {
    return `/api/scoms/image?key=${encodeURIComponent(key)}`;
}
