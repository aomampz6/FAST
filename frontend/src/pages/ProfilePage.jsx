import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    AtSign,
    Briefcase,
    Building2,
    Eye,
    EyeOff,
    Hash,
    IdCard,
    Lock,
    Mail,
    User,
} from 'lucide-react';
import { useAuth } from '../shared/auth/AuthContext';
import { toTitleCase } from '../shared/format/names';
import { JOB_TYPES } from '../shared/jobTypes';
import './profile.css';

function decodeJwt(token) {
    try {
        const payload = token.split('.')[1];
        const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(json);
    } catch {
        return null;
    }
}

const ROLE_LABEL = {
    admin: 'ผู้ดูแลระบบ',
    user: 'ช่างเทคนิค',
};

// The account's own details come from AuthContext's `profile` (GET /auth/me —
// the JWT itself only signs `{ id, role }`, see auth.service.js `jwt.sign`).
// `iat`/`exp` are standard JWT claims that ARE always present, so the session
// tiles can still be computed straight from the token.
function formatDuration(iatSeconds) {
    const diffMs = Date.now() - iatSeconds * 1000;
    const diffMins = Math.max(0, Math.floor(diffMs / 60000));
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return hours > 0 ? `${hours} ชั่วโมง ${mins} นาที` : `${mins} นาที`;
}

// Date and time are rendered at different weights in the expiry tile, so they
// are formatted separately rather than with one toLocaleString call.
function formatExpiry(expSeconds) {
    const at = new Date(expSeconds * 1000);
    return {
        date: at.toLocaleDateString('th-TH'),
        time: at.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
    };
}

function DetailRow({ icon: Icon, label, value, children }) {
    return (
        <div className="profile-row">
            <span className="profile-row-label">
                <Icon size={17} aria-hidden="true" />
                {label}
            </span>
            {children || (
                <span className={`profile-row-value${value ? '' : ' empty'}`}>{value || '-'}</span>
            )}
        </div>
    );
}

// ประเภทผู้ใช้งาน: a user may change it once; after that the server refuses
// (403) and only an admin can change it, so the control turns read-only. Admin
// accounts are never locked. The server is the real gate — this just mirrors it.
function JobTypeEditor() {
    const { role, profile, changeJobType } = useAuth();
    const locked = role !== 'admin' && Boolean(profile?.jobTypeSelfSet);
    const [selected, setSelected] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const current = profile?.jobType || '';

    if (locked) {
        return (
            <span className="profile-jobtype">
                <span className="profile-row-value">{current || '-'}</span>
                <span className="profile-jobtype-note">
                    แก้ไขได้เพียง 1 ครั้ง หากต้องการเปลี่ยนกรุณาติดต่อผู้ดูแลระบบ
                </span>
            </span>
        );
    }

    const value = selected || current;
    const dirty = Boolean(value) && value !== current;

    async function handleSave() {
        if (role !== 'admin' && !window.confirm(
            `ยืนยันเปลี่ยนประเภทผู้ใช้งานเป็น "${value}" ?\nแก้ไขได้เพียง 1 ครั้งเท่านั้น หลังจากนั้นต้องให้ผู้ดูแลระบบแก้ไขให้`
        )) return;
        setSaving(true);
        setError(null);
        try {
            await changeJobType(value);
            setSelected('');
        } catch (err) {
            setError(err.response?.data?.message || 'บันทึกไม่สำเร็จ');
        } finally {
            setSaving(false);
        }
    }

    return (
        <span className="profile-jobtype">
            <span className="profile-jobtype-controls">
                <select
                    className="profile-jobtype-select"
                    value={value}
                    onChange={(e) => setSelected(e.target.value)}
                    disabled={saving}
                    aria-label="ประเภทผู้ใช้งาน"
                >
                    {!current && <option value="" disabled>เลือกประเภทผู้ใช้งาน</option>}
                    {JOB_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                    ))}
                </select>
                <button type="button" className="profile-jobtype-save" onClick={handleSave} disabled={!dirty || saving}>
                    {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
            </span>
            {role !== 'admin' && (
                <span className="profile-jobtype-note">แก้ไขได้เพียง 1 ครั้งเท่านั้น</span>
            )}
            {error && <span className="profile-jobtype-error">{error}</span>}
        </span>
    );
}

export default function ProfilePage() {
    const navigate = useNavigate();
    const { role, token, profile } = useAuth();
    const claims = token ? decodeJwt(token) : null;

    const displayName = toTitleCase(profile?.fullName) || ROLE_LABEL[role] || role || '-';
    const empId = profile?.empId || '-';
    const deptName = profile?.deptName || null;
    const onlineDuration = claims?.iat ? formatDuration(claims.iat) : null;
    const expiry = claims?.exp ? formatExpiry(claims.exp) : null;

    // Toggles the mask on the password row. The value behind it is never the
    // real password — see the note where the row is rendered.
    const [showPassword, setShowPassword] = useState(false);


    return (
        <div className="page profile-page">
            <div className="mb-4">
                <button type="button" className="back-btn" onClick={() => navigate('/dashboard')}>
                    <ArrowLeft size={20} /> กลับหน้าหลัก
                </button>
            </div>

            <section className="card profile-card">
                <div className="profile-identity">
                    <div className="profile-avatar">
                        <User size={44} />
                        <span className="profile-avatar-status" aria-hidden="true" />
                    </div>
                    <div className="profile-identity-text">
                        <h2 className="profile-name">{displayName}</h2>
                        <p className="profile-empid">
                            <IdCard size={15} aria-hidden="true" />
                            รหัสพนักงาน: {empId}
                        </p>
                        {deptName && <span className="profile-chip">{deptName}</span>}
                    </div>
                </div>

                <div className="profile-stats">
                    <div className="profile-stat">
                        <span className="profile-stat-label">Status</span>
                        <span className="profile-stat-value">
                            <span className="profile-dot" aria-hidden="true" />
                            Online
                        </span>
                    </div>

                    {onlineDuration && (
                        <div className="profile-stat">
                            <span className="profile-stat-label">Session time</span>
                            <span className="profile-stat-value accent">{onlineDuration}</span>
                        </div>
                    )}

                    {expiry && (
                        <div className="profile-stat">
                            <span className="profile-stat-label">Expires at</span>
                            <span className="profile-stat-value">
                                {expiry.date}
                                <span className="profile-stat-sub">{expiry.time}</span>
                            </span>
                        </div>
                    )}
                </div>
            </section>

            <section className="card profile-card">
                <div className="profile-card-head">
                    <span className="profile-card-icon">
                        <IdCard size={20} />
                    </span>
                    <div>
                        <h3>ข้อมูลส่วนบุคคล</h3>
                        <p>รายละเอียดบัญชีและข้อมูลพนักงาน</p>
                    </div>
                </div>

                <div className="profile-rows">
                    <DetailRow icon={AtSign} label="Username" value={profile?.username} />

                    {/* Passwords are stored as bcrypt hashes and are never sent to
                        the browser, so there is nothing to unmask — the eye button
                        swaps the dots for that explanation rather than pretending a
                        value exists. Changing a password stays an admin action. */}
                    <DetailRow icon={Lock} label="Password">
                        <span className="profile-password">
                            {showPassword ? (
                                <span className="profile-password-note">
                                    ไม่สามารถแสดงได้ — รหัสผ่านถูกเก็บแบบเข้ารหัส (bcrypt)
                                </span>
                            ) : (
                                <span className="profile-password-mask">••••••••</span>
                            )}
                            <button
                                type="button"
                                className="profile-password-toggle"
                                onClick={() => setShowPassword((prev) => !prev)}
                                aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                                aria-pressed={showPassword}
                                title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                            >
                                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                            </button>
                        </span>
                    </DetailRow>

                    {role === 'user' && (
                        <DetailRow icon={Briefcase} label="ประเภทผู้ใช้งาน">
                            <JobTypeEditor />
                        </DetailRow>
                    )}

                    <DetailRow icon={IdCard} label="รหัสพนักงาน" value={profile?.empId} />
                    <DetailRow icon={User} label="ชื่อ-อังกฤษ" value={toTitleCase(profile?.firstName)} />
                    <DetailRow icon={User} label="นามสกุล-อังกฤษ" value={toTitleCase(profile?.lastName)} />
                    <DetailRow icon={Building2} label="ชื่อเต็มส่วนงาน" value={profile?.deptFullName} />
                    <DetailRow icon={Hash} label="ส่วนงาน" value={profile?.deptName} />
                    <DetailRow icon={Mail} label="E-mail" value={profile?.email} />
                </div>

                <p className="profile-foot-note">
                    ข้อมูลชุดนี้มาจากทะเบียนพนักงาน หากไม่ถูกต้องหรือแสดงเป็น &quot;-&quot; กรุณาแจ้งผู้ดูแลระบบเพื่อแก้ไข
                </p>
            </section>
        </div>
    );
}
