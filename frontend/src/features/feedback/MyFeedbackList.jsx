import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, CornerDownRight, MessageSquareText, Star } from 'lucide-react';
import { getTopicFeedback } from './feedbackService';
import { toTitleCase } from '../../shared/format/names';
import './myFeedback.css';

function formatDate(value) {
    return new Date(value).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
}

// Same new/resolved status the admin sets in AdminFeedbackTab, seen from the
// user's side: "resolved" means an admin has acted on the suggestion.
function StatusBadge({ status }) {
    const isResolved = status === 'resolved';
    const Icon = isResolved ? CheckCircle2 : Clock;
    return (
        <span className={`my-fb-status ${isResolved ? 'is-resolved' : 'is-pending'}`}>
            <Icon size={13} aria-hidden="true" />
            {isResolved ? 'แอดมินแก้ไขแล้ว' : 'รอผู้ดูแลระบบตรวจสอบ'}
        </span>
    );
}

// Every user's suggestions for ONE page (scope + refId), with the admin's
// reply and status, so colleagues can see what was already raised and answered.
// The caller's own rows are marked "คุณ". Renders nothing until there is
// something to show. Bump `reloadKey` after submitting to refresh the list.
export default function MyFeedbackList({ scope, refId, reloadKey = 0 }) {
    const [items, setItems] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!scope || !refId) {
            setItems([]);
            return undefined;
        }
        let cancelled = false;
        getTopicFeedback({ scope, refId })
            .then((data) => {
                if (cancelled) return;
                setItems(data);
                setError(null);
            })
            .catch((err) => {
                if (cancelled) return;
                setItems([]);
                setError(err.response?.data?.message || 'ไม่สามารถโหลดประวัติคำแนะนำได้');
            });
        return () => {
            cancelled = true;
        };
    }, [scope, refId, reloadKey]);

    if (error) return <p className="my-fb-error">{error}</p>;
    if (items.length === 0) return null;

    const pending = items.filter((f) => f.status !== 'resolved');
    const resolved = items.filter((f) => f.status === 'resolved');

    const renderItem = (f) => (
        <div key={f._id} className={`my-fb-item${f.status === 'resolved' ? ' is-resolved' : ''}`}>
            <div className="my-fb-meta">
                <span className="my-fb-author-group">
                    <span className={`my-fb-author${f.mine ? ' is-mine' : ''}`}>
                        {f.mine ? 'คุณ' : toTitleCase(f.authorName) || 'ผู้ใช้งาน'}
                    </span>
                    <StatusBadge status={f.status} />
                </span>
                <span className="my-fb-side">
                    {scope !== 'troubleshoot' && (
                        <span className="my-fb-rating">
                            <Star size={13} color="var(--nt-yellow)" fill="var(--nt-yellow)" />
                            {f.rating} / 5
                        </span>
                    )}
                    {formatDate(f.createdAt)}
                </span>
            </div>
            {f.comment && <p className="my-fb-comment">{f.comment}</p>}
            {f.adminComment && (
                <div className="my-fb-reply">
                    <span className="my-fb-reply-label">
                        <CornerDownRight size={14} aria-hidden="true" /> ผู้ดูแลระบบตอบกลับ
                        {f.adminCommentAt && (
                            <span className="my-fb-reply-date">{formatDate(f.adminCommentAt)}</span>
                        )}
                    </span>
                    <p>{f.adminComment}</p>
                </div>
            )}
        </div>
    );

    return (
        <div className="my-fb" data-pdf-exclude>
            <div className="my-fb-title">
                <MessageSquareText size={16} aria-hidden="true" /> คำแนะนำจากผู้ใช้งานในหัวข้อนี้
            </div>
            {pending.length > 0 && (
                <div className="my-fb-group">
                    <div className="my-fb-group-title is-pending">
                        <Clock size={14} aria-hidden="true" /> รอผู้ดูแลระบบตรวจสอบ ({pending.length})
                    </div>
                    {pending.map(renderItem)}
                </div>
            )}
            {resolved.length > 0 && (
                <div className="my-fb-group">
                    <div className="my-fb-group-title is-resolved">
                        <CheckCircle2 size={14} aria-hidden="true" /> แอดมินแก้ไขแล้ว ({resolved.length})
                    </div>
                    {resolved.map(renderItem)}
                </div>
            )}
        </div>
    );
}
