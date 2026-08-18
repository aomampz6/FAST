import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, MessageCircle, Send, Settings, X } from 'lucide-react';
import { useOnuConfigs } from './useOnuConfigs';
import { getOnuImageUrl } from './onuConfigsService';
import { OnuBrandIcon } from './onuBrandIcons';
import { useGuides } from '../guides/useGuides';
import { readGuide } from '../guides/guidesService';
import { submitFeedback } from '../feedback/feedbackService';
import { useFirstFeedbackGate } from '../../shared/hooks/useFirstFeedbackGate';

function slug(value) {
    return String(value || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

export default function OnuSetupPage() {
    const navigate = useNavigate();
    const { configs, loading, error } = useOnuConfigs();
    const { guides } = useGuides();
    const { isRequired, markDone } = useFirstFeedbackGate();

    const [selectedBrand, setSelectedBrand] = useState(null);
    const [selectedMode, setSelectedMode] = useState(null);
    const [guideContent, setGuideContent] = useState(null);
    const [lightboxSrc, setLightboxSrc] = useState(null);

    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [feedbackRequired, setFeedbackRequired] = useState(false);
    const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
    const [feedbackStatus, setFeedbackStatus] = useState(null);
    const [gateShake, setGateShake] = useState(false);

    // The backend `/onu-configs` list endpoint returns every record regardless
    // of role (see onuConfigs.controller.js `list`), so — same as
    // archive/app.js's `loadOnuConfigsFromAPI` — admin-hidden records are
    // filtered out here on the client for the end-user flow.
    const visibleConfigs = useMemo(() => configs.filter((c) => !c.Hidden), [configs]);

    const brands = useMemo(() => {
        const set = new Set(visibleConfigs.map((c) => c.Brand).filter(Boolean));
        return Array.from(set).sort((a, b) => a.localeCompare(b));
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

    // Recompute the first-time gate whenever a new config detail is opened —
    // mirrors archive/app.js calling needsFirstFeedback() at the top of
    // showOnuConfigDetails() every time it renders.
    useEffect(() => {
        if (selectedMode) {
            setFeedbackRequired(isRequired());
            setFeedbackSubmitted(false);
            setFeedbackStatus(null);
            setComment('');
            setRating(5);
            setGateShake(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedMode]);

    function pickBrand(brand) {
        setSelectedBrand(brand);
        setSelectedMode(null);
    }

    function backToBrandSelection() {
        setSelectedBrand(null);
        setSelectedMode(null);
    }

    function pickMode(mode) {
        setSelectedMode(mode);
    }

    function closeDetail() {
        if (feedbackRequired) return;
        setSelectedMode(null);
    }

    async function handleFeedback(e) {
        e.preventDefault();

        if (feedbackRequired && !comment.trim()) {
            setGateShake(true);
            setTimeout(() => setGateShake(false), 500);
            return;
        }

        try {
            await submitFeedback({
                scope: 'onu-setup',
                refId: selectedMode._id,
                rating: Number(rating),
                comment,
            });

            setComment('');
            setFeedbackSubmitted(true);

            if (feedbackRequired) {
                // The button label itself switches to "บันทึกข้อมูลแล้ว" below —
                // no separate status line needed for the gated first-time case.
                markDone();
                setFeedbackRequired(false);
            } else {
                setFeedbackStatus('ขอบคุณสำหรับคำแนะนำของคุณ');
            }
        } catch (err) {
            setFeedbackStatus(err.response?.data?.message || 'ไม่สามารถส่งคำแนะนำได้ กรุณาลองใหม่อีกครั้ง');
        }
    }

    if (loading) {
        return (
            <div className="page">
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
            <div className="mb-4">
                <button type="button" className="back-btn" onClick={() => navigate('/')}>
                    <ArrowLeft size={20} /> กลับหน้าหลัก
                </button>
            </div>

            {!selectedBrand && (
                <div className="card mb-6">
                    <h3 className="mb-4">เลือกยี่ห้ออุปกรณ์ (Brand)</h3>
                    <div className="options-grid">
                        {brands.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)', gridColumn: '1 / -1' }}>
                                ยังไม่มีข้อมูลการตั้งค่า ONU ในระบบ
                            </p>
                        ) : (
                            brands.map((brand) => (
                                <button
                                    type="button"
                                    key={brand}
                                    className="option-btn brand-card"
                                    onClick={() => pickBrand(brand)}
                                >
                                    <div className="brand-icon-wrapper">
                                        <OnuBrandIcon brand={brand} />
                                    </div>
                                    <span>{brand}</span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}

            {selectedBrand && (
                <>
                    <div className="mb-4">
                        <button type="button" className="back-btn" onClick={backToBrandSelection}>
                            <ArrowLeft size={20} /> กลับหน้าเลือกยี่ห้ออุปกรณ์
                        </button>
                    </div>

                    <h3 className="mb-4">ตั้งค่า {selectedBrand} ONU</h3>

                    {modesForBrand.length > 0 ? (
                        <div className="step-flow">
                            <nav className="step-sidebar" aria-label="เลือกโหมดการใช้งาน">
                                {modesForBrand.map((c, i) => (
                                    <button
                                        type="button"
                                        key={c._id}
                                        className={`step-sidebar-btn${selectedMode?._id === c._id ? ' active' : ''}`}
                                        onClick={() => pickMode(c)}
                                    >
                                        <span className="step-sidebar-badge">{i + 1}</span>
                                        <span className="step-sidebar-label">{c.Mode}</span>
                                    </button>
                                ))}
                            </nav>

                            {selectedMode ? (
                                <div className="step-panel">
                                    <div className="step-panel-header">
                                        <span className="step-panel-badge">
                                            <Settings size={16} />
                                        </span>
                                        <h4 className="step-panel-title">
                                            {selectedMode.Brand} — {selectedMode.Mode}
                                        </h4>
                                        {!feedbackRequired && (
                                            <button
                                                type="button"
                                                className="icon-btn"
                                                style={{ marginLeft: 'auto' }}
                                                onClick={closeDetail}
                                                aria-label="ปิด"
                                            >
                                                <X size={18} />
                                            </button>
                                        )}
                                    </div>

                                    {guideContent && (
                                        <div
                                            style={{
                                                marginBottom: 16,
                                                borderRadius: 'var(--radius-md)',
                                                overflow: 'hidden',
                                                border: '1px solid var(--border-color)',
                                                boxShadow: 'var(--shadow-sm)',
                                            }}
                                        >
                                            <iframe
                                                title="คู่มือการตั้งค่า"
                                                srcDoc={guideContent}
                                                style={{
                                                    width: '100%',
                                                    height: 'clamp(480px, 85vh, 720px)',
                                                    border: 'none',
                                                    display: 'block',
                                                }}
                                                loading="lazy"
                                            />
                                        </div>
                                    )}

                                    <p className="step-panel-desc" style={{ whiteSpace: 'pre-wrap' }}>
                                        {selectedMode.Details}
                                    </p>

                                    {selectedMode.Images?.length > 0 && (
                                        <div className="onu-detail-images">
                                            {selectedMode.Images.map((img) => (
                                                <img
                                                    key={img._id || img.key}
                                                    src={getOnuImageUrl(img.key)}
                                                    alt={`${selectedMode.Brand} ${selectedMode.Mode}`}
                                                    onClick={() => setLightboxSrc(getOnuImageUrl(img.key))}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    <div className="feedback-panel" style={{ marginTop: 20 }}>
                                        <div className="feedback-section">
                                            <div className="feedback-label">
                                                <MessageCircle size={16} /> คำแนะนำเพิ่มเติมจากผู้ใช้งาน{' '}
                                                {feedbackRequired ? (
                                                    <span className="feedback-required-label">
                                                        * จำเป็นสำหรับการใช้งานครั้งแรก
                                                    </span>
                                                ) : (
                                                    <span className="feedback-optional-label">(ไม่บังคับ)</span>
                                                )}
                                            </div>
                                            <form onSubmit={handleFeedback}>
                                                <label
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 8,
                                                        color: 'var(--text-secondary)',
                                                        fontSize: 13,
                                                        marginBottom: 10,
                                                    }}
                                                >
                                                    ให้คะแนนความช่วยเหลือ
                                                    <select value={rating} onChange={(e) => setRating(e.target.value)}>
                                                        {[1, 2, 3, 4, 5].map((n) => (
                                                            <option key={n} value={n}>
                                                                {n}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </label>
                                                <textarea
                                                    className={`feedback-textarea${gateShake ? ' gate-shake' : ''}`}
                                                    required={feedbackRequired}
                                                    value={comment}
                                                    onChange={(e) => setComment(e.target.value)}
                                                    placeholder="ระบุคำแนะนำ ข้อเสนอแนะ หรือรายละเอียดเพิ่มเติม เช่น ทำตามขั้นตอนแล้วอาการยังไม่ดีขึ้น พบว่าไฟกระพริบที่ช่อง WAN..."
                                                />
                                                <button
                                                    type="submit"
                                                    className="feedback-submit-btn"
                                                    disabled={feedbackSubmitted && !feedbackRequired}
                                                >
                                                    {feedbackSubmitted ? (
                                                        <span>บันทึกข้อมูลแล้ว</span>
                                                    ) : (
                                                        <>
                                                            <span>ส่งคำแนะนำ / บันทึกข้อมูล</span> <Send size={18} />
                                                        </>
                                                    )}
                                                </button>
                                                {feedbackStatus && <p className="feedback-status">{feedbackStatus}</p>}
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="step-panel step-empty">
                                    <Info size={24} style={{ opacity: 0.6 }} />
                                    <span>เลือกโหมดด้านซ้ายเพื่อดูรายละเอียดการตั้งค่า</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p style={{ color: 'var(--text-secondary)' }}>ยังไม่มีข้อมูลการตั้งค่าสำหรับยี่ห้อนี้</p>
                    )}
                </>
            )}

            {lightboxSrc && (
                <div
                    onClick={() => setLightboxSrc(null)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.85)',
                        zIndex: 10000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 24,
                        cursor: 'zoom-out',
                    }}
                >
                    <img
                        src={lightboxSrc}
                        alt=""
                        style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8, boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}
                    />
                </div>
            )}
        </div>
    );
}
