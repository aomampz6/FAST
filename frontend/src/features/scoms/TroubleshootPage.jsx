import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    Check,
    CheckCircle2,
    ClipboardList,
    Gauge,
    Globe,
    Info,
    LayoutGrid,
    Lightbulb,
    ListChecks,
    Mail,
    MessageCircle,
    Network,
    PhoneCall,
    Router,
    Search,
    Wrench,
    WifiOff,
    X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useScoms } from './useScoms';
import { submitFeedback } from '../feedback/feedbackService';
import { useFirstFeedbackGate } from '../../shared/hooks/useFirstFeedbackGate';
import './symptomGuide.css';

// Per-group icon/color for the home grid tiles — mirrors archive/app.js
// window.initTroubleshootFlow's heuristic.
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
    if (nameLower.includes('ไม่ติด')) return { Icon: AlertCircle, color: '#475569', bg: 'rgba(71, 85, 105, 0.1)' };
    return { Icon: Wrench, color: '#14b8a6', bg: 'rgba(20, 184, 166, 0.1)' };
}

// Small colored tag shown above the group name in the detail view (e.g.
// "CONNECTION" in red) — same heuristic, just labelled for the header/eyebrow
// instead of a tile icon.
function getGroupHeaderMeta(groupName) {
    const nameLower = (groupName || '').toLowerCase();
    if (nameLower.includes('ไฟ') || nameLower.includes('pon') || nameLower.includes('dsl')) {
        return { label: 'ROUTER STATUS', Icon: Router, color: '#94a3b8' };
    }
    if (nameLower.includes('disconnect')) return { label: 'CONNECTION', Icon: Network, color: '#ef4444' };
    if (nameLower.includes('connect')) return { label: 'INTERNET ACCESS', Icon: WifiOff, color: '#f97316' };
    if (nameLower.includes('speed')) return { label: 'SPEED TEST', Icon: Gauge, color: '#8b5cf6' };
    if (nameLower.includes('web')) return { label: 'WEB ACCESS', Icon: Globe, color: '#3b82f6' };
    if (nameLower.includes('mail')) return { label: 'MAIL', Icon: Mail, color: '#0ea5e9' };
    if (nameLower.includes('ip-phone') || nameLower.includes('โทร'))
        return { label: 'IP-PHONE', Icon: PhoneCall, color: '#22c55e' };
    if (nameLower.includes('อื่น')) return { label: 'OTHER CASE', Icon: AlertCircle, color: '#94a3b8' };
    return { label: 'อาการที่พบ', Icon: Wrench, color: '#14b8a6' };
}

// Builds the checklist shown in a symptom's detail panel from the raw Scoms
// record fields (CheckPoint + newline-separated Steps), flattened into one
// list instead of a paginated wizard.
function buildChecklist(item) {
    const checks = [];
    if (item.CheckPoint) {
        checks.push(String(item.CheckPoint).replace(/"/g, ''));
    }
    if (item.Steps) {
        String(item.Steps)
            .replace(/"/g, '')
            .split(/\n/)
            .map((line) => line.trim())
            .filter(Boolean)
            .forEach((line) => checks.push(line.replace(/^[-•]\s*/, '')));
    }
    return checks;
}

const FALLBACK_TIP = 'เคล็ดลับ: บันทึกค่าที่วัดได้ในทุกขั้นตอน หากทำตามแล้วอาการยังไม่หาย ให้แจ้งทีมสนับสนุนพร้อมค่าที่วัดได้เพื่อความรวดเร็วในการช่วยเหลือ';

export default function TroubleshootPage() {
    const { scoms, loading, error } = useScoms();
    const navigate = useNavigate();
    const { isRequired, markDone } = useFirstFeedbackGate();

    const [selectedGroup, setSelectedGroup] = useState(null);
    const [search, setSearch] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const panelRef = useRef(null);
    const feedbackRef = useRef(null);

    const [comment, setComment] = useState('');
    const [feedbackDone, setFeedbackDone] = useState(false);
    const [feedbackError, setFeedbackError] = useState(null);
    const [gateShake, setGateShake] = useState(false);
    const [submitting, setSubmitting] = useState(false);

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

    // The sub-symptoms of the selected group, shown in one continuous list —
    // no further sub-categorization inside the detail view.
    const symptomsInGroup = useMemo(
        () => scoms.filter((item) => item.Group === selectedGroup),
        [scoms, selectedGroup]
    );

    useEffect(() => {
        if (!drawerOpen) return undefined;
        document.body.style.overflow = 'hidden';
        function onKeyDown(e) {
            if (e.key === 'Escape') setDrawerOpen(false);
        }
        window.addEventListener('keydown', onKeyDown);
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [drawerOpen]);

    const feedbackRequired = isRequired() && !feedbackDone;
    const headerMeta = selectedGroup ? getGroupHeaderMeta(selectedGroup) : null;
    const active = symptomsInGroup[activeIndex] || null;
    const checks = active ? buildChecklist(active) : [];

    function openGroup(groupName) {
        setSelectedGroup(groupName);
        setActiveIndex(0);
        setDrawerOpen(false);
        setComment('');
        setFeedbackError(null);
    }

    function triggerGateShake() {
        setGateShake(true);
        feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => setGateShake(false), 1500);
    }

    // Leaving the detail view used to be blocked by not letting its bottom
    // sheet close; there's no sheet anymore, so the same rule now guards
    // going back to the category grid instead.
    function backToGroup() {
        if (feedbackRequired) {
            triggerGateShake();
            return;
        }
        setSelectedGroup(null);
        setActiveIndex(0);
        setDrawerOpen(false);
        setComment('');
        setFeedbackError(null);
    }

    function selectSymptom(index) {
        setActiveIndex(index);
        setDrawerOpen(false);
        setComment('');
        setFeedbackError(null);
        panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
                refId: active._id || active.ID,
                rating: 5,
                comment: text,
            });
            setComment('');
            if (feedbackRequired) {
                markDone();
                setFeedbackDone(true);
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

    if (!selectedGroup) {
        return (
            <div className="page">
                <h2>ตรวจสอบและแก้ไขงานเสีย</h2>

                <div className="flow-container" id="ts-container">
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
                </div>
            </div>
        );
    }

    const navList = (
        <div className="sg-nav">
            {symptomsInGroup.map((item, i) => (
                <button
                    key={item._id || item.ID || i}
                    type="button"
                    aria-current={i === activeIndex ? 'true' : undefined}
                    className={`sg-nav-btn${i === activeIndex ? ' active' : ''}`}
                    onClick={() => selectSymptom(i)}
                >
                    <span className="sg-nav-badge">{i + 1}</span>
                    <span className="sg-nav-label">{item.Symptom || 'ไม่ระบุอาการ'}</span>
                </button>
            ))}
        </div>
    );

    return (
        <div className="page sg-page">
            <div className="ts-toolbar">
                <button type="button" className="back-btn" onClick={backToGroup}>
                    <ArrowLeft size={20} /> กลับหน้าหมวดหมู่
                </button>
            </div>

            <header className="sg-hero">
                <span className="sg-hero-eyebrow">
                    <headerMeta.Icon size={14} /> {headerMeta.label}
                </span>
                <h1 className="sg-hero-title">{selectedGroup.replace(' / ไม่มีสัญญาณ', '')}</h1>
                <p className="sg-hero-subtitle">เลือกอาการที่พบหน้างานจากรายการด้านซ้าย เพื่อดูรายละเอียดและขั้นตอนการตรวจสอบ</p>
            </header>

            <div className="sg-split">
                <aside className="sg-sidebar">
                    <h2 className="sg-sidebar-title">อาการที่พบหน้างาน</h2>
                    {navList}
                </aside>

                <div>
                    {active && (
                        <button
                            type="button"
                            className="sg-mobile-bar"
                            onClick={() => setDrawerOpen(true)}
                            aria-expanded={drawerOpen}
                        >
                            <span className="sg-mobile-bar-badge">{activeIndex + 1}</span>
                            <span className="sg-mobile-bar-text">
                                <span className="sg-mobile-bar-kicker">
                                    อาการ {activeIndex + 1} จาก {symptomsInGroup.length} — แตะเพื่อเปลี่ยน
                                </span>
                                <span className="sg-mobile-bar-title">{active.Symptom || 'ไม่ระบุอาการ'}</span>
                            </span>
                            <ListChecks size={20} />
                        </button>
                    )}

                    {active ? (
                        <article className="sg-panel" key={active._id || active.ID} ref={panelRef}>
                            <div className="sg-panel-header">
                                <span className="sg-panel-badge">{activeIndex + 1}</span>
                                <div>
                                    <div className="symptom-card-label" style={{ color: headerMeta.color }}>
                                        <headerMeta.Icon size={14} /> {headerMeta.label}
                                        {active.ID && <span className="symptom-id-badge" style={{ marginLeft: 8 }}>{active.ID}</span>}
                                    </div>
                                    <h2 className="sg-panel-title">{active.Symptom || 'ไม่ระบุอาการ'}</h2>
                                </div>
                            </div>

                            <p className="sg-lead">{active.Scoms || 'รายละเอียดอาการนี้ยังไม่มีคำอธิบายเพิ่มเติมในระบบ'}</p>

                            <h3 className="sg-section-label">
                                <ClipboardList size={16} /> สิ่งที่ต้องตรวจสอบ
                            </h3>
                            {checks.length > 0 ? (
                                <ul className="sg-list">
                                    {checks.map((check, i) => (
                                        <li key={i}>
                                            <CheckCircle2 size={18} className="sg-list-icon" />
                                            <span>{check}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="step-empty">
                                    <Info size={24} style={{ opacity: 0.6 }} />
                                    <span>ยังไม่มีขั้นตอนตรวจสอบสำหรับกรณีนี้ในระบบ</span>
                                </div>
                            )}

                            <div className="sg-callout">
                                <Lightbulb size={18} className="sg-callout-icon" />
                                <span>{FALLBACK_TIP}</span>
                            </div>

                            <div className="sg-panel-nav">
                                <button
                                    type="button"
                                    className="sg-panel-nav-btn"
                                    onClick={() => selectSymptom(Math.max(0, activeIndex - 1))}
                                    disabled={activeIndex === 0}
                                >
                                    <ArrowLeft size={16} /> ก่อนหน้า
                                </button>
                                <span className="sg-panel-indicator">
                                    อาการ {activeIndex + 1} / {symptomsInGroup.length}
                                </span>
                                <button
                                    type="button"
                                    className="sg-panel-nav-btn primary"
                                    onClick={() => selectSymptom(Math.min(symptomsInGroup.length - 1, activeIndex + 1))}
                                    disabled={activeIndex === symptomsInGroup.length - 1}
                                >
                                    ถัดไป <ArrowRight size={16} />
                                </button>
                            </div>

                            <div className="feedback-section" ref={feedbackRef}>
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
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="ระบุคำแนะนำ ข้อเสนอแนะ หรือรายละเอียดเพิ่มเติม เช่น ทำตามขั้นตอนแล้วอาการยังไม่ดีขึ้น พบว่าไฟกระพริบที่ช่อง WAN..."
                                />
                                <button
                                    type="button"
                                    className="feedback-submit-btn"
                                    onClick={handleFeedbackSubmit}
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
                                {feedbackError && (
                                    <p className="feedback-status" style={{ color: 'var(--danger)' }}>
                                        {feedbackError}
                                    </p>
                                )}
                            </div>
                        </article>
                    ) : (
                        <div className="sg-panel">
                            <p className="sg-lead">ยังไม่มีอาการย่อยในหมวดหมู่นี้</p>
                        </div>
                    )}
                </div>
            </div>

            {createPortal(
                <>
                    <div
                        className={`sg-drawer-overlay${drawerOpen ? ' open' : ''}`}
                        onClick={() => setDrawerOpen(false)}
                        aria-hidden="true"
                    />
                    <div className={`sg-drawer${drawerOpen ? ' open' : ''}`} role="dialog" aria-label="เลือกอาการที่พบหน้างาน">
                        <div className="sg-drawer-handle" />
                        <div className="sg-drawer-header">
                            <h3>เลือกอาการที่พบหน้างาน</h3>
                            <button
                                type="button"
                                className="sg-drawer-close"
                                onClick={() => setDrawerOpen(false)}
                                aria-label="ปิด"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        {navList}
                    </div>
                </>,
                document.body
            )}
        </div>
    );
}
