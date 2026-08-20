import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquareText, Star, User } from 'lucide-react';
import { useAuth } from '../shared/auth/AuthContext';
import { getMyFeedback } from '../features/feedback/feedbackService';
import { SCOPE_LABEL } from '../features/feedback/scopeLabels';

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

// fullName/empId/deptName come from AuthContext's `profile` (GET /auth/me —
// the JWT itself only signs `{ id, role }`, see auth.service.js `jwt.sign`).
// `iat`/`exp` are standard JWT claims that ARE always present, so the
// "session online for" row can still be computed straight from the token.
function formatDuration(iatSeconds) {
    const diffMs = Date.now() - iatSeconds * 1000;
    const diffMins = Math.max(0, Math.floor(diffMs / 60000));
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return hours > 0 ? `${hours} ชั่วโมง ${mins} นาที` : `${mins} นาที`;
}

function formatFeedbackDate(value) {
    return new Date(value).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function ProfilePage() {
    const navigate = useNavigate();
    const { role, token, profile } = useAuth();
    const claims = token ? decodeJwt(token) : null;

    const displayName = profile?.fullName || ROLE_LABEL[role] || role || '-';
    const empId = profile?.empId || '-';
    const deptName = profile?.deptName || null;
    const onlineDuration = claims?.iat ? formatDuration(claims.iat) : null;

    const [myFeedback, setMyFeedback] = useState([]);
    const [feedbackLoading, setFeedbackLoading] = useState(true);
    const [feedbackError, setFeedbackError] = useState(null);

    useEffect(() => {
        getMyFeedback()
            .then(setMyFeedback)
            .catch((err) => setFeedbackError(err.response?.data?.message || 'ไม่สามารถโหลดประวัติคำแนะนำได้'))
            .finally(() => setFeedbackLoading(false));
    }, []);

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
                        <p style={{ color: 'var(--text-secondary)', fontSize: 16, margin: 0 }}>รหัสพนักงาน: {empId}</p>
                        {deptName && (
                            <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '2px 0 0' }}>{deptName}</p>
                        )}
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

            <div className="card" style={{ maxWidth: 600, margin: '24px auto 0', padding: 32 }}>
                <h3
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        marginBottom: 20,
                        fontSize: 18,
                        color: 'var(--text-primary)',
                    }}
                >
                    <MessageSquareText size={20} color="var(--nt-yellow)" /> คำแนะนำที่คุณเคยส่ง
                </h3>

                {feedbackError && <div className="error-banner">{feedbackError}</div>}

                {feedbackLoading && !feedbackError && (
                    <p style={{ color: 'var(--text-secondary)' }}>กำลังโหลดข้อมูล...</p>
                )}

                {!feedbackLoading && !feedbackError && myFeedback.length === 0 && (
                    <p style={{ color: 'var(--text-secondary)' }}>คุณยังไม่เคยส่งคำแนะนำเข้ามาในระบบ</p>
                )}

                {!feedbackLoading && myFeedback.length > 0 && (
                    <div style={{ display: 'grid', gap: 14 }}>
                        {myFeedback.map((f) => (
                            <div
                                key={f._id}
                                style={{
                                    padding: '14px 16px',
                                    background: 'var(--bg-main)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-light)',
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: 8,
                                        marginBottom: f.comment ? 8 : 0,
                                    }}
                                >
                                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                                        {SCOPE_LABEL[f.scope] || f.scope}
                                    </span>
                                    <span
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 10,
                                            fontSize: 12.5,
                                            color: 'var(--text-secondary)',
                                        }}
                                    >
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <Star size={13} color="var(--nt-yellow)" fill="var(--nt-yellow)" />
                                            {f.rating} / 5
                                        </span>
                                        {formatFeedbackDate(f.createdAt)}
                                    </span>
                                </div>
                                {f.comment && (
                                    <p style={{ margin: 0, fontSize: 14, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                                        {f.comment}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
