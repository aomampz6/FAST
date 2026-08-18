import { useMemo, useRef, useState } from 'react';
import {
    AlertCircle,
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    Check,
    Gauge,
    Globe,
    Info,
    LayoutGrid,
    Lightbulb,
    Mail,
    MessageCircle,
    Network,
    PhoneCall,
    Power,
    Router,
    SatelliteDish,
    Search,
    Wifi,
    WifiOff,
    Wrench,
    ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useScoms } from './useScoms';
import { submitFeedback } from '../feedback/feedbackService';
import { useAuth } from '../../shared/auth/AuthContext';
import BottomSheet from '../../components/BottomSheet';

// Emoji cycle used on each numbered step card — matches archive/app.js STEP_EMOJI.
const STEP_EMOJI = ['🔍', '🔌', '📦', '🧵', '🛠️', '📶', '⚙️'];

// Per-group icon/color heuristic — mirrors archive/app.js window.initTroubleshootFlow exactly
// (same substring checks, same fallback order, same colors).
function getGroupVisual(groupName) {
    const nameLower = (groupName || '').toLowerCase();
    if (nameLower.includes('disconnect')) return { Icon: Network, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
    if (nameLower.includes('connect')) return { Icon: WifiOff, color: '#f97316', bg: 'rgba(249, 115, 22, 0.1)' };
    if (nameLower.includes('speed')) return { Icon: Gauge, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' };
    if (nameLower.includes('กระพริบ')) return { Icon: Lightbulb, color: '#eab308', bg: 'rgba(234, 179, 8, 0.1)' };
    if (nameLower.includes('web')) return { Icon: Globe, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' };
    if (nameLower.includes('mail')) return { Icon: Mail, color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.1)' };
    if (nameLower.includes('ip-phone') || nameLower.includes('โทร'))
        return { Icon: PhoneCall, color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' };
    if (nameLower.includes('ไม่ติด')) return { Icon: Power, color: '#475569', bg: 'rgba(71, 85, 105, 0.1)' };
    return { Icon: Wrench, color: '#14b8a6', bg: 'rgba(20, 184, 166, 0.1)' };
}

// Header banner label/icon/color for the symptom-list view, plus whether the
// group should render LED status visuals — mirrors archive/app.js
// window.showTroubleshootGroup exactly.
function getGroupHeaderMeta(groupName) {
    const nameLower = (groupName || '').toLowerCase();
    if (nameLower.includes('ไฟ') || nameLower.includes('pon') || nameLower.includes('dsl')) {
        return { label: 'ROUTER STATUS', Icon: Router, color: '#94a3b8', isLed: true };
    }
    if (nameLower.includes('disconnect')) return { label: 'CONNECTION', Icon: Network, color: '#ef4444', isLed: false };
    if (nameLower.includes('connect')) return { label: 'INTERNET ACCESS', Icon: WifiOff, color: '#f97316', isLed: false };
    if (nameLower.includes('speed')) return { label: 'SPEED TEST', Icon: Gauge, color: '#8b5cf6', isLed: false };
    if (nameLower.includes('web')) return { label: 'WEB ACCESS', Icon: Globe, color: '#3b82f6', isLed: false };
    if (nameLower.includes('mail')) return { label: 'MAIL', Icon: Mail, color: '#0ea5e9', isLed: false };
    if (nameLower.includes('ip-phone') || nameLower.includes('โทร'))
        return { label: 'IP-PHONE', Icon: PhoneCall, color: '#22c55e', isLed: false };
    if (nameLower.includes('อื่น')) return { label: 'OTHER CASE', Icon: AlertCircle, color: '#94a3b8', isLed: false };
    return { label: 'อาการที่พบ', Icon: Wrench, color: '#14b8a6', isLed: false };
}

// Determines LED (PWR/PON-or-ADSL/INT) states + header icon/color/subtitle override
// for a single symptom card — mirrors archive/app.js's inline logic in
// window.showTroubleshootGroup (the isLedCategory branch) 1:1.
function getLedState(item, groupName, baseHeaderIcon, baseHeaderColor) {
    const sym = item.Symptom || 'ไม่ระบุอาการ';
    const lowerSym = sym.toLowerCase();
    let subtitle = item.Scoms || '';
    let headerIcon = baseHeaderIcon;
    let headerColor = baseHeaderColor;

    let pwr = { className: 'led-green', text: 'PWR', textBg: 'transparent', textColor: '#94a3b8' };
    let mid = { className: 'led-green', text: 'PON', textBg: 'transparent', textColor: '#94a3b8' };
    let intLed = { className: 'led-off', text: 'INT', textBg: 'transparent', textColor: '#475569' };

    const searchText = `${lowerSym} ${groupName.toLowerCase()} ${subtitle.toLowerCase()}`;

    if (searchText.includes('adsl') || searchText.includes('dsl')) {
        mid.text = 'ADSL';
    }

    if (searchText.includes('los')) {
        headerIcon = AlertTriangle;
        headerColor = '#ef4444';
        mid = { className: 'led-red-blink', text: 'LOS', textBg: '#450a0a', textColor: '#fca5a5' };
        subtitle = subtitle || 'สายเคเบิลมีปัญหา / สัญญาณขาด';
    } else if (
        searchText.includes('pon กระพริบ') ||
        searchText.includes('pon ติดกระพริบ') ||
        searchText.includes('adsl กระพริบ') ||
        searchText.includes('dsl กระพริบ')
    ) {
        headerIcon = SatelliteDish;
        headerColor = '#eab308';
        mid = { ...mid, className: 'led-yellow-blink', textBg: '#422006', textColor: '#fde047' };
        subtitle = subtitle || 'กำลังตรวจสอบสัญญาณ';
    } else if (
        searchText.includes('pon ไม่ติด') ||
        searchText.includes('dsl ไม่ติด') ||
        searchText.includes('adsl ไม่ติด') ||
        searchText.includes('ไม่มีสัญญาณ')
    ) {
        headerIcon = AlertCircle;
        headerColor = '#ef4444';
        mid = { ...mid, className: 'led-off', textBg: '#450a0a', textColor: '#fca5a5' };
        subtitle = subtitle || 'ไม่มีสัญญาณ / สายขาด';
    } else if (
        searchText.includes('internet ไม่ติด') ||
        searchText.includes('เข้าใช้งาน internet ไม่ได้') ||
        searchText.includes('เข้าเว็บไม่ได้')
    ) {
        headerIcon = Wifi;
        headerColor = '#94a3b8';
        intLed = { ...intLed, className: 'led-off', textBg: '#450a0a', textColor: '#fca5a5' };
        subtitle = subtitle || 'แต่ไฟ PON ติดค้างสีเขียว';
    }

    const titleColor = lowerSym.includes('los') ? '#fca5a5' : lowerSym.includes('pon กระพริบ') ? '#fde047' : 'var(--text-primary)';

    return { pwr, mid, intLed, subtitle, headerIcon, headerColor, titleColor };
}

function decodeJwt(token) {
    try {
        const payload = token.split('.')[1];
        const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(json);
    } catch {
        return null;
    }
}

function getCurrentUserId(token) {
    if (!token) return 'anonymous';
    const claims = decodeJwt(token);
    return claims?.id || 'anonymous';
}

function needsFirstFeedback(userId) {
    return localStorage.getItem(`fast_first_feedback_done_${userId}`) !== '1';
}

function markFirstFeedbackDone(userId) {
    localStorage.setItem(`fast_first_feedback_done_${userId}`, '1');
}

function LedDot({ led }) {
    return (
        <div className="ts-led-col">
            <div className={`led ${led.className}`} />
            <span className="ts-led-label" style={{ color: led.textColor, background: led.textBg }}>
                {led.text}
            </span>
        </div>
    );
}

function SymptomCard({ item, index, groupName, headerMeta, onOpen }) {
    const sym = item.Symptom || 'ไม่ระบุอาการ';
    let headerIcon = headerMeta.Icon;
    let headerColor = headerMeta.color;
    let subtitle = item.Scoms || '';
    let titleColor = 'var(--text-primary)';
    let leds = null;

    if (headerMeta.isLed) {
        const state = getLedState(item, groupName, headerMeta.Icon, headerMeta.color);
        headerIcon = state.headerIcon;
        headerColor = state.headerColor;
        subtitle = state.subtitle;
        titleColor = state.titleColor;
        leds = state;
    }

    const HeaderIcon = headerIcon;

    return (
        <div className="symptom-card" onClick={() => onOpen(item)}>
            <div className="symptom-card-top">
                <div className="symptom-card-label" style={{ color: headerColor }}>
                    <HeaderIcon size={16} /> {headerMeta.label}
                </div>
                <div className="symptom-card-meta">
                    {item.ID && <span className="symptom-id-badge">{item.ID}</span>}
                    <ChevronRight size={20} color="#475569" />
                </div>
            </div>

            {leds && (
                <div className="ts-led-row">
                    <LedDot led={leds.pwr} />
                    <LedDot led={leds.mid} />
                    <LedDot led={leds.intLed} />
                </div>
            )}

            <h3 className="symptom-card-title" style={{ color: titleColor }}>
                {sym}
            </h3>
            <p className="symptom-card-subtitle">{subtitle}</p>
        </div>
    );
}

export default function TroubleshootPage() {
    const { scoms, loading, error } = useScoms();
    const { token } = useAuth();
    const navigate = useNavigate();

    const [selectedGroup, setSelectedGroup] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);
    const [search, setSearch] = useState('');

    const [comment, setComment] = useState('');
    const [feedbackDone, setFeedbackDone] = useState(false);
    const [feedbackError, setFeedbackError] = useState(null);
    const [gateShake, setGateShake] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const userId = getCurrentUserId(token);

    const groups = useMemo(() => {
        const map = new Map();
        scoms.forEach((item) => {
            if (item.Group === 'กลุ่มประเภทเหตุเสีย') return;
            if (!item.Group) return;
            if (!map.has(item.Group)) map.set(item.Group, []);
            map.get(item.Group).push(item);
        });
        return Array.from(map.entries());
    }, [scoms]);

    const filteredGroups = useMemo(() => {
        let term = search.trim().toLowerCase();
        if (term.includes('หลุดบ่อย')) term = 'disconnect';
        if (!term) return groups;
        return groups.filter(([groupName]) => groupName.toLowerCase().includes(term));
    }, [groups, search]);

    const symptomsInGroup = useMemo(
        () => scoms.filter((item) => item.Group === selectedGroup),
        [scoms, selectedGroup]
    );

    const feedbackRequired = needsFirstFeedback(userId) && !feedbackDone;

    function openGroup(groupName) {
        setSelectedGroup(groupName);
    }

    function backToGroups() {
        setSelectedGroup(null);
    }

    function openSymptom(item) {
        setFeedbackError(null);
        setComment('');
        setSelectedItem(item);
    }

    function closeSheet() {
        if (feedbackRequired) {
            triggerGateShake();
            return;
        }
        setSelectedItem(null);
    }

    function triggerGateShake() {
        setGateShake(true);
        setTimeout(() => setGateShake(false), 1500);
    }

    async function handleFeedbackSubmit() {
        const text = comment.trim();
        if (feedbackRequired && !text) {
            triggerGateShake();
            return;
        }
        setFeedbackError(null);
        setSubmitting(true);
        try {
            await submitFeedback({
                scope: 'troubleshoot',
                refId: selectedItem._id || selectedItem.ID,
                rating: 5,
                comment: text,
            });
            setComment('');
            if (feedbackRequired) {
                markFirstFeedbackDone(userId);
                setFeedbackDone(true);
                setTimeout(() => setSelectedItem(null), 900);
            } else {
                setFeedbackDone(true);
                setTimeout(() => setFeedbackDone(false), 2000);
            }
        } catch (err) {
            setFeedbackError(err.response?.data?.message || 'ไม่สามารถส่งคำแนะนำได้ กรุณาลองใหม่อีกครั้ง');
        } finally {
            setSubmitting(false);
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

    const headerMeta = selectedGroup ? getGroupHeaderMeta(selectedGroup) : null;

    return (
        <div className="page">
            <h2>ตรวจสอบและแก้ไขงานเสีย</h2>

            <div className="flow-container" id="ts-container">
                {!selectedGroup ? (
                    <>
                        <div className="ts-toolbar">
                            <button type="button" className="back-btn" onClick={() => navigate('/dashboard')}>
                                <ArrowLeft size={20} /> กลับหน้าหลัก
                            </button>
                            <div className="ts-search-wrap">
                                <Search size={20} className="ts-search-icon" />
                                <input
                                    type="text"
                                    className="ts-search-input"
                                    placeholder="ค้นหาอาการเสีย..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        <h3 className="ts-section-title">
                            <LayoutGrid size={20} color="#3b82f6" /> หมวดหมู่อาการเสีย
                        </h3>

                        <div className="manual-container">
                            {filteredGroups.map(([groupName]) => {
                                const { Icon, color, bg } = getGroupVisual(groupName);
                                let displayName = groupName;
                                if (displayName.includes('ไฟ PON ไม่ติด')) displayName = 'ไฟ PON ไม่ติด';
                                return (
                                    <button
                                        key={groupName}
                                        type="button"
                                        className="manual-group-btn"
                                        onClick={() => openGroup(groupName)}
                                    >
                                        <div className="manual-group-icon" style={{ background: bg, color }}>
                                            <Icon size={28} />
                                        </div>
                                        <span className="manual-group-label">{displayName}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="ts-group-header" style={{ background: 'var(--brand-primary)' }}>
                            <button type="button" className="ts-group-back" onClick={backToGroups}>
                                <ArrowLeft size={20} />
                            </button>
                            <div>
                                <h2 className="ts-group-title">{selectedGroup.replace(' / ไม่มีสัญญาณ', '')}</h2>
                                <p className="ts-group-subtitle">เลือกอาการที่พบหน้างาน</p>
                            </div>
                        </div>

                        <div id="symptom-list" className="symptom-list">
                            {symptomsInGroup.map((item, index) => (
                                <SymptomCard
                                    key={item._id || index}
                                    item={item}
                                    index={index}
                                    groupName={selectedGroup}
                                    headerMeta={headerMeta}
                                    onOpen={openSymptom}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>

            <BottomSheet open={!!selectedItem} onClose={closeSheet} hideClose={feedbackRequired}>
                {selectedItem && (
                    <SymptomDetail
                        key={selectedItem._id || selectedItem.ID}
                        item={selectedItem}
                        groupName={selectedGroup}
                        comment={comment}
                        onCommentChange={setComment}
                        feedbackRequired={feedbackRequired}
                        gateShake={gateShake}
                        onSubmit={handleFeedbackSubmit}
                        submitting={submitting}
                        feedbackDone={feedbackDone}
                        feedbackError={feedbackError}
                    />
                )}
            </BottomSheet>
        </div>
    );
}

function SymptomDetail({
    item,
    groupName,
    comment,
    onCommentChange,
    feedbackRequired,
    gateShake,
    onSubmit,
    submitting,
    feedbackDone,
    feedbackError,
}) {
    const steps = [];
    if (item.CheckPoint) {
        steps.push({ title: 'จุดที่ต้องเช็คจุดแรก', desc: String(item.CheckPoint).replace(/"/g, '') });
    }
    if (item.Steps) {
        String(item.Steps)
            .replace(/"/g, '')
            .split(/\n/)
            .filter((line) => line.trim().length > 0)
            .forEach((line) => {
                steps.push({ title: line.trim().replace(/^[-•]\s*/, ''), desc: '' });
            });
    }

    const [activeStep, setActiveStep] = useState(0);
    const currentStep = steps[activeStep];
    const stepPanelRef = useRef(null);

    // On mobile the sidebar and panel stack in one column, so tapping a step
    // further down the list otherwise leaves the newly active panel wherever
    // it landed in the scroll — bring its top edge to the top of the sheet.
    function selectStep(i) {
        setActiveStep(i);
        stepPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    return (
        <div>
            <div className="sheet-detail-top">
                {item.ID && <span className="sheet-detail-id">{item.ID}</span>}
                <span className="sheet-detail-group">{groupName}</span>
            </div>
            <h2 className="sheet-detail-title">{item.Symptom || '-'}</h2>

            <div className="step-section-header">
                <div className="step-section-title">
                    <Wrench size={18} /> ลำดับขั้นตอนการแก้ไขปัญหา
                </div>
                {steps.length > 0 && <span className="step-count-badge">{steps.length} ขั้นตอน</span>}
            </div>

            {steps.length > 0 ? (
                <div className="step-flow">
                    <nav className="step-sidebar" aria-label="ขั้นตอนการแก้ไข">
                        {steps.map((step, i) => (
                            <button
                                key={i}
                                type="button"
                                className={`step-sidebar-btn${i === activeStep ? ' active' : ''}`}
                                onClick={() => selectStep(i)}
                            >
                                <span className="step-sidebar-badge">{i + 1}</span>
                                <span className="step-sidebar-label">{step.title}</span>
                            </button>
                        ))}
                    </nav>

                    <div className="step-panel" ref={stepPanelRef}>
                        <div className="step-panel-header">
                            <span className="step-panel-badge">{activeStep + 1}</span>
                            <h4 className="step-panel-title">
                                {STEP_EMOJI[activeStep % STEP_EMOJI.length]} {currentStep.title}
                            </h4>
                        </div>
                        {currentStep.desc && <p className="step-panel-desc">{currentStep.desc}</p>}

                        <div className="step-nav-controls">
                            <button
                                type="button"
                                className="step-nav-btn"
                                onClick={() => selectStep(Math.max(0, activeStep - 1))}
                                disabled={activeStep === 0}
                            >
                                <ArrowLeft size={16} /> ย้อนกลับ
                            </button>
                            <span className="step-indicator">
                                ขั้นตอน {activeStep + 1} / {steps.length}
                            </span>
                            <button
                                type="button"
                                className="step-nav-btn primary"
                                onClick={() => selectStep(Math.min(steps.length - 1, activeStep + 1))}
                                disabled={activeStep === steps.length - 1}
                            >
                                ถัดไป <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="step-empty">
                    <Info size={24} style={{ opacity: 0.6 }} />
                    <span>ยังไม่มีขั้นตอนตรวจสอบสำหรับกรณีนี้ในระบบ</span>
                </div>
            )}

            <div className="feedback-section">
                <div className="feedback-label">
                    <MessageCircle size={16} /> คำแนะนำเพิ่มเติมจากผู้ใช้งาน{' '}
                    {feedbackRequired ? (
                        <span className="feedback-required-label">* จำเป็นสำหรับการใช้งานครั้งแรก</span>
                    ) : (
                        <span className="feedback-optional-label">(ไม่บังคับ)</span>
                    )}
                </div>
                <textarea
                    className={`feedback-textarea${gateShake ? ' gate-shake' : ''}`}
                    value={comment}
                    onChange={(e) => onCommentChange(e.target.value)}
                    placeholder="ระบุคำแนะนำ ข้อเสนอแนะ หรือรายละเอียดเพิ่มเติม เช่น ทำตามขั้นตอนแล้วอาการยังไม่ดีขึ้น พบว่าไฟกระพริบที่ช่อง WAN..."
                />
                <button
                    type="button"
                    className="feedback-submit-btn"
                    onClick={onSubmit}
                    disabled={submitting || feedbackDone}
                >
                    {feedbackDone ? (
                        <>
                            <Check size={18} /> <span>บันทึกข้อมูลแล้ว</span>
                        </>
                    ) : (
                        <>
                            <span>ส่งคำแนะนำ / บันทึกข้อมูล</span> <ArrowRight size={18} />
                        </>
                    )}
                </button>
                {feedbackError && <p className="feedback-status" style={{ color: 'var(--danger)' }}>{feedbackError}</p>}
            </div>
        </div>
    );
}
