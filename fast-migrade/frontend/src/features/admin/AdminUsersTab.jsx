import { useState } from 'react';
import { useUsers } from '../users/useUsers';
import { useAuth } from '../../shared/auth/AuthContext';

function decodeJwt(token) {
    try {
        const payload = token.split('.')[1];
        const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(json);
    } catch {
        return null;
    }
}

const emptyForm = { username: '', password: '', role: 'user', fullName: '' };

export default function AdminUsersTab() {
    const { users, loading, error, createUser, updateUser, deleteUser, setUserStatus } = useUsers();
    const { token } = useAuth();
    const currentUserId = token ? decodeJwt(token)?.id : null;

    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [formError, setFormError] = useState(null);

    function startEdit(user) {
        setEditingId(user._id);
        setForm({ username: user.username, password: '', role: user.role, fullName: user.fullName || '' });
    }

    function resetForm() {
        setEditingId(null);
        setForm(emptyForm);
        setFormError(null);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setFormError(null);
        try {
            if (editingId) {
                const payload = { username: form.username, role: form.role, fullName: form.fullName };
                if (form.password) payload.password = form.password;
                await updateUser(editingId, payload);
            } else {
                await createUser(form);
            }
            resetForm();
        } catch (err) {
            setFormError(err.response?.data?.message || 'Save failed');
        }
    }

    async function handleDelete(id) {
        if (!window.confirm('Delete this user?')) return;
        try {
            await deleteUser(id);
        } catch (err) {
            setFormError(err.response?.data?.message || 'Delete failed');
        }
    }

    async function handleToggleStatus(user) {
        try {
            await setUserStatus(user._id, !user.isActive);
        } catch (err) {
            setFormError(err.response?.data?.message || 'Update failed');
        }
    }

    if (loading) return <p>Loading...</p>;
    if (error) return <div className="error-banner">{error}</div>;

    return (
        <div className="admin-section">
            <form className="admin-form" onSubmit={handleSubmit}>
                <h3>{editingId ? 'Edit User' : 'New User'}</h3>
                {formError && <div className="error-banner">{formError}</div>}
                <div className="form-grid">
                    <label>
                        Username
                        <input
                            value={form.username}
                            onChange={(e) => setForm({ ...form, username: e.target.value })}
                            required
                        />
                    </label>
                    <label>
                        {editingId ? 'New Password (leave blank to keep)' : 'Password'}
                        <input
                            type="password"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            required={!editingId}
                        />
                    </label>
                    <label>
                        Role
                        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                        </select>
                    </label>
                    <label>
                        Full Name
                        <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
                    </label>
                </div>
                <div className="form-actions">
                    <button type="submit">{editingId ? 'Save' : 'Create'}</button>
                    {editingId && (
                        <button type="button" onClick={resetForm}>
                            Cancel
                        </button>
                    )}
                </div>
            </form>

            <table className="data-table">
                <thead>
                    <tr>
                        <th>Username</th>
                        <th>Full Name</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((user) => {
                        const isSelf = user._id === currentUserId;
                        return (
                            <tr key={user._id}>
                                <td>{user.username}</td>
                                <td>{user.fullName}</td>
                                <td>{user.role}</td>
                                <td>
                                    <span className={`status-badge status-${user.isActive ? 'active' : 'suspended'}`}>
                                        {user.isActive ? 'Active' : 'Suspended'}
                                    </span>
                                </td>
                                <td>
                                    <button onClick={() => startEdit(user)}>Edit</button>
                                    <button
                                        disabled={isSelf}
                                        title={isSelf ? 'Cannot change your own status' : undefined}
                                        onClick={() => handleToggleStatus(user)}
                                    >
                                        {user.isActive ? 'Suspend' : 'Activate'}
                                    </button>
                                    <button
                                        className="danger"
                                        disabled={isSelf}
                                        title={isSelf ? 'Cannot delete your own account' : undefined}
                                        onClick={() => handleDelete(user._id)}
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                    {users.length === 0 && (
                        <tr>
                            <td colSpan={5}>No users.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
