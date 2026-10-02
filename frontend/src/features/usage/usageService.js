import httpClient from '../../shared/api/httpClient';

export async function trackPageView(path) {
    await httpClient.post('/usage/page-view', { path });
}

export async function getUsageStats(days) {
    const { data } = await httpClient.get('/usage/stats', { params: { days } });
    return data;
}
