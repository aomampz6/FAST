import httpClient from '../../shared/api/httpClient';

/**
 * Fetches one page of the user roster. The endpoint is paginated and searchable
 * server-side — with ~2,400 technician accounts, fetching them all and
 * filtering in the browser is not an option.
 *
 * Returns `{ items, total, page, limit, totalPages }`.
 */
export async function getUsers({ search = '', page = 1, limit = 25, role, isActive } = {}) {
    const params = { page, limit };
    if (search) params.search = search;
    if (role) params.role = role;
    if (typeof isActive === 'boolean') params.isActive = isActive;

    const { data } = await httpClient.get('/users', { params });
    return data;
}

/**
 * One account, straight from the database — the edit modal calls this instead
 * of reusing the table row so the HR fields it shows are always the stored
 * ones. Never includes the password: it is bcrypt-hashed and unreadable.
 */
export async function getUser(id) {
    const { data } = await httpClient.get(`/users/${id}`);
    return data;
}

export async function createUser(payload) {
    const { data } = await httpClient.post('/users', payload);
    return data;
}

export async function updateUser(id, payload) {
    const { data } = await httpClient.put(`/users/${id}`, payload);
    return data;
}

export async function deleteUser(id) {
    await httpClient.delete(`/users/${id}`);
}

export async function setUserStatus(id, isActive) {
    const { data } = await httpClient.patch(`/users/${id}/status`, { isActive });
    return data;
}
