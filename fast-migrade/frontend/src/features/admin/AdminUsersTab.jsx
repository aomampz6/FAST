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
const ROLE_LABELS = { user: 'ผู้ใช้งานทั่วไป', admin: 'ผู้ดูแลระบบ' };

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
            setFormError(err.response?.data?.message || 'บันทึกไม่สำเร็จ');
        }
    }

    async function handleDelete(id) {
        if (!window.confirm('ต้องการลบผู้ใช้งานนี้ใช่หรือไม่?')) return;
        try {
            await deleteUser(id);
        } catch (err) {
            setFormError(err.response?.data?.message || 'ลบผู้ใช้งานไม่สำเร็จ');
        }
    }

    async function handleToggleStatus(user) {
        try {
            await setUserStatus(user._id, !user.isActive);
        } catch (err) {
            setFormError(err.response?.data?.message || 'อัปเดตสถานะไม่สำเร็จ');
        }
    }

    // See AdminScomsTab for why this doesn't gate on every refetch.
    if (loading && users.length === 0) return <p>กำลังโหลด...</p>;
    if (error) return <div className="error-banner">{error}</div>;

    return (
        <div className="admin-section">
            <form className="admin-form" onSubmit={handleSubmit}>
                <h3>{editingId ? 'แก้ไขผู้ใช้งาน' : 'เพิ่มผู้ใช้งานใหม่'}</h3>
                {formError && <div className="error-banner">{formError}</div>}
                <div className="form-grid">
                    <label>
                        ผู้ใช้งาน (Username)
                        <input
                            value={form.username}
                            onChange={(e) => setForm({ ...form, username: e.target.value })}
                            required
                        />
                    </label>
                    <label>
                        {editingId ? 'รหัสผ่านใหม่ (เว้นว่างหากไม่ต้องการเปลี่ยน)' : 'รหัสผ่าน'}
                        <input
                            type="password"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            required={!editingId}
                        />
                    </label>
                    <label>
                        สิทธิ์การใช้งาน (Role)
                        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                            <option value="user">ผู้ใช้งานทั่วไป (user)</option>
                            <option value="admin">ผู้ดูแลระบบ (admin)</option>
                        </select>
                    </label>
                    <label>
                        ชื่อ-นามสกุล
                        <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
                    </label>
                </div>
                <div className="form-actions">
                    <button type="submit">{editingId ? 'บันทึก' : 'เพิ่มผู้ใช้งาน'}</button>
                    {editingId && (
                        <button type="button" onClick={resetForm}>
                            ยกเลิก
                        </button>
                    )}
                </div>
            </form>

            <table className="data-table">
                <thead>
                    <tr>
                        <th>ผู้ใช้งาน (Username)</th>
                        <th>ชื่อ-นามสกุล</th>
                        <th>สิทธิ์การใช้งาน</th>
                        <th>สถานะ</th>
                        <th>การดำเนินการ</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((user) => {
                        const isSelf = user._id === currentUserId;
                        return (
                            <tr key={user._id}>
                                <td>{user.username}</td>
                                <td>{user.fullName}</td>
                                <td>{ROLE_LABELS[user.role] || user.role}</td>
                                <td>
                                    <span className={`status-badge status-${user.isActive ? 'active' : 'suspended'}`}>
                                        {user.isActive ? 'ใช้งานอยู่' : 'ระงับการใช้งาน'}
                                    </span>
                                </td>
                                <td>
                                    <button onClick={() => startEdit(user)}>แก้ไข</button>
                                    <button
                                        disabled={isSelf}
                                        title={isSelf ? 'ไม่สามารถเปลี่ยนสถานะบัญชีตนเองได้' : undefined}
                                        onClick={() => handleToggleStatus(user)}
                                    >
                                        {user.isActive ? 'ระงับการใช้งาน' : 'เปิดใช้งาน'}
                                    </button>
                                    <button
                                        className="danger"
                                        disabled={isSelf}
                                        title={isSelf ? 'ไม่สามารถลบบัญชีตนเองได้' : undefined}
                                        onClick={() => handleDelete(user._id)}
                                    >
                                        ลบ
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                    {users.length === 0 && (
                        <tr>
                            <td colSpan={5}>ยังไม่มีผู้ใช้งาน</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
