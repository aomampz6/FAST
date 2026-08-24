import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { getUser } from '../users/usersService';

const EMPTY = {
    username: '',
    password: '',
    role: 'user',
    empId: '',
    firstName: '',
    lastName: '',
    deptFullName: '',
    deptName: '',
    email: '',
};

/**
 * Edit dialog for a single account, opened from the roster's "แก้ไข" button.
 *
 * Fields are loaded with GET /users/:id rather than from the table row, so the
 * dialog shows what the database actually holds for the account — including the
 * HR columns (รหัสพนักงาน, ชื่อ/นามสกุล-อังกฤษ, ส่วนงาน, e-mail) that came from
 * the employee import and are not in the roster listing.
 *
 * The password box is deliberately blank on open: passwords are stored as
 * bcrypt hashes, so the existing one cannot be read back or displayed. Leaving
 * it empty keeps the current password; typing a new one replaces it.
 */
// The bulk import that created the technician roster stored only
// username/password/fullName, so most accounts have no separate ชื่อ-อังกฤษ /
// นามสกุล-อังกฤษ yet. fullName was built as "firstName lastName", so splitting on
// the first space recovers both for 2,359 of the 2,365 accounts that have one;
// the rest keep everything after the first word as the surname. It is a
// best-effort guess, so the dialog says so rather than presenting it as stored
// data.
function splitFullName(fullName) {
    const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length < 2) return null;
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

const HR_FIELDS = ['empId', 'firstName', 'lastName', 'deptName', 'deptFullName', 'email'];

export default function UserEditModal({ userId, onClose, onSave }) {
    const [form, setForm] = useState(EMPTY);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    // True when the account has none of the employee-register fields stored —
    // an empty form is then the correct state, not a failed load, and the
    // dialog explains that instead of looking broken.
    const [noHrData, setNoHrData] = useState(false);
    const [nameWasDerived, setNameWasDerived] = useState(false);

    const usernameRef = useRef(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        getUser(userId)
            .then((user) => {
                if (cancelled) return;

                const derived = !user.firstName && !user.lastName ? splitFullName(user.fullName) : null;
                setNameWasDerived(Boolean(derived));
                setNoHrData(HR_FIELDS.every((field) => !user[field]));

                setForm({
                    ...EMPTY,
                    username: user.username || '',
                    role: user.role || 'user',
                    empId: user.empId || '',
                    firstName: user.firstName || derived?.firstName || '',
                    lastName: user.lastName || derived?.lastName || '',
                    deptFullName: user.deptFullName || '',
                    deptName: user.deptName || '',
                    email: user.email || '',
                });
            })
            .catch((err) => {
                if (!cancelled) setError(err.response?.data?.message || 'โหลดข้อมูลผู้ใช้งานไม่สำเร็จ');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [userId]);

    // Escape closes the dialog, matching the Cancel button. Bound while the
    // dialog is mounted only, so the page keeps its own key handling otherwise.
    useEffect(() => {
        function onKeyDown(e) {
            if (e.key === 'Escape') onClose();
        }
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    useEffect(() => {
        if (!loading) usernameRef.current?.focus();
    }, [loading]);

    const setField = useCallback(
        (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value })),
        []
    );

    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);
        setSaving(true);
        try {
            const payload = {
                username: form.username.trim(),
                role: form.role,
                empId: form.empId.trim(),
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                deptFullName: form.deptFullName.trim(),
                deptName: form.deptName.trim(),
                email: form.email.trim(),
            };
            // An untouched password box means "keep the current one" — sending
            // an empty string would fail the API's 8-character minimum.
            if (form.password) payload.password = form.password;

            await onSave(payload);
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'บันทึกไม่สำเร็จ');
        } finally {
            setSaving(false);
        }
    }

    return createPortal(
        <div className="user-modal-overlay" onClick={onClose}>
            <div
                className="user-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="user-modal-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="user-modal-header">
                    <div>
                        <h3 id="user-modal-title">แก้ไขผู้ใช้งาน</h3>
                        {!loading && <p className="user-modal-subtitle">{form.username}</p>}
                    </div>
                    <button type="button" className="user-modal-close" onClick={onClose} aria-label="ปิด">
                        <X size={18} />
                    </button>
                </div>

                {loading ? (
                    <p className="user-modal-loading">กำลังโหลดข้อมูล...</p>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="user-modal-body">
                            {error && <div className="error-banner">{error}</div>}
                            {noHrData && (
                                <div className="user-modal-notice">
                                    บัญชีนี้ยังไม่มีข้อมูลทะเบียนพนักงานในฐานข้อมูล (รหัสพนักงาน, ส่วนงาน, e-mail) —
                                    ช่องที่ว่างจึงไม่ใช่การโหลดไม่สำเร็จ กรอกเองได้ที่นี่ หรือนำเข้าทั้งชุดจากไฟล์ HR
                                    ด้วยคำสั่ง <code>import:users --backfill</code>
                                </div>
                            )}
                            <div className="form-grid">
                                <label>
                                    Username
                                    <input ref={usernameRef} value={form.username} onChange={setField('username')} required />
                                </label>
                                <label>
                                    Password
                                    <input
                                        type="password"
                                        value={form.password}
                                        onChange={setField('password')}
                                        placeholder="เว้นว่างหากไม่ต้องการเปลี่ยน"
                                        autoComplete="new-password"
                                    />
                                    <span className="field-hint">
                                        รหัสผ่านเดิมถูกเก็บแบบเข้ารหัส (bcrypt) จึงไม่สามารถแสดงได้ — กรอกเฉพาะเมื่อต้องการตั้งรหัสผ่านใหม่
                                        (อย่างน้อย 8 ตัวอักษร)
                                    </span>
                                </label>
                                <label>
                                    รหัสพนักงาน
                                    <input value={form.empId} onChange={setField('empId')} />
                                </label>
                                <label>
                                    สิทธิ์การใช้งาน (Role)
                                    <select value={form.role} onChange={setField('role')}>
                                        <option value="user">ผู้ใช้งานทั่วไป (user)</option>
                                        <option value="admin">ผู้ดูแลระบบ (admin)</option>
                                    </select>
                                </label>
                                <label>
                                    ชื่อ-อังกฤษ
                                    <input value={form.firstName} onChange={setField('firstName')} />
                                    {nameWasDerived && (
                                        <span className="field-hint">แยกจากชื่อ-นามสกุลเดิม กรุณาตรวจสอบก่อนบันทึก</span>
                                    )}
                                </label>
                                <label>
                                    นามสกุล-อังกฤษ
                                    <input value={form.lastName} onChange={setField('lastName')} />
                                    {nameWasDerived && (
                                        <span className="field-hint">แยกจากชื่อ-นามสกุลเดิม กรุณาตรวจสอบก่อนบันทึก</span>
                                    )}
                                </label>
                                <label>
                                    ชื่อเต็มส่วนงาน
                                    <input value={form.deptFullName} onChange={setField('deptFullName')} />
                                </label>
                                <label>
                                    ส่วนงาน
                                    <input value={form.deptName} onChange={setField('deptName')} />
                                </label>
                                <label>
                                    E-mail
                                    <input type="email" value={form.email} onChange={setField('email')} />
                                </label>
                            </div>
                        </div>
                        <div className="user-modal-footer">
                            <button type="submit" disabled={saving}>
                                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                            </button>
                            <button type="button" onClick={onClose} disabled={saving}>
                                ยกเลิก
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>,
        document.body
    );
}
