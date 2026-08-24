import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Inbox, Search, SearchX, Users } from 'lucide-react';
import { useUsers, USERS_PAGE_SIZE } from '../users/useUsers';
import { useAuth } from '../../shared/auth/AuthContext';
import UserEditModal from './UserEditModal';
import { toTitleCase } from '../../shared/format/names';

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
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [requestedPage, setRequestedPage] = useState(1);

    const {
        users,
        total,
        totalPages,
        page,
        loading,
        error,
        createUser,
        updateUser,
        deleteUser,
        setUserStatus,
    } = useUsers({
        search,
        page: requestedPage,
        role: roleFilter === 'all' ? undefined : roleFilter,
    });

    const { token } = useAuth();
    const currentUserId = token ? decodeJwt(token)?.id : null;

    const [form, setForm] = useState(emptyForm);
    // Editing happens in a modal (UserEditModal), which loads the account's own
    // record from the API; the inline form above the table only creates.
    const [editingUserId, setEditingUserId] = useState(null);
    const [formError, setFormError] = useState(null);

    // A new search or filter can leave the requested page past the end of the
    // shorter result set, so start over at the first page.
    useEffect(() => {
        setRequestedPage(1);
    }, [search, roleFilter]);

    function resetForm() {
        setForm(emptyForm);
        setFormError(null);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setFormError(null);
        try {
            await createUser(form);
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

    const isFiltered = Boolean(search.trim()) || roleFilter !== 'all';

    // See AdminScomsTab for why this doesn't gate on every refetch — a spinner
    // on each search keystroke would make the table flicker.
    if (loading && users.length === 0 && !isFiltered) return <p>กำลังโหลด...</p>;
    if (error) return <div className="error-banner">{error}</div>;

    return (
        <div className="admin-section">
            <form className="admin-form" onSubmit={handleSubmit}>
                <h3>เพิ่มผู้ใช้งานใหม่</h3>
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
                        รหัสผ่าน
                        <input
                            type="password"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            required
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
                    <button type="submit">เพิ่มผู้ใช้งาน</button>
                </div>
            </form>

            <div className="admin-card">
                <div className="admin-card-header-row">
                    <div className="admin-card-header">
                        <div className="admin-card-icon">
                            <Users size={20} />
                        </div>
                        <div>
                            <h3>รายชื่อผู้ใช้งาน</h3>
                            <p className="admin-card-subtitle">
                                {isFiltered ? `พบ ${total} บัญชีที่ตรงกับตัวกรอง` : `${total} บัญชีทั้งหมด`}
                                {total > USERS_PAGE_SIZE && ` · แสดง ${users.length} รายการ (หน้า ${page}/${totalPages})`}
                            </p>
                        </div>
                    </div>
                    <div className="admin-scoms-filters">
                        <select
                            className="admin-group-filter"
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            aria-label="กรองตามสิทธิ์การใช้งาน"
                        >
                            <option value="all">ทุกสิทธิ์</option>
                            <option value="user">ผู้ใช้งานทั่วไป</option>
                            <option value="admin">ผู้ดูแลระบบ</option>
                        </select>
                        <div className="admin-search-box">
                            <Search size={16} className="admin-search-icon" />
                            <input
                                type="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="ค้นหา username หรือชื่อ-นามสกุล..."
                                aria-label="ค้นหาผู้ใช้งาน"
                            />
                        </div>
                    </div>
                </div>

                <div className="table-scroll">
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
                                        <td>{toTitleCase(user.fullName)}</td>
                                        <td>{ROLE_LABELS[user.role] || user.role}</td>
                                        <td>
                                            <span
                                                className={`status-badge status-${user.isActive ? 'active' : 'suspended'}`}
                                            >
                                                {user.isActive ? 'ใช้งานอยู่' : 'ระงับการใช้งาน'}
                                            </span>
                                        </td>
                                        <td>
                                            <button onClick={() => setEditingUserId(user._id)}>แก้ไข</button>
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
                        </tbody>
                    </table>

                    {users.length === 0 && isFiltered && !loading && (
                        <div className="admin-empty-state">
                            <SearchX size={32} />
                            <p>
                                {search.trim()
                                    ? `ไม่พบผู้ใช้งานที่ตรงกับ "${search}"`
                                    : 'ไม่พบผู้ใช้งานตามสิทธิ์ที่เลือก'}
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    setSearch('');
                                    setRoleFilter('all');
                                }}
                            >
                                ล้างตัวกรอง
                            </button>
                        </div>
                    )}

                    {users.length === 0 && !isFiltered && !loading && (
                        <div className="admin-empty-state">
                            <Inbox size={32} />
                            <p>ยังไม่มีผู้ใช้งานในระบบ</p>
                            <span className="field-hint">เพิ่มบัญชีแรกได้จากฟอร์มด้านบน</span>
                        </div>
                    )}
                </div>

                {totalPages > 1 && (
                    <div className="admin-pagination">
                        <button
                            type="button"
                            onClick={() => setRequestedPage(Math.max(1, page - 1))}
                            disabled={page === 1 || loading}
                            aria-label="หน้าก่อนหน้า"
                        >
                            <ChevronLeft size={16} /> ก่อนหน้า
                        </button>
                        <span className="admin-pagination-indicator">
                            หน้า {page} / {totalPages}
                        </span>
                        <button
                            type="button"
                            onClick={() => setRequestedPage(Math.min(totalPages, page + 1))}
                            disabled={page === totalPages || loading}
                            aria-label="หน้าถัดไป"
                        >
                            ถัดไป <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </div>

            {editingUserId && (
                <UserEditModal
                    userId={editingUserId}
                    onClose={() => setEditingUserId(null)}
                    // The modal surfaces its own save error, so let the rejection
                    // through instead of swallowing it here.
                    onSave={(payload) => updateUser(editingUserId, payload)}
                />
            )}
        </div>
    );
}
