import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquareText, Inbox, Check, ExternalLink, Sparkles, Trash2 } from 'lucide-react';
import { getFeedback, updateFeedbackStatus, deleteFeedback } from '../feedback/feedbackService';
import { SCOPE_LABEL } from '../feedback/scopeLabels';
import { toTitleCase } from '../../shared/format/names';
import { useScoms } from '../scoms/useScoms';
import { useOnuConfigs } from '../onu-configs/useOnuConfigs';

function formatDate(value) {
    return new Date(value).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
}

// Which user-facing page a piece of feedback was left on. The pages read the
// `?ref=` query themselves and open that record straight away.
const SCOPE_PATH = {
    troubleshoot: '/troubleshoot',
    'onu-setup': '/onu-setup',
    'ata-setup': '/ata-setup',
};

// Read-only except for triage (resolve/delete) — admins only view what users
// submitted here, this data isn't shown anywhere on the user-facing pages
// (those just fire-and-forget a POST /feedback and show a success popup, see
// TroubleshootPage/OnuSetupPage).
export default function AdminFeedbackTab() {
    const [feedback, setFeedback] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [scopeFilter, setScopeFilter] = useState('all');
    const [resolvingId, setResolvingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    // Only used to turn `refId` into a readable link label — the table still
    // renders (with the raw id) if either of these fails to load.
    const { scoms } = useScoms();
    const { configs } = useOnuConfigs();

    useEffect(() => {
        getFeedback()
            .then(setFeedback)
            .catch((err) => setError(err.response?.data?.message || 'ไม่สามารถโหลดข้อมูลคำแนะนำได้'))
            .finally(() => setLoading(false));
    }, []);

    // Updated in place, never re-sorted — createdAt (and therefore the
    // "newest first" order the list was fetched in) never changes here.
    // One-way: once resolved there's no button to flip it back to "ใหม่".
    async function handleResolve(item) {
        setResolvingId(item._id);
        try {
            await updateFeedbackStatus(item._id, 'resolved');
            setFeedback((prev) => prev.map((f) => (f._id === item._id ? { ...f, status: 'resolved' } : f)));
        } catch (err) {
            setError(err.response?.data?.message || 'อัปเดตสถานะไม่สำเร็จ');
        } finally {
            setResolvingId(null);
        }
    }

    async function handleDelete(item) {
        if (!window.confirm('ต้องการลบคำแนะนำนี้ใช่หรือไม่? การลบไม่สามารถย้อนกลับได้')) return;
        setDeletingId(item._id);
        try {
            await deleteFeedback(item._id);
            setFeedback((prev) => prev.filter((f) => f._id !== item._id));
        } catch (err) {
            setError(err.response?.data?.message || 'ลบข้อมูลไม่สำเร็จ');
        } finally {
            setDeletingId(null);
        }
    }

    const scopeOptions = useMemo(() => {
        const seen = new Set(feedback.map((f) => f.scope));
        return Array.from(seen);
    }, [feedback]);

    // `refId` on its own is a bare ObjectId, which tells an admin nothing about
    // what the user was actually looking at. Resolve it against the two
    // collections feedback can point at (see TroubleshootPage / OnuSetupPage
    // where it is submitted) to get a readable title for the link.
    const refIndex = useMemo(() => {
        const map = new Map();
        // Symptoms are matched on both keys: TroubleshootPage submits
        // `active._id || active.ID`, so older rows can hold the legacy ID.
        scoms.forEach((s) => {
            const label = [s.Group, s.Scoms].filter(Boolean).join(' — ') || s.ID;
            if (s._id) map.set(String(s._id), label);
            if (s.ID) map.set(String(s.ID), label);
        });
        configs.forEach((c) => {
            const label = [c.Brand, c.Mode].filter(Boolean).join(' — ') || c._id;
            map.set(String(c._id), label);
        });
        return map;
    }, [scoms, configs]);

    const filteredFeedback = useMemo(
        () => (scopeFilter === 'all' ? feedback : feedback.filter((f) => f.scope === scopeFilter)),
        [feedback, scopeFilter]
    );

    // A record can be deleted after someone left feedback on it, so a missing
    // title is normal: show the bare id and say so instead of linking to a page
    // that would open empty.
    function renderRefCell(f) {
        const label = refIndex.get(String(f.refId));
        const path = SCOPE_PATH[f.scope];

        if (!label || !path) {
            return (
                <span className="fb-ref-missing" title={f.refId}>
                    {f.refId}
                    {!label && <span className="fb-ref-note">(ไม่พบข้อมูลนี้แล้ว)</span>}
                </span>
            );
        }

        return (
            <Link className="fb-ref-link" to={`${path}?ref=${encodeURIComponent(f.refId)}`} title={f.refId}>
                {label}
                <ExternalLink size={13} aria-hidden="true" />
            </Link>
        );
    }

    if (loading) {
        return (
            <div className="admin-section">
                <div className="admin-card">
                    <div className="skeleton-line w-40" />
                    <div className="skeleton-line w-80" style={{ marginTop: 16 }} />
                    <div className="skeleton-line w-60" style={{ marginTop: 12 }} />
                </div>
            </div>
        );
    }
    if (error) return <div className="error-banner">{error}</div>;

    return (
        <div className="admin-section">
            <div className="admin-card">
                <div className="admin-card-header-row">
                    <div className="admin-card-header">
                        <div className="admin-card-icon">
                            <MessageSquareText size={20} />
                        </div>
                        <div>
                            <h3>คำแนะนำจากผู้ใช้งาน</h3>
                            <p className="admin-card-subtitle">
                                {feedback.length} รายการทั้งหมด
                                {scopeFilter !== 'all' && ` · ${SCOPE_LABEL[scopeFilter] || scopeFilter} ${filteredFeedback.length} รายการ`}
                            </p>
                        </div>
                    </div>
                    <div className="admin-scoms-filters">
                        <select
                            className="admin-group-filter"
                            value={scopeFilter}
                            onChange={(e) => setScopeFilter(e.target.value)}
                            aria-label="กรองตามประเภทหน้า"
                        >
                            <option value="all">ทุกประเภท</option>
                            {scopeOptions.map((s) => (
                                <option key={s} value={s}>
                                    {SCOPE_LABEL[s] || s}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="table-scroll">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>สถานะ</th>
                                <th>วันที่</th>
                                <th>ประเภท</th>
                                <th>เนื้อหาที่ให้คำแนะนำ</th>
                                <th>คะแนน</th>
                                <th>ผู้ใช้งาน</th>
                                <th>คำแนะนำ</th>
                                <th>การดำเนินการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredFeedback.map((f) => {
                                const isNew = (f.status || 'new') === 'new';
                                return (
                                    <tr key={f._id}>
                                        <td>
                                            <span className={`fb-badge ${isNew ? 'fb-badge-new' : 'fb-badge-read'}`}>
                                                {isNew ? (
                                                    <>
                                                        <Sparkles size={12} /> ใหม่
                                                    </>
                                                ) : (
                                                    'อ่านแล้ว'
                                                )}
                                            </span>
                                        </td>
                                        <td style={{ whiteSpace: 'nowrap' }}>{formatDate(f.createdAt)}</td>
                                        <td>{SCOPE_LABEL[f.scope] || f.scope}</td>
                                        <td>{renderRefCell(f)}</td>
                                        <td>{f.rating} / 5</td>
                                        <td>{toTitleCase(f.fullName) || f.username || f.userId}</td>
                                        <td style={{ maxWidth: 360, whiteSpace: 'pre-wrap' }}>{f.comment || '-'}</td>
                                        <td>
                                            <div className="fb-actions">
                                                {isNew ? (
                                                    <button
                                                        type="button"
                                                        className="fb-resolve-btn"
                                                        onClick={() => handleResolve(f)}
                                                        disabled={resolvingId === f._id}
                                                    >
                                                        <Check size={13} /> ทำเครื่องหมายว่าเรียบร้อย
                                                    </button>
                                                ) : (
                                                    <span className="fb-done-text">ตรวจสอบแล้ว</span>
                                                )}
                                                <button
                                                    type="button"
                                                    className="fb-delete-btn danger"
                                                    onClick={() => handleDelete(f)}
                                                    disabled={deletingId === f._id}
                                                    aria-label="ลบรายการนี้"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {filteredFeedback.length === 0 && (
                        <div className="admin-empty-state">
                            <Inbox size={32} />
                            <p>{feedback.length === 0 ? 'ยังไม่มีคำแนะนำจากผู้ใช้งาน' : 'ไม่พบรายการในประเภทนี้'}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
