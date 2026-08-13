import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User } from 'lucide-react';
import { useAuth } from '../shared/auth/AuthContext';

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

// Archive (archive/app.js `user-profile` view) decodes fullName/empId/email
// straight out of the JWT payload, because its login endpoint stamped those
// claims into the token. fast-migrade's real backend JWT only signs
// `{ id, role }` (see src/features/auth/auth.service.js `jwt.sign(...)`) and
// there's no self-service "/me" endpoint a regular user can call to fetch
// their own User document (users.router.js is admin-only), so fullName and
// email genuinely aren't available here — they're omitted below rather than
// faked. `iat`/`exp` are standard JWT claims that ARE always present, so the
// "session online for" row (archive's ระยะเวลาที่ Online) can still be computed
// for real from `iat`, same as archive does.
function formatDuration(iatSeconds) {
    const diffMs = Date.now() - iatSeconds * 1000;
    const diffMins = Math.max(0, Math.floor(diffMs / 60000));
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return hours > 0 ? `${hours} ชั่วโมง ${mins} นาที` : `${mins} นาที`;
}

export default function ProfilePage() {
    const navigate = useNavigate();
    const { role, token } = useAuth();
    const claims = token ? decodeJwt(token) : null;

    const displayName = ROLE_LABEL[role] || role || '-';
    const userId = claims?.id || '-';
    const onlineDuration = claims?.iat ? formatDuration(claims.iat) : null;

    return (
        <div className="page">
            <div className="mb-4">
                <button type="button" className="back-btn" onClick={() => navigate('/dashboard')}>
                    <ArrowLeft size={20} /> กลับหน้าหลัก
                </button>
            </div>

            <div className="card" style={{ maxWidth: 600, margin: '0 auto', padding: 32 }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 24,
                        marginBottom: 32,
                        borderBottom: '1px solid var(--border-color)',
                        paddingBottom: 24,
                    }}
                >
                    <div
                        style={{
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--nt-yellow), #FFA000)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--nt-dark)',
                            flexShrink: 0,
                        }}
                    >
                        <User size={40} />
                    </div>
                    <div>
                        <h2 style={{ marginBottom: 8, fontSize: 24, color: 'var(--nt-yellow)' }}>{displayName}</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 16 }}>รหัสผู้ใช้งาน: {userId}</p>
                    </div>
                </div>

                <div style={{ display: 'grid', gap: 20 }}>
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: 16,
                            background: 'var(--bg-main)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-light)',
                        }}
                    >
                        <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Status</div>
                        <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div
                                style={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: '50%',
                                    background: '#4CAF50',
                                    boxShadow: '0 0 8px #4CAF50',
                                }}
                            />
                            Online
                        </div>
                    </div>

                    {onlineDuration && (
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: 16,
                                background: 'var(--bg-main)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-light)',
                            }}
                        >
                            <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>ระยะเวลาที่ Online</div>
                            <div style={{ fontWeight: 500, color: 'var(--nt-yellow)' }}>{onlineDuration}</div>
                        </div>
                    )}

                    {claims?.exp && (
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: 16,
                                background: 'var(--bg-main)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-light)',
                            }}
                        >
                            <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>เซสชันหมดอายุ</div>
                            <div style={{ fontWeight: 500 }}>{new Date(claims.exp * 1000).toLocaleString('th-TH')}</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
