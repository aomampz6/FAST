import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    ClipboardList,
    Lightbulb,
    ListChecks,
    Network,
    X,
} from 'lucide-react';
import './symptomGuide.css';

// Group this page documents. The sub-symptoms below are the four cases a
// technician picks between once "Disconnect บ่อย" has been chosen — placeholder
// bodies for now, to be swapped for the real Scoms records later.
const GROUP_NAME = 'Disconnect บ่อย';
const GROUP_SUBTITLE =
    'รวมอาการย่อยที่พบบ่อยเมื่อลูกค้าแจ้งว่าอินเทอร์เน็ตหลุดบ่อย เลือกอาการที่ตรงกับหน้างานจากเมนูด้านซ้าย เพื่อดูรายละเอียดและแนวทางตรวจสอบ';

const SYMPTOMS = [
    {
        id: 'wifi-unstable',
        navLabel: 'ใช้ Wi-Fi ได้บ้างไม่ได้บ้าง',
        title: 'ใช้ Wi-Fi ได้บ้างไม่ได้บ้าง',
        visual: 'Wi-Fi Unstable',
        lead: 'ลูกค้าเชื่อมต่อ Wi-Fi ได้ แต่สัญญาณหลุดเป็นช่วง ๆ หรือบางเครื่องใช้งานได้ บางเครื่องใช้ไม่ได้ มักเกิดจากสัญญาณ Wi-Fi รบกวนกัน ระยะห่างจากเราเตอร์ หรือจำนวนอุปกรณ์ที่เชื่อมต่อมากเกินไป',
        checks: [
            'ตรวจสอบระยะห่างระหว่างเราเตอร์กับจุดใช้งาน และสิ่งกีดขวาง เช่น ผนังปูน ตู้เหล็ก',
            'ตรวจนับจำนวนอุปกรณ์ที่เชื่อมต่ออยู่ หากเกิน 15-20 เครื่อง แนะนำเปลี่ยนเราเตอร์สเปกสูงขึ้น',
            'สลับทดสอบระหว่างย่าน 2.4GHz และ 5GHz เพื่อดูว่าอาการเกิดเฉพาะย่านใดย่านหนึ่งหรือไม่',
            'เปลี่ยน Channel ของ Wi-Fi หากพบว่ามีสัญญาณจากบ้านข้างเคียงทับซ้อนกันจำนวนมาก',
        ],
        tip: 'หากทดสอบด้วยสาย LAN แล้วใช้งานได้ปกติ ให้สรุปว่าปัญหาอยู่ที่ฝั่ง Wi-Fi ไม่ใช่สัญญาณขาเข้า',
    },
    {
        id: 'iptv-nt',
        navLabel: 'เสีย IPTV NT',
        title: 'เสีย IPTV NT',
        visual: 'IPTV Error',
        lead: 'กล่อง IPTV NT แสดงภาพกระตุก ค้าง หรือขึ้นข้อความแจ้งข้อผิดพลาด ขณะที่อินเทอร์เน็ตทั่วไปยังใช้งานได้ ให้แยกให้ชัดก่อนว่าเป็นปัญหาที่กล่อง สายที่ต่อเข้ากล่อง หรือฝั่งบริการ',
        checks: [
            'ตรวจสอบไฟสถานะที่กล่อง IPTV และสายที่เชื่อมระหว่างกล่องกับเราเตอร์',
            'ทดสอบสลับพอร์ต LAN บนเราเตอร์ และเปลี่ยนสาย LAN เส้นใหม่',
            'รีสตาร์ทกล่อง IPTV พร้อมเราเตอร์ แล้วรอให้เชื่อมต่อใหม่จนครบ',
            'ตรวจสอบค่า Rx Power ให้อยู่ในช่วง -11 ถึง -25 dBm ก่อนสรุปว่าเป็นปัญหาที่กล่อง',
        ],
        tip: 'ถ้าภาพกระตุกเฉพาะช่วงเวลาที่มีการใช้งานอินเทอร์เน็ตหนัก ให้ตรวจสอบการตั้งค่า QoS บนเราเตอร์',
    },
    {
        id: 'slow-usage',
        navLabel: 'ใช้งานได้ช้า / หลุดเป็นช่วง',
        title: 'ใช้งานได้ช้า หลุดเป็นช่วง ๆ',
        visual: 'Slow Speed',
        lead: 'ความเร็วไม่ตรงตามแพ็กเกจ หรือใช้งานได้ปกติสลับกับช้ามากเป็นช่วง ๆ ให้เก็บค่าที่วัดได้จริงเทียบกับเกณฑ์มาตรฐาน ก่อนตัดสินใจเปลี่ยนอุปกรณ์',
        checks: [
            'วัด Speed Test จากเครื่องที่ต่อสาย LAN โดยตรง เพื่อตัดตัวแปรเรื่อง Wi-Fi ออก',
            'ตรวจค่า Tx Power ให้อยู่ในช่วง 0.5 ถึง 5.0 dBm และ Rx Power ในช่วง -11 ถึง -25 dBm',
            'สังเกตความนิ่งของค่าที่วัดได้ ค่าที่แกว่งเกิน ±0.5 dBm บ่งชี้ว่าสาย Fiber มีปัญหา',
            'ตรวจสอบอุณหภูมิเราเตอร์และการระบายอากาศ อุปกรณ์ร้อนเกินไปทำให้ประสิทธิภาพตก',
        ],
        tip: 'บันทึกช่วงเวลาที่ลูกค้าพบอาการไว้ด้วย ปัญหาที่เกิดซ้ำเวลาเดิมทุกวันมักมาจากโหลดฝั่งโครงข่าย ไม่ใช่อุปกรณ์ปลายทาง',
    },
    {
        id: 'lan-drop',
        navLabel: 'ใช้ LAN แล้วหลุดบ่อย',
        title: 'ใช้ LAN แล้วหลุดบ่อย',
        visual: 'LAN Drop',
        lead: 'เครื่องที่ต่อสาย LAN หลุดการเชื่อมต่อเป็นระยะ ทั้งที่ Wi-Fi ยังใช้งานได้ กรณีนี้ให้เน้นตรวจสภาพสาย หัว RJ45 และพอร์ตบนเราเตอร์เป็นอันดับแรก',
        checks: [
            'ตรวจสภาพหัว RJ45 ทั้งสองด้าน ว่าเข้าหัวแน่นและไม่มีขาโลหะหัก',
            'สลับพอร์ต LAN บนเราเตอร์ เพื่อตัดปัญหาพอร์ตใดพอร์ตหนึ่งเสีย',
            'เปลี่ยนสาย LAN เส้นใหม่ทดสอบ โดยเฉพาะสายที่เดินผ่านจุดหักงอหรือถูกทับ',
            'ตรวจสอบการตั้งค่า Speed / Duplex ที่ Network Adapter ของเครื่องลูกค้า',
        ],
        tip: 'สาย LAN ที่เดินยาวเกิน 100 เมตรจะทำให้สัญญาณตกและหลุดเป็นระยะ ให้วัดระยะจริงก่อนสรุปว่าอุปกรณ์เสีย',
    },
];

export default function SymptomGuidePage() {
    const navigate = useNavigate();
    const [activeIndex, setActiveIndex] = useState(0);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const panelRef = useRef(null);

    const active = SYMPTOMS[activeIndex];

    // Lock background scrolling while the mobile drawer covers the page, and
    // let Escape close it — same contract as BottomSheet.
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

    // On mobile the panel sits below the selector bar, so switching symptoms
    // would otherwise leave the reader mid-article in the previous one.
    function selectSymptom(index) {
        setActiveIndex(index);
        setDrawerOpen(false);
        panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    const navList = (
        <div className="sg-nav">
            {SYMPTOMS.map((symptom, i) => (
                <button
                    key={symptom.id}
                    type="button"
                    aria-current={i === activeIndex ? 'true' : undefined}
                    className={`sg-nav-btn${i === activeIndex ? ' active' : ''}`}
                    onClick={() => selectSymptom(i)}
                >
                    <span className="sg-nav-badge">{i + 1}</span>
                    <span className="sg-nav-label">{symptom.navLabel}</span>
                </button>
            ))}
        </div>
    );

    return (
        <div className="page sg-page">
            <div className="sg-topbar">
                <button type="button" className="sg-back-btn" onClick={() => navigate('/troubleshoot')}>
                    <ArrowLeft size={18} /> กลับหน้าหมวดหมู่
                </button>
            </div>

            <header className="sg-hero">
                <span className="sg-hero-eyebrow">
                    <Network size={14} /> CONNECTION
                </span>
                <h1 className="sg-hero-title">คู่มือการแก้ไขปัญหา {GROUP_NAME}</h1>
                <p className="sg-hero-subtitle">{GROUP_SUBTITLE}</p>
            </header>

            <div className="sg-split">
                <aside className="sg-sidebar">
                    <h2 className="sg-sidebar-title">อาการย่อย</h2>
                    {navList}
                </aside>

                <div>
                    <button
                        type="button"
                        className="sg-mobile-bar"
                        onClick={() => setDrawerOpen(true)}
                        aria-expanded={drawerOpen}
                    >
                        <span className="sg-mobile-bar-badge">{activeIndex + 1}</span>
                        <span className="sg-mobile-bar-text">
                            <span className="sg-mobile-bar-kicker">
                                อาการย่อย {activeIndex + 1} จาก {SYMPTOMS.length} — แตะเพื่อเปลี่ยน
                            </span>
                            <span className="sg-mobile-bar-title">{active.navLabel}</span>
                        </span>
                        <ListChecks size={20} />
                    </button>

                    <article className="sg-panel" key={active.id} ref={panelRef}>
                        <div className="sg-panel-header">
                            <span className="sg-panel-badge">{activeIndex + 1}</span>
                            <h2 className="sg-panel-title">{active.title}</h2>
                        </div>

                        <div className="sg-visual">
                            <span className="sg-visual-text">{active.visual}</span>
                        </div>

                        <p className="sg-lead">{active.lead}</p>

                        <h3 className="sg-section-label">
                            <ClipboardList size={16} /> สิ่งที่ต้องตรวจสอบ
                        </h3>
                        <ul className="sg-list">
                            {active.checks.map((check) => (
                                <li key={check}>
                                    <CheckCircle2 size={18} className="sg-list-icon" />
                                    <span>{check}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="sg-callout">
                            <Lightbulb size={18} className="sg-callout-icon" />
                            <span>{active.tip}</span>
                        </div>

                        <div className="sg-panel-nav">
                            <button
                                type="button"
                                className="sg-panel-nav-btn"
                                onClick={() => selectSymptom(activeIndex - 1)}
                                disabled={activeIndex === 0}
                            >
                                <ArrowLeft size={16} /> ก่อนหน้า
                            </button>
                            <span className="sg-panel-indicator">
                                อาการ {activeIndex + 1} / {SYMPTOMS.length}
                            </span>
                            <button
                                type="button"
                                className="sg-panel-nav-btn primary"
                                onClick={() => selectSymptom(activeIndex + 1)}
                                disabled={activeIndex === SYMPTOMS.length - 1}
                            >
                                ถัดไป <ArrowRight size={16} />
                            </button>
                        </div>
                    </article>
                </div>
            </div>

            {/* `.page`'s entrance animation makes it the containing block for
                position: fixed, so the drawer is portaled to <body> — same
                reason BottomSheet does. */}
            {createPortal(
                <>
                    <div
                        className={`sg-drawer-overlay${drawerOpen ? ' open' : ''}`}
                        onClick={() => setDrawerOpen(false)}
                        aria-hidden="true"
                    />
                    <div className={`sg-drawer${drawerOpen ? ' open' : ''}`} role="dialog" aria-label="เลือกอาการย่อย">
                        <div className="sg-drawer-handle" />
                        <div className="sg-drawer-header">
                            <h3>เลือกอาการย่อย</h3>
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
