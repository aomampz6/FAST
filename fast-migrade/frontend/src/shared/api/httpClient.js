import axios from 'axios';

const httpClient = axios.create({
    baseURL: '/api',
});

httpClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('fast_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

httpClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('fast_token');
            localStorage.removeItem('fast_role');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default httpClient;
