import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, CornerDownRight, MessageSquareText, Star } from 'lucide-react';
import { getMyFeedback } from './feedbackService';
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
            {isResolved ? 'แอดมินดำเนินการแก้ไขให้แล้ว' : 'รอผู้ดูแลระบบตรวจสอบ'}
        </span>
    );
}

// The signed-in user's own suggestions for ONE page (scope + refId), with the
// admin's reply and status. The API only ever returns the caller's own rows,
// so each user sees just their comments. Renders nothing until there is
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
        getMyFeedback({ scope, refId })
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

    return (
        <div className="my-fb" data-pdf-exclude>
            <div className="my-fb-title">
                <MessageSquareText size={16} aria-hidden="true" /> คำแนะนำที่คุณเคยส่งในหัวข้อนี้
            </div>
            {items.map((f) => (
                <div key={f._id} className="my-fb-item">
                    <div className="my-fb-meta">
                        <StatusBadge status={f.status} />
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
            ))}
        </div>
    );
}
