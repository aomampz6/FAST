import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import DOMPurify from 'dompurify';
import {
    ArrowLeft,
    BookOpen,
    Cable,
    ClipboardList,
    Info,
    MessageCircle,
    Route,
    Send,
    Settings,
    ShieldCheck,
    X,
} from 'lucide-react';
import { useOnuConfigs } from './useOnuConfigs';
import { getOnuImageUrl } from './onuConfigsService';
import { OnuBrandIcon } from './onuBrandIcons';
import { useModeTopics } from './useModeTopics';
import { useGuides } from '../guides/useGuides';
import { readGuide } from '../guides/guidesService';
import { submitFeedback } from '../feedback/feedbackService';
import { useFirstFeedbackGate } from '../../shared/hooks/useFirstFeedbackGate';
import { RoleGate } from '../../shared/auth/access';
import SuccessPopup from '../../components/SuccessPopup';
import ImageZoomModal from '../../components/ImageZoomModal';
import '../admin/richTextEditor.css';

function slug(value) {
    return String(value || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

// Best-effort icon per topic name so the topic list reads like the reference
// doc's per-section icons, without needing a dedicated "icon" field on every
// admin-entered Mode.
function getTopicIcon(modeName) {
    const m = String(modeName || '').toLowerCase();
    if (m.includes('login') || m.includes('เตรียม')) return ClipboardList;
    if (m.includes('bridge') || m.includes('บริดจ์')) return Cable;
    if (m.includes('route') || m.includes('pppoe') || m.includes('เราท์')) return Route;
    if (m.includes('tr069') || m.includes('acs')) return Settings;
    if (m.includes('wan') || m.includes('access') || m.includes('security')) return ShieldCheck;
    return BookOpen;
}

// Shared by both the ONU and the ATA setup routes — same config collection,
// same admin CRUD, just scoped by `DeviceType` so the two device families
// don't show up mixed together in either page's brand/model/mode picker.
//
// Two-step flow:
//   'home'   — hero + one card per brand (description + pickable Model chips)
//   'detail' — two columns: the picked Model's Mode (topic) list on the
//              left, the selected topic's content on the right
export default function OnuSetupPage({ deviceType = 'ONU' }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const { configs, loading, error } = useOnuConfigs();
    const { topics: modeTopics } = useModeTopics();
    const { guides } = useGuides();
    const { isRequired, markDone } = useFirstFeedbackGate();

    const [stage, setStage] = useState('home');
    const [selectedBrand, setSelectedBrand] = useState(null);
    const [selectedModel, setSelectedModel] = useState(null);
    const [selectedMode, setSelectedMode] = useState(null);
    const [guideContent, setGuideContent] = useState(null);
    const [lightboxSrc, setLightboxSrc] = useState(null);

    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [feedbackRequired, setFeedbackRequired] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [successOpen, setSuccessOpen] = useState(false);
    const [feedbackStatus, setFeedbackStatus] = useState(null);
    const [gateShake, setGateShake] = useState(false);

    // The backend `/onu-configs` list endpoint returns every record regardless
    // of role (see onuConfigs.controller.js `list`), so — same as
    // archive/app.js's `loadOnuConfigsFromAPI` — admin-hidden records are
    // filtered out here on the client for the end-user flow. Records without
    // a DeviceType predate the field and default to ONU.
    const visibleConfigs = useMemo(
        () => configs.filter((c) => !c.Hidden && (c.DeviceType || 'ONU') === deviceType),
        [configs, deviceType]
    );

    const brands = useMemo(() => {
        const set = new Set(visibleConfigs.map((c) => c.Brand).filter(Boolean));
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [visibleConfigs]);

    // Per-brand summary driving both the home cards and the catalog page:
    // `modes` (distinct topic names, for the home card description) and
    // `models` (distinct Model numbers, for both the home card badges and
    // the catalog's pickable model chips) — both derived from whatever the
    // admin has entered. Records without a Model (from before it was
    // required) simply don't contribute a model — fix the record's Model in
    // admin to make it reachable again.
    const brandGroups = useMemo(() => {
        const map = {};
        visibleConfigs.forEach((c) => {
            if (!c.Brand) return;
            if (!map[c.Brand]) map[c.Brand] = { modes: new Set(), models: new Set() };
            if (c.Mode) map[c.Brand].modes.add(c.Mode);
            if (c.Model && c.Model.trim()) map[c.Brand].models.add(c.Model.trim());
        });
        const result = {};
        Object.entries(map).forEach(([brand, group]) => {
            result[brand] = {
                modes: Array.from(group.modes),
                models: Array.from(group.models).sort((a, b) => a.localeCompare(b, 'en', { numeric: true })),
            };
        });
        return result;
    }, [visibleConfigs]);

    // The admin's manually-curated topic order (AdminOnuConfigsTab's
    // "จัดการหัวข้อการตั้งค่า" panel) — label → Order, scoped to this route's
    // device type. Anything not in it (legacy free-text Modes) sorts after
    // everything managed, alphabetically among themselves.
    const topicOrderByLabel = useMemo(() => {
        const map = {};
        modeTopics
            .filter((t) => (t.DeviceType || 'ONU') === deviceType)
            .forEach((t) => {
                map[t.Label] = t.Order ?? 0;
            });
        return map;
    }, [modeTopics, deviceType]);

    // Topic (Mode) list shown once a Brand + Model are both picked.
    const topicsForSelection = useMemo(() => {
        if (!selectedBrand || !selectedModel) return [];
        return visibleConfigs
            .filter((c) => c.Brand === selectedBrand && (c.Model || '').trim() === selectedModel)
            .slice()
            .sort((a, b) => {
                const orderA = topicOrderByLabel[a.Mode] ?? Number.MAX_SAFE_INTEGER;
                const orderB = topicOrderByLabel[b.Mode] ?? Number.MAX_SAFE_INTEGER;
                if (orderA !== orderB) return orderA - orderB;
                return (a.Mode || '').localeCompare(b.Mode || '', 'th');
            });
    }, [visibleConfigs, selectedBrand, selectedModel, topicOrderByLabel]);

    // `?ref=<config id>` opens that brand + model + mode directly — the admin
    // feedback tab links here so a suggestion can be read next to the content
    // it is about. Consumed once, then dropped from the URL, so moving around
    // the page afterwards doesn't keep snapping back to it.
    useEffect(() => {
        const ref = searchParams.get('ref');
        if (!ref || visibleConfigs.length === 0) return;

        const target = visibleConfigs.find((c) => String(c._id) === ref);
        if (target) {
            setSelectedBrand(target.Brand);
            setSelectedModel((target.Model || '').trim());
            setSelectedMode(target);
            setStage('detail');
        }

        const next = new URLSearchParams(searchParams);
        next.delete('ref');
        setSearchParams(next, { replace: true });
    }, [visibleConfigs, searchParams, setSearchParams]);

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
            setFeedbackStatus(null);
            setComment('');
            setRating(5);
            setGateShake(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedMode]);

    // Step 1 → 2: picking a Model chip within a brand card opens its topic list.
    function pickModel(brand, model) {
        setSelectedBrand(brand);
        setSelectedModel(model);
        setSelectedMode(null);
        setStage('detail');
    }

    // From the topic list — opens the actual setup content.
    function pickTopic(topic) {
        setSelectedMode(topic);
    }

    function backToHome() {
        setStage('home');
        setSelectedBrand(null);
        setSelectedModel(null);
        setSelectedMode(null);
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

        setSubmitting(true);
        try {
            await submitFeedback({
                scope: `${deviceType.toLowerCase()}-setup`,
                refId: selectedMode._id,
                rating: Number(rating),
                comment,
            });

            setComment('');
            if (feedbackRequired) {
                markDone();
                setFeedbackRequired(false);
            }
            setSuccessOpen(true);
        } catch (err) {
            setFeedbackStatus(err.response?.data?.message || 'ไม่สามารถส่งคำแนะนำได้ กรุณาลองใหม่อีกครั้ง');
        } finally {
            setSubmitting(false);
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
            {stage === 'detail' && (
                <div className="mb-4">
                    <button type="button" className="back-btn" onClick={backToHome}>
                        <ArrowLeft size={20} /> กลับหน้าเลือกยี่ห้อ/รุ่นอุปกรณ์
                    </button>
                </div>
            )}

            {stage === 'home' && (
                <>
                    <div className="card text-center mb-6">
                        <div className="hero-icon-wrapper">
                            <BookOpen className="hero-icon" />
                        </div>
                        <h1 className="hero-title">คู่มือการตั้งค่าอุปกรณ์ปลายทาง</h1>
                        <p className="hero-desc">
                            ศูนย์รวมคู่มือการตั้งค่าอุปกรณ์ {deviceType} สำหรับโครงข่าย National Telecom (ระบบ FAST)
                        </p>
                    </div>

                    <h3 className="mb-4">เลือกแบรนด์และรุ่นอุปกรณ์ที่ต้องการตั้งค่า</h3>
                    <div className="brand-guide-grid">
                        {brands.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)', gridColumn: '1 / -1' }}>
                                ยังไม่มีข้อมูลการตั้งค่า {deviceType} ในระบบ
                            </p>
                        ) : (
                            brands.map((brand) => {
                                const summary = brandGroups[brand] || { modes: [], models: [] };
                                return (
                                    <div className="brand-guide-card" key={brand}>
                                        <div className="brand-guide-icon">
                                            <OnuBrandIcon brand={brand} />
                                        </div>
                                        <div className="brand-guide-info">
                                            <h3 className="brand-guide-title">{brand}</h3>
                                            <p className="brand-guide-desc">
                                                {summary.modes.length > 0
                                                    ? `ดูวิธีการตั้งค่า ${summary.modes.join(', ')} สำหรับอุปกรณ์ ${brand} ทุกรุ่น`
                                                    : `ดูวิธีการตั้งค่าอุปกรณ์ ${brand} ${deviceType} ทุกรุ่น`}
                                            </p>
                                            {summary.models.length > 0 ? (
                                                <div className="brand-guide-badges">
                                                    {summary.models.map((model) => (
                                                        <button
                                                            type="button"
                                                            className="brand-guide-badge"
                                                            key={model}
                                                            onClick={() => pickModel(brand, model)}
                                                        >
                                                            {model}
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="guide-empty-note">ยังไม่มีข้อมูลรุ่นสำหรับยี่ห้อนี้</p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </>
            )}

            {stage === 'detail' && (
                <div className="guide-shell">
                    <nav className="guide-sidebar" aria-label="เมนูหัวข้อการตั้งค่า">
                        <p className="guide-sidebar-label">แบรนด์อุปกรณ์</p>
                        <div className="guide-accordion active">
                            <div className="guide-accordion-header guide-accordion-header-static">
                                <span className="guide-accordion-icon">
                                    <OnuBrandIcon brand={selectedBrand} />
                                </span>
                                <span className="guide-accordion-title">
                                    {selectedBrand} {deviceType}
                                    {selectedModel ? ` — ${selectedModel}` : ''}
                                </span>
                            </div>
                            <div className="guide-accordion-body">
                                <p className="guide-sidebar-sublabel">Mode (หัวข้อการตั้งค่า)</p>
                                {topicsForSelection.length === 0 ? (
                                    <p className="guide-empty-note">ยังไม่มีข้อมูลการตั้งค่าสำหรับรุ่นนี้</p>
                                ) : (
                                    topicsForSelection.map((topic) => {
                                        const TopicIcon = getTopicIcon(topic.Mode);
                                        return (
                                            <button
                                                type="button"
                                                key={topic._id}
                                                className={`guide-sub-link${selectedMode?._id === topic._id ? ' active' : ''}`}
                                                onClick={() => pickTopic(topic)}
                                            >
                                                <TopicIcon size={14} /> {topic.Mode}
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </nav>

                    <div className="guide-main">
                        {!selectedMode ? (
                            <div className="step-panel step-empty">
                                <Info size={24} style={{ opacity: 0.6 }} />
                                <span>เลือกหัวข้อการตั้งค่าทางด้านซ้ายเพื่อดูรายละเอียด</span>
                            </div>
                        ) : (
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

                                <div
                                    className="step-panel-desc rich-text-content"
                                    style={{ whiteSpace: 'pre-wrap' }}
                                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedMode.Details || '') }}
                                    onClick={(e) => {
                                        if (e.target.tagName === 'IMG') setLightboxSrc(e.target.src);
                                    }}
                                />

                                {selectedMode.Images?.length > 0 && (
                                    <RoleGate allow={['admin']}>
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
                                    </RoleGate>
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
                                            <button type="submit" className="feedback-submit-btn" disabled={submitting}>
                                                <span>ส่งคำแนะนำ / บันทึกข้อมูล</span> <Send size={18} />
                                            </button>
                                            {feedbackStatus && <p className="feedback-status">{feedbackStatus}</p>}
                                        </form>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <ImageZoomModal src={lightboxSrc} onClose={() => setLightboxSrc(null)} />

            <SuccessPopup open={successOpen} message="ส่งคำแนะนำเรียบร้อยแล้ว" onClose={() => setSuccessOpen(false)} />
        </div>
    );
}
