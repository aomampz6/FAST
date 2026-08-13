import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, BarChart2, BookOpen, Calendar, Search, Settings } from 'lucide-react';
import { useParameters } from '../features/parameters/useParameters';

const LEVEL_BADGE_CLASS = { danger: 'badge danger', warning: 'badge warning', info: 'badge info', none: '' };

const LEVEL_TEXT_STYLE = {
    danger: { color: 'var(--danger)' },
    warning: { color: 'var(--warning)' },
    info: { color: 'var(--info)' },
    none: { color: 'var(--text-primary)' },
};

const NONE_BADGE_STYLE = {
    fontWeight: 600,
    fontSize: 14,
    background: 'var(--bg-main)',
    padding: '4px 8px',
    borderRadius: 4,
    display: 'inline-block',
    border: '1px solid var(--border-light)',
    color: 'var(--text-primary)',
};

const STANDARD_BADGE_STYLE = { fontWeight: 600, width: 'fit-content', display: 'inline-block' };

// Reference stats — same static reference table shown in archive/app.js's dashboard
// view (ข้อมูลอ้างอิง: สถิติระยะเวลาเฉลี่ยที่ใช้ในการแก้ไขเหตุเสีย). Not API-driven in the
// legacy app either; kept verbatim here.
const RESOLUTION_STATS = [
    { symptom: 'ไฟ PON ไม่ติด / ไม่มีสัญญาณ', detail: 'XN0112 ยกเลิกสัญญา', count: 3, avg: '8 วัน 0 ชั่วโมง 48 นาที' },
    {
        symptom: 'เปิดหน้า WEB ไม่ได้',
        detail: 'UN0599 เปลี่ยนตู้ ODP/SDP/MSDP ที่เสียหายทั้งตู้',
        count: 13,
        avg: '5 วัน 13 ชั่วโมง 41 นาที',
    },
    {
        symptom: 'connect ไม่ได้',
        detail: 'UN0599 เปลี่ยนตู้ ODP/SDP/MSDP ที่เสียหายทั้งตู้',
        count: 205,
        avg: '3 วัน 22 ชั่วโมง 41 นาที',
    },
    {
        symptom: 'ความเร็วไม่ตรงตามที่ขอ / Speed ตก',
        detail: 'XN0104 รอนัด',
        count: 1,
        avg: '3 วัน 21 ชั่วโมง 52 นาที',
    },
    { symptom: 'Disconnect บ่อย', detail: 'UNC014 ปรับเปลี่ยน NAT IP', count: 3, avg: '3 วัน 9 ชั่วโมง 51 นาที' },
    {
        symptom: 'รับ-ส่ง Mail ไม่ได้',
        detail: 'UN0580 เปลี่ยน Wireless Router/AP ที่เสีย',
        count: 1,
        avg: '3 วัน 3 ชั่วโมง 34 นาที',
    },
    {
        symptom: 'อื่นๆ',
        detail: 'UN0606 เปลี่ยนตู้ OFCCC ที่เสียหายทั้งตู้',
        count: 1,
        avg: '3 วัน 1 ชั่วโมง 2 นาที',
    },
    {
        symptom: 'ไฟ Pon กระพริบ',
        detail: 'UN0609 คลี่จัดระเบียบสายที่ตู้ OFCCC เนื่องจากสายโค้งงอ',
        count: 1,
        avg: '2 วัน 2 ชั่วโมง 5 นาที',
    },
];

function ParameterRows({ parameters }) {
    if (!parameters || parameters.length === 0) {
        return (
            <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 24 }}>
                    ยังไม่มีข้อมูลพารามิเตอร์อ้างอิงในระบบ
                </td>
            </tr>
        );
    }

    return parameters.map((p) => {
        const level = p.Level || 'none';
        const badgeClass = LEVEL_BADGE_CLASS[level] || '';
        const badgeStyle = level === 'none' ? NONE_BADGE_STYLE : STANDARD_BADGE_STYLE;

        return (
            <tr key={p._id}>
                <td data-label="ประเภทอุปกรณ์">{p.Type}</td>
                <td data-label="พารามิเตอร์">
                    <strong style={LEVEL_TEXT_STYLE[level] || LEVEL_TEXT_STYLE.none}>{p.Parameter}</strong>
                </td>
                <td data-label="เกณฑ์มาตรฐาน">
                    <span className={badgeClass} style={badgeStyle}>
                        {p.Standard}
                    </span>
                </td>
                <td data-label="คำแนะนำของระบบ">{p.Recommendation || '-'}</td>
            </tr>
        );
    });
}

function AccordionRow({ row }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <tr className={`accordion-row${expanded ? ' expanded' : ''}`} onClick={() => setExpanded((prev) => !prev)}>
            <td data-label="กลุ่มอาการเสีย">
                <span className="accordion-toggle" />
                {row.symptom}
            </td>
            <td data-label="รายละเอียดการแก้ไข">{row.detail}</td>
            <td data-label="จำนวนงาน" style={{ textAlign: 'center' }}>
                {row.count}
            </td>
            <td data-label="ค่าเฉลี่ยเวลา">{row.avg}</td>
        </tr>
    );
}

export default function DashboardPage() {
    const { parameters, loading, error } = useParameters();
    const navigate = useNavigate();

    return (
        <div className="page">
            <div className="card hero-banner">
                <div className="hero-icon-wrapper">
                    <BookOpen className="hero-icon" />
                </div>
                <h4 className="hero-subtitle">Field Assistant System For Technician (FAST)</h4>
                <h3 className="hero-title">คู่มือการตรวจสอบและแก้ไขปัญหา</h3>
                <p className="hero-desc">เลือกระบบคู่มือที่คุณต้องการใช้งานด้านล่าง</p>
            </div>

            {/* Parameters Table */}
            <div className="card" style={{ marginTop: 24, marginBottom: 24 }}>
                <h3 className="mb-2" style={{ fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Activity style={{ color: 'var(--nt-yellow)' }} />
                    ข้อมูลพารามิเตอร์อ้างอิง
                </h3>
                {error && <div className="error-banner">{error}</div>}
                {loading ? (
                    <div className="page-loading">
                        <div className="skeleton-line w-40" />
                        <div className="skeleton-line w-80" />
                        <div className="skeleton-line w-60" />
                    </div>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>ประเภทอุปกรณ์ (Type)</th>
                                    <th>พารามิเตอร์ (Parameter)</th>
                                    <th>เกณฑ์มาตรฐาน (Standard)</th>
                                    <th>คำแนะนำของระบบ (Recommendation)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <ParameterRows parameters={parameters} />
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="card">
                <h3 className="mb-4" style={{ fontSize: 18 }}>
                    เมนูลัด (Quick Actions)
                </h3>
                <div className="quick-actions grid" style={{ marginTop: 16 }}>
                    <button type="button" className="quick-action-btn" onClick={() => navigate('/troubleshoot')}>
                        <Search style={{ color: 'var(--brand-primary)' }} />
                        ตรวจสอบอาการเสีย
                    </button>
                    <button type="button" className="quick-action-btn" onClick={() => navigate('/onu-setup')}>
                        <Settings style={{ color: 'var(--nt-gray)' }} />
                        ตั้งค่า ONU รุ่นต่างๆ
                    </button>
                </div>
            </div>

            <div className="card" style={{ marginTop: 24 }}>
                <h3 className="mb-2" style={{ fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <BarChart2 style={{ color: 'var(--info)' }} />
                    ข้อมูลอ้างอิง: สถิติระยะเวลาเฉลี่ยที่ใช้ในการแก้ไขเหตุเสีย
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
                    <Calendar style={{ width: 14, height: 14, verticalAlign: 'middle' }} /> ข้อมูลของ วันที่ 1
                    มกราคม 2568 - 31 ธันวาคม 2568
                </p>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>กลุ่มอาการเสีย</th>
                                <th>รายละเอียดการแก้ไข</th>
                                <th style={{ textAlign: 'center' }}>จำนวนงาน</th>
                                <th>ค่าเฉลี่ยเวลา</th>
                            </tr>
                        </thead>
                        <tbody>
                            {RESOLUTION_STATS.map((row) => (
                                <AccordionRow key={row.symptom} row={row} />
                            ))}
                        </tbody>
                    </table>
                </div>
                <div
                    style={{
                        marginTop: 16,
                        textAlign: 'center',
                        fontSize: 13,
                        color: 'var(--text-secondary)',
                        lineHeight: 1.6,
                        fontWeight: 600,
                    }}
                >
                    ***หมายเหตุ ระยะเวลาของข้อมูลที่นำมาใช้คำนวณ คือ ตั้งแต่วันที่ 1 มกราคม 2568 - 31 ธันวาคม 2568
                </div>
            </div>
        </div>
    );
}
