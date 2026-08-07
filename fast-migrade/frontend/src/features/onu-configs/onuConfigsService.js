import httpClient from '../../shared/api/httpClient';

export async function getOnuConfigs() {
    const { data } = await httpClient.get('/onu-configs');
    return data;
}

export async function createOnuConfig(payload) {
    const { data } = await httpClient.post('/onu-configs', payload);
    return data;
}

export async function updateOnuConfig(id, payload) {
    const { data } = await httpClient.put(`/onu-configs/${id}`, payload);
    return data;
}

export async function deleteOnuConfig(id) {
    await httpClient.delete(`/onu-configs/${id}`);
}

export async function addOnuConfigImages(id, files) {
    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append('images', file));
    const { data } = await httpClient.post(`/onu-configs/${id}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
}

export async function removeOnuConfigImage(id, imageId) {
    const { data } = await httpClient.delete(`/onu-configs/${id}/images/${imageId}`);
    return data;
}

export function getOnuImageUrl(key) {
    return `/api/onu-configs/image?key=${encodeURIComponent(key)}`;
}
