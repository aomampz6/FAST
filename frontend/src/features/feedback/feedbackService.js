import httpClient from '../../shared/api/httpClient';

export async function submitFeedback(payload) {
    const { data } = await httpClient.post('/feedback', payload);
    return data;
}

export async function getFeedback() {
    const { data } = await httpClient.get('/feedback');
    return data;
}

export async function getMyFeedback(params) {
    const { data } = await httpClient.get('/feedback/mine', { params });
    return data;
}

export async function updateFeedbackStatus(id, status) {
    const { data } = await httpClient.patch(`/feedback/${id}/status`, { status });
    return data;
}

export async function deleteFeedback(id) {
    await httpClient.delete(`/feedback/${id}`);
}

export async function updateFeedbackReply(id, adminComment) {
    const { data } = await httpClient.patch(`/feedback/${id}/reply`, { adminComment });
    return data;
}
