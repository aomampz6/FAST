import { useMemo, useState } from 'react';
import { useScoms } from './useScoms';
import { submitFeedback } from '../feedback/feedbackService';

export default function TroubleshootPage() {
    const { scoms, loading, error } = useScoms();
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [feedbackStatus, setFeedbackStatus] = useState(null);

    const groups = useMemo(() => {
        const set = new Set(scoms.map((s) => s.Group));
        return Array.from(set);
    }, [scoms]);

    const symptomsInGroup = useMemo(
        () => scoms.filter((s) => s.Group === selectedGroup),
        [scoms, selectedGroup]
    );

    function pickGroup(group) {
        setSelectedGroup(group);
        setSelectedItem(null);
        setFeedbackStatus(null);
    }

    function pickItem(item) {
        setSelectedItem(item);
        setFeedbackStatus(null);
    }

    async function handleFeedback(e) {
        e.preventDefault();
        setFeedbackStatus(null);
        try {
            await submitFeedback({
                scope: 'troubleshoot',
                refId: selectedItem._id,
                rating: Number(rating),
                comment,
            });
            setFeedbackStatus('ขอบคุณสำหรับคำแนะนำของคุณ');
            setComment('');
        } catch (err) {
            setFeedbackStatus(err.response?.data?.message || 'ไม่สามารถส่งคำแนะนำได้ กรุณาลองใหม่อีกครั้ง');
        }
    }

    if (loading) {
        return (
            <div className="page">
                <h2>ตรวจสอบและแก้ไขงานเสีย</h2>
                <div className="page-loading">
                    <div className="skeleton-line w-40" />
                    <div className="skeleton-line w-80" />
                    <div className="skeleton-line w-60" />
                </div>
            </div>
        );
    }
    if (error) return <div className="page error-banner">{error}</div>;

    return (
        <div className="page">
            <h2>ตรวจสอบและแก้ไขงานเสีย</h2>
            <div className="two-column">
                <div className="column">
                    <h3>หมวดหมู่อาการเสีย</h3>
                    <ul className="pick-list">
                        {groups.map((g) => (
                            <li key={g}>
                                <button
                                    className={g === selectedGroup ? 'active' : ''}
                                    onClick={() => pickGroup(g)}
                                >
                                    {g}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                {selectedGroup && (
                    <div className="column">
                        <h3>อาการที่พบใน {selectedGroup}</h3>
                        <ul className="pick-list">
                            {symptomsInGroup.map((item) => (
                                <li key={item._id}>
                                    <button
                                        className={item._id === selectedItem?._id ? 'active' : ''}
                                        onClick={() => pickItem(item)}
                                    >
                                        {item.Symptom || item.Scoms}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {selectedItem && (
                    <div className="column detail-column">
                        <h3>{selectedItem.Symptom || selectedItem.Scoms}</h3>
                        <p>
                            <strong>อุปกรณ์:</strong> {selectedItem.Equipment}
                        </p>
                        <p>
                            <strong>จุดที่ต้องเช็คจุดแรก:</strong> {selectedItem.CheckPoint}
                        </p>
                        <p>
                            <strong>ลำดับขั้นตอนการแก้ไขปัญหา:</strong>
                        </p>
                        <pre className="steps-block">{selectedItem.Steps}</pre>
                        <p>
                            <strong>ค่ามาตรฐานปกติ:</strong> {selectedItem.NormalValue}
                        </p>

                        <form className="feedback-form" onSubmit={handleFeedback}>
                            <h4>คำแนะนำเพิ่มเติมจากผู้ใช้งาน</h4>
                            <label>
                                ให้คะแนนความช่วยเหลือ
                                <select value={rating} onChange={(e) => setRating(e.target.value)}>
                                    {[1, 2, 3, 4, 5].map((n) => (
                                        <option key={n} value={n}>
                                            {n}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                ความคิดเห็นเพิ่มเติม
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="ระบุคำแนะนำ ข้อเสนอแนะ หรือรายละเอียดเพิ่มเติม"
                                />
                            </label>
                            <button type="submit">ส่งคำแนะนำ / บันทึกข้อมูล</button>
                            {feedbackStatus && <p className="feedback-status">{feedbackStatus}</p>}
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
