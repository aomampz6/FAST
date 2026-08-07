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
            setFeedbackStatus('Thanks for your feedback!');
            setComment('');
        } catch (err) {
            setFeedbackStatus(err.response?.data?.message || 'Failed to submit feedback');
        }
    }

    if (loading) return <div className="page">Loading...</div>;
    if (error) return <div className="page error-banner">{error}</div>;

    return (
        <div className="page">
            <h2>Troubleshoot</h2>
            <div className="two-column">
                <div className="column">
                    <h3>Groups</h3>
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
                        <h3>Symptoms in {selectedGroup}</h3>
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
                            <strong>Equipment:</strong> {selectedItem.Equipment}
                        </p>
                        <p>
                            <strong>Check Point:</strong> {selectedItem.CheckPoint}
                        </p>
                        <p>
                            <strong>Steps:</strong>
                        </p>
                        <pre className="steps-block">{selectedItem.Steps}</pre>
                        <p>
                            <strong>Normal Value:</strong> {selectedItem.NormalValue}
                        </p>

                        <form className="feedback-form" onSubmit={handleFeedback}>
                            <h4>Was this helpful?</h4>
                            <label>
                                Rating
                                <select value={rating} onChange={(e) => setRating(e.target.value)}>
                                    {[1, 2, 3, 4, 5].map((n) => (
                                        <option key={n} value={n}>
                                            {n}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                Comment
                                <textarea value={comment} onChange={(e) => setComment(e.target.value)} />
                            </label>
                            <button type="submit">Submit feedback</button>
                            {feedbackStatus && <p className="feedback-status">{feedbackStatus}</p>}
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
