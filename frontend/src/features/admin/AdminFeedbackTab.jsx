import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    MessageSquareText,
    Inbox,
    Check,
    ExternalLink,
    Sparkles,
    Trash2,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { getFeedback, updateFeedbackStatus, deleteFeedback } from '../feedback/feedbackService';
import { SCOPE_LABEL } from '../feedback/scopeLabels';
import { toTitleCase } from '../../shared/format/names';
import { useScoms } from '../scoms/useScoms';
import { useOnuConfigs } from '../onu-configs/useOnuConfigs';

const PAGE_SIZE_OPTIONS = [10, 20];

function formatDate(value) {
    return new Date(value).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
}

// Same 1-neighbor windowed pager as AdminScomsTab: 1 ... p-1 p p+1 ... total.
function getPageNumbers(current, total) {
    const delta = 1;
    const pages = [1];
    const start = Math.max(2, current - delta);
    const end = Math.min(total - 1, current + delta);
    if (start > 2) pages.push('...');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < total - 1) pages.push('...');
    if (total > 1) pages.push(total);
    return pages;
}

// Where "เนื้อหาที่ให้คำแนะนำ" links to for each scope — the *admin* editor
// for that record, not the user-facing page a technician would see. Each
// target page reads `?editId=` itself and opens straight into edit mode (see
// AdminScomsTab / AdminDeviceConfigsTab), so an admin lands ready to fix the
// thing a user complained about instead of just viewing it.
const SCOPE_PATH = {
    troubleshoot: '/admin/scoms',
    'onu-setup': '/admin/onu-configs',
    'ata-setup': '/admin/ata-configs',
    'ap-setup': '/admin/ap-configs',
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
    // Which queue is showing — "ทำเครื่องหมายว่าเรียบร้อย" no longer just
    // relabels a row in place, it moves the item out of view entirely: once
    // resolved, an item only shows up under the "ดำเนินการแล้ว" tab. Starts on
    // "new" so an admin opening this page lands on the queue that needs them.
    const [statusFilter, setStatusFilter] = useState('new');
    const [resolvingId, setResolvingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

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

    // Updated in place in `feedback` (never re-sorted — createdAt, and
    // therefore the "newest first" order the list was fetched in, never
    // changes here), but the status flip alone is what moves the row out of
    // the "ใหม่" tab and into "ดำเนินการแล้ว" — `filteredFeedback` re-derives
    // from this on every render, so no separate "move it" step is needed.
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

    const newCount = useMemo(
        () => feedback.filter((f) => (f.status || 'new') === 'new').length,
        [feedback]
    );
    const resolvedCount = feedback.length - newCount;

    const filteredFeedback = useMemo(() => {
        let base = feedback.filter((f) => (f.status || 'new') === statusFilter);
        if (scopeFilter !== 'all') base = base.filter((f) => f.scope === scopeFilter);
        return base;
    }, [feedback, scopeFilter, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredFeedback.length / pageSize));
    const pagedFeedback = filteredFeedback.slice((page - 1) * pageSize, page * pageSize);
    const rangeStart = filteredFeedback.length === 0 ? 0 : (page - 1) * pageSize + 1;
    const rangeEnd = Math.min(page * pageSize, filteredFeedback.length);

    // Back to page 1 whenever the queue, scope or page size changes so the
    // view never lands on a page that no longer exists.
    useEffect(() => {
        setPage(1);
    }, [statusFilter, scopeFilter, pageSize]);

    // Resolving/deleting the last row on the last page shrinks totalPages —
    // step back instead of showing an empty page.
    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

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
            <Link className="fb-ref-link" to={`${path}?editId=${encodeURIComponent(f.refId)}`} title={f.refId}>
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
                                {statusFilter === 'new' ? 'รอดำเนินการ' : 'ดำเนินการแล้ว'} {filteredFeedback.length} รายการ
                                {scopeFilter !== 'all' && ` · ${SCOPE_LABEL[scopeFilter] || scopeFilter}`}
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

                <div className="fb-status-tabs" role="tablist" aria-label="กรองตามสถานะการดำเนินการ">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={statusFilter === 'new'}
                        className={`fb-status-tab${statusFilter === 'new' ? ' active' : ''}`}
                        onClick={() => setStatusFilter('new')}
                    >
                        <Sparkles size={13} /> ใหม่
                        <span className="fb-status-tab-count">{newCount}</span>
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={statusFilter === 'resolved'}
                        className={`fb-status-tab${statusFilter === 'resolved' ? ' active' : ''}`}
                        onClick={() => setStatusFilter('resolved')}
                    >
                        <Check size={13} /> ดำเนินการแล้ว
                        <span className="fb-status-tab-count">{resolvedCount}</span>
                    </button>
                </div>

                <div className="table-scroll">
                    <table className="data-table">
                        <thead>
                            <tr>
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
                            {pagedFeedback.map((f) => {
                                const isNew = (f.status || 'new') === 'new';
                                return (
                                    <tr key={f._id}>
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
                            <p>
                                {feedback.length === 0
                                    ? 'ยังไม่มีคำแนะนำจากผู้ใช้งาน'
                                    : statusFilter === 'new'
                                      ? scopeFilter === 'all'
                                          ? 'ไม่มีคำแนะนำที่รอดำเนินการ — ตรวจสอบครบแล้วทุกรายการ'
                                          : `ไม่มีคำแนะนำที่รอดำเนินการในประเภท "${SCOPE_LABEL[scopeFilter] || scopeFilter}"`
                                      : scopeFilter === 'all'
                                        ? 'ยังไม่มีรายการที่ดำเนินการแล้ว'
                                        : `ยังไม่มีรายการที่ดำเนินการแล้วในประเภท "${SCOPE_LABEL[scopeFilter] || scopeFilter}"`}
                            </p>
                        </div>
                    )}
                </div>

                {filteredFeedback.length > 0 && (
                    <div className="admin-pagination">
                        <div className="fb-pagination-info">
                            <span className="admin-pagination-range">
                                แสดง {rangeStart} ถึง {rangeEnd} จาก {filteredFeedback.length} รายการ
                            </span>
                            <label className="fb-page-size">
                                แสดงหน้าละ
                                <select
                                    className="admin-group-filter"
                                    value={pageSize}
                                    onChange={(e) => setPageSize(Number(e.target.value))}
                                    aria-label="จำนวนรายการต่อหน้า"
                                >
                                    {PAGE_SIZE_OPTIONS.map((n) => (
                                        <option key={n} value={n}>
                                            {n}
                                        </option>
                                    ))}
                                </select>
                                รายการ
                            </label>
                        </div>
                        {totalPages > 1 && (
                            <div className="admin-pagination-controls">
                                <button
                                    type="button"
                                    className="admin-page-nav"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    aria-label="หน้าก่อนหน้า"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                {getPageNumbers(page, totalPages).map((p, idx) =>
                                    p === '...' ? (
                                        <span key={`ellipsis-${idx}`} className="admin-pagination-ellipsis">
                                            …
                                        </span>
                                    ) : (
                                        <button
                                            type="button"
                                            key={p}
                                            className={`admin-page-number${p === page ? ' active' : ''}`}
                                            onClick={() => setPage(p)}
                                            aria-current={p === page ? 'page' : undefined}
                                            aria-label={`หน้า ${p}`}
                                        >
                                            {p}
                                        </button>
                                    )
                                )}
                                <button
                                    type="button"
                                    className="admin-page-nav"
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    aria-label="หน้าถัดไป"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
