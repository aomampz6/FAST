import httpClient from '../../shared/api/httpClient';

export async function loginRequest(username, password) {
    const { data } = await httpClient.post('/auth/login', { username, password });
    return data; // { token, role, message }
}

export async function registerRequest(payload) {
    const { data } = await httpClient.post('/auth/register', payload);
    return data;
}

export async function getMe() {
    const { data } = await httpClient.get('/auth/me');
    return data;
}
