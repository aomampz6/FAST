import { useEffect, useMemo, useState } from 'react';
import { useOnuConfigs } from './useOnuConfigs';
import { getOnuImageUrl } from './onuConfigsService';
import { useGuides } from '../guides/useGuides';
import { readGuide } from '../guides/guidesService';
import { submitFeedback } from '../feedback/feedbackService';

function slug(value) {
    return String(value || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

export default function OnuSetupPage() {
    const { configs, loading, error } = useOnuConfigs();
    const { guides } = useGuides();
    const [selectedBrand, setSelectedBrand] = useState(null);
    const [selectedMode, setSelectedMode] = useState(null);
    const [guideContent, setGuideContent] = useState(null);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [feedbackStatus, setFeedbackStatus] = useState(null);

    const visibleConfigs = useMemo(() => configs.filter((c) => !c.Hidden), [configs]);

    const brands = useMemo(() => {
        const set = new Set(visibleConfigs.map((c) => c.Brand));
        return Array.from(set);
    }, [visibleConfigs]);

    const modesForBrand = useMemo(
        () => visibleConfigs.filter((c) => c.Brand === selectedBrand),
        [visibleConfigs, selectedBrand]
    );

    const matchedGuide = useMemo(() => {
        if (!selectedMode) return null;
        const candidate1 = `${slug(selectedMode.Brand)}-${slug(selectedMode.Mode)}.html`;
        const candidate2 = `${slug(selectedMode.Mode)}.html`;
        return guides.find((g) => g.filename === candidate1 || g.filename === candidate2) || null;
    }, [guides, selectedMode]);

    useEffect(() => {
        setGuideContent(null);
        if (matchedGuide) {
            readGuide(matchedGuide.filename)
                .then((data) => setGuideContent(data.content))
                .catch(() => setGuideContent(null));
        }
    }, [matchedGuide]);

    function pickBrand(brand) {
        setSelectedBrand(brand);
        setSelectedMode(null);
        setFeedbackStatus(null);
    }

    function pickMode(mode) {
        setSelectedMode(mode);
        setFeedbackStatus(null);
    }

    async function handleFeedback(e) {
        e.preventDefault();
        setFeedbackStatus(null);
        try {
            await submitFeedback({
                scope: 'onu-setup',
                refId: selectedMode._id,
                rating: Number(rating),
                comment,
            });
            setFeedbackStatus('Thanks for your feedback!');
            setComment('');
        } catch (err) {
            setFeedbackStatus(err.response?.data?.message || 'Failed to submit feedback');
        }
    }

    if (loading) {
        return (
            <div className="page">
                <h2>ONU Setup</h2>
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
            <h2>ONU Setup</h2>
            <div className="two-column">
                <div className="column">
                    <h3>Brands</h3>
                    <ul className="pick-list">
                        {brands.map((b) => (
                            <li key={b}>
                                <button className={b === selectedBrand ? 'active' : ''} onClick={() => pickBrand(b)}>
                                    {b}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                {selectedBrand && (
                    <div className="column">
                        <h3>Modes for {selectedBrand}</h3>
                        <ul className="pick-list">
                            {modesForBrand.map((m) => (
                                <li key={m._id}>
                                    <button
                                        className={m._id === selectedMode?._id ? 'active' : ''}
                                        onClick={() => pickMode(m)}
                                    >
                                        {m.Mode}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {selectedMode && (
                    <div className="column detail-column">
                        <h3>{selectedMode.Brand} - {selectedMode.Mode}</h3>
                        <pre className="steps-block">{selectedMode.Details}</pre>

                        {selectedMode.Images?.length > 0 && (
                            <div className="image-gallery">
                                {selectedMode.Images.map((img) => (
                                    <img key={img._id || img.key} src={getOnuImageUrl(img.key)} alt={img.originalName || 'ONU config'} />
                                ))}
                            </div>
                        )}

                        {guideContent && (
                            <div className="guide-frame-wrap">
                                <h4>Guide</h4>
                                <iframe title="Setup guide" className="guide-frame" srcDoc={guideContent} />
                            </div>
                        )}

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
