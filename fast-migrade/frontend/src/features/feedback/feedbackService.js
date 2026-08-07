import httpClient from '../../shared/api/httpClient';

export async function submitFeedback(payload) {
    const { data } = await httpClient.post('/feedback', payload);
    return data;
}

export async function getFeedback() {
    const { data } = await httpClient.get('/feedback');
    return data;
}
