import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Users, LogIn, MousePointerClick, CalendarDays, Inbox } from 'lucide-react';
import { getUsageStats } from '../usage/usageService';
import { toTitleCase } from '../../shared/format/names';

const RANGE_OPTIONS = [7, 30, 90];

// The chart shows one measure at a time — logins and page views differ by
// an order of magnitude, so sharing one y-axis would flatten the smaller one.
const METRICS = [
    { key: 'activeUsers', label: 'ผู้ใช้งาน', unit: 'คน', Icon: Users },
    { key: 'logins', label: 'เข้าสู่ระบบ', unit: 'ครั้ง', Icon: LogIn },
    { key: 'pageViews', label: 'เปิดหน้า', unit: 'ครั้ง', Icon: MousePointerClick },
];

// Readable names for the paths UsageTracker reports. Matched longest-prefix
// first so /admin/scoms isn't swallowed by the generic /admin entry; anything
// unknown falls back to the raw path.
const PAGE_LABELS = [
    { path: '/admin/scoms', label: 'ผู้ดูแลระบบ — ข้อมูลการแก้ไขปัญหา' },
    { path: '/admin/parameters', label: 'ผู้ดูแลระบบ — ข้อมูลพารามิเตอร์อ้างอิง' },
    { path: '/admin/onu-configs', label: 'ผู้ดูแลระบบ — ข้อมูลการตั้งค่า ONU' },
    { path: '/admin/ata-configs', label: 'ผู้ดูแลระบบ — ข้อมูลการตั้งค่า ATA' },
    { path: '/admin/ap-configs', label: 'ผู้ดูแลระบบ — ข้อมูลการตั้งค่า Access Point' },
    { path: '/admin/guides', label: 'ผู้ดูแลระบบ — คู่มือ Interactive' },
    { path: '/admin/phonebook', label: 'ผู้ดูแลระบบ — ข้อมูลสมุดโทรศัพท์' },
    { path: '/admin/users', label: 'ผู้ดูแลระบบ — จัดการผู้ใช้งาน' },
    { path: '/admin/feedback', label: 'ผู้ดูแลระบบ — คำแนะนำจากผู้ใช้งาน' },
    { path: '/admin/usage', label: 'ผู้ดูแลระบบ — สถิติการเข้าใช้งาน' },
    { path: '/admin', label: 'ผู้ดูแลระบบ' },
    { path: '/troubleshoot', label: 'ตรวจสอบและแก้ไขงานเสีย' },
    { path: '/symptom-guide', label: 'คู่มืออาการเสีย' },
    { path: '/onu-setup', label: 'การตั้งค่าอุปกรณ์ FTTx (ONU)' },
    { path: '/ata-setup', label: 'การตั้งค่าอุปกรณ์ ATA' },
    { path: '/ap-setup', label: 'การตั้งค่าอุปกรณ์ Access Point' },
    { path: '/phonebook', label: 'ข้อมูล สมุดโทรศัพท์' },
    { path: '/profile', label: 'ข้อมูลส่วนตัว' },
];

function pageLabel(path) {
    if (path === '/') return 'หน้าแรก';
    const match = PAGE_LABELS.find((p) => path === p.path || path.startsWith(`${p.path}/`));
    return match ? match.label : path;
}

// Day keys from the API are Bangkok calendar dates (YYYY-MM-DD).
function formatDay(key, options = { day: 'numeric', month: 'short' }) {
    return new Date(`${key}T00:00:00+07:00`).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', ...options });
}

function formatDateTime(value) {
    return new Date(value).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatNumber(n) {
    return n.toLocaleString('th-TH');
}

function displayName(u) {
    return toTitleCase(u.fullName) || u.username || u.userId;
}

// Rounds the axis top up to a 1/2/5 × 10ⁿ step so the gridline labels read
// as round numbers instead of whatever the busiest day happened to be.
function niceMax(value) {
    if (value <= 4) return 4;
    const magnitude = 10 ** Math.floor(Math.log10(value));
    const step = [1, 2, 5, 10].find((s) => s * magnitude >= value);
    return step * magnitude;
}

function UsageChart({ daily, metric }) {
    const [hovered, setHovered] = useState(null);
    const max = niceMax(Math.max(0, ...daily.map((d) => d[metric.key])));
    const ticks = [max, max / 2, 0];
    // Label every bar for a week, otherwise just enough to orient the eye.
    const labelEvery = daily.length <= 7 ? 1 : daily.length <= 30 ? 5 : 15;

    return (
        <div className="usage-chart" onMouseLeave={() => setHovered(null)}>
            <div className="usage-chart-axis" aria-hidden="true">
                {ticks.map((t) => (
                    <span key={t}>{formatNumber(t)}</span>
                ))}
            </div>
            <div className="usage-chart-plot">
                <div className="usage-chart-grid" aria-hidden="true">
                    {ticks.map((t) => (
                        <span key={t} />
                    ))}
                </div>
                <div className="usage-chart-bars" role="list">
                    {daily.map((d, i) => {
                        const value = d[metric.key];
                        const pct = (value / max) * 100;
                        const label = `${formatDay(d.date, { dateStyle: 'medium' })}: ${metric.label} ${formatNumber(value)} ${metric.unit}`;
                        return (
                            <div
                                key={d.date}
                                role="listitem"
                                className={`usage-bar-col${hovered === i ? ' hovered' : ''}`}
                                onMouseEnter={() => setHovered(i)}
                                onFocus={() => setHovered(i)}
                                onBlur={() => setHovered(null)}
                                tabIndex={0}
                                aria-label={label}
                            >
                                <div
                                    className="usage-bar"
                                    style={{ height: value === 0 ? 0 : `max(2px, ${pct}%)` }}
                                />
                                {hovered === i && (
                                    <div
                                        className={`usage-tooltip${i > daily.length / 2 ? ' align-right' : ''}`}
                                        style={{ bottom: `calc(${pct}% + 8px)` }}
                                        role="presentation"
                                    >
                                        <strong>{formatDay(d.date, { weekday: 'short', day: 'numeric', month: 'short' })}</strong>
                                        <span>ผู้ใช้งาน {formatNumber(d.activeUsers)} คน</span>
                                        <span>เข้าสู่ระบบ {formatNumber(d.logins)} ครั้ง</span>
                                        <span>เปิดหน้า {formatNumber(d.pageViews)} ครั้ง</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                <div className="usage-chart-xlabels" aria-hidden="true">
                    {daily.map((d, i) => (
                        <span key={d.date}>
                            {(i % labelEvery === 0 || i === daily.length - 1) && formatDay(d.date)}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Reads aggregated counts only — the events themselves are written by
// auth.hooks (logins) and UsageTracker (page views), see features/usage.
export default function AdminUsageTab() {
    const [days, setDays] = useState(30);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [metricKey, setMetricKey] = useState('activeUsers');

    useEffect(() => {
        setLoading(true);
        setError(null);
        getUsageStats(days)
            .then(setStats)
            .catch((err) => setError(err.response?.data?.message || 'ไม่สามารถโหลดสถิติการเข้าใช้งานได้'))
            .finally(() => setLoading(false));
    }, [days]);

    const metric = METRICS.find((m) => m.key === metricKey);

    const avgActiveUsers = useMemo(() => {
        if (!stats || stats.daily.length === 0) return 0;
        const sum = stats.daily.reduce((acc, d) => acc + d.activeUsers, 0);
        return Math.round((sum / stats.daily.length) * 10) / 10;
    }, [stats]);

    if (loading && !stats) {
        return (
            <div className="admin-section">
                <div className="admin-card">
                    <div className="skeleton-line w-40" />
                    <div className="skeleton-line w-80" style={{ marginTop: 16 }} />
                    <div className="skeleton-line w-60" style={{ marginTop: 12 }} />
                </div>
            </div>
        );
    }
    if (error) return <div className="error-banner">{error}</div>;

    const { totals, daily, topPages, topUsers, recentLogins } = stats;
    const hasData = totals.logins + totals.pageViews > 0;

    return (
        <div className="admin-section usage-section">
            <div className="admin-card">
                <div className="admin-card-header-row">
                    <div className="admin-card-header">
                        <div className="admin-card-icon">
                            <BarChart3 size={20} />
                        </div>
                        <div>
                            <h3>สถิติการเข้าใช้งานระบบ</h3>
                            <p className="admin-card-subtitle">
                                ย้อนหลัง {stats.days} วัน ({formatDay(daily[0].date, { dateStyle: 'medium' })} –{' '}
                                {formatDay(daily[daily.length - 1].date, { dateStyle: 'medium' })})
                            </p>
                        </div>
                    </div>
                    <div className="admin-scoms-filters">
                        <select
                            className="admin-group-filter"
                            value={days}
                            onChange={(e) => setDays(Number(e.target.value))}
                            aria-label="ช่วงเวลา"
                            disabled={loading}
                        >
                            {RANGE_OPTIONS.map((n) => (
                                <option key={n} value={n}>
                                    {n} วันล่าสุด
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="usage-stat-grid">
                    <div className="usage-stat">
                        <span className="usage-stat-label">
                            <Users size={14} /> ผู้ใช้งานในช่วงนี้
                        </span>
                        <span className="usage-stat-value">{formatNumber(totals.activeUsers)}</span>
                        <span className="usage-stat-note">จากบัญชีที่ใช้งานได้ {formatNumber(totals.totalUsers)} บัญชี</span>
                    </div>
                    <div className="usage-stat">
                        <span className="usage-stat-label">
                            <CalendarDays size={14} /> ผู้ใช้งานเฉลี่ยต่อวัน
                        </span>
                        <span className="usage-stat-value">{formatNumber(avgActiveUsers)}</span>
                        <span className="usage-stat-note">คน / วัน</span>
                    </div>
                    <div className="usage-stat">
                        <span className="usage-stat-label">
                            <LogIn size={14} /> เข้าสู่ระบบ
                        </span>
                        <span className="usage-stat-value">{formatNumber(totals.logins)}</span>
                        <span className="usage-stat-note">ครั้ง</span>
                    </div>
                    <div className="usage-stat">
                        <span className="usage-stat-label">
                            <MousePointerClick size={14} /> เปิดหน้าใช้งาน
                        </span>
                        <span className="usage-stat-value">{formatNumber(totals.pageViews)}</span>
                        <span className="usage-stat-note">ครั้ง</span>
                    </div>
                </div>

                <div className="usage-chart-header">
                    <h4>{metric.label}รายวัน</h4>
                    <div className="fb-status-tabs" role="tablist" aria-label="เลือกข้อมูลที่แสดงในกราฟ">
                        {METRICS.map(({ key, label, Icon }) => (
                            <button
                                key={key}
                                type="button"
                                role="tab"
                                aria-selected={metricKey === key}
                                className={`fb-status-tab${metricKey === key ? ' active' : ''}`}
                                onClick={() => setMetricKey(key)}
                            >
                                <Icon size={13} /> {label}
                            </button>
                        ))}
                    </div>
                </div>
                <UsageChart daily={daily} metric={metric} />

                <details className="usage-table-toggle">
                    <summary>ดูข้อมูลรายวันเป็นตาราง</summary>
                    <div className="table-scroll">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>วันที่</th>
                                    <th>ผู้ใช้งาน (คน)</th>
                                    <th>เข้าสู่ระบบ (ครั้ง)</th>
                                    <th>เปิดหน้า (ครั้ง)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...daily].reverse().map((d) => (
                                    <tr key={d.date}>
                                        <td>{formatDay(d.date, { dateStyle: 'medium' })}</td>
                                        <td>{formatNumber(d.activeUsers)}</td>
                                        <td>{formatNumber(d.logins)}</td>
                                        <td>{formatNumber(d.pageViews)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </details>

                {!hasData && (
                    <div className="admin-empty-state">
                        <Inbox size={32} />
                        <p>ยังไม่มีข้อมูลการเข้าใช้งานในช่วงเวลานี้</p>
                        <span className="field-hint">ระบบเริ่มเก็บสถิติตั้งแต่การเข้าสู่ระบบครั้งถัดไปของผู้ใช้งาน</span>
                    </div>
                )}
            </div>

            {hasData && (
                <div className="usage-two-col">
                    <div className="admin-card">
                        <h4 className="usage-card-title">หน้าที่เปิดใช้งานมากที่สุด</h4>
                        <div className="table-scroll">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>หน้า</th>
                                        <th>เปิด (ครั้ง)</th>
                                        <th>ผู้ใช้งาน (คน)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topPages.map((p) => (
                                        <tr key={p.path}>
                                            <td title={p.path}>{pageLabel(p.path)}</td>
                                            <td>{formatNumber(p.views)}</td>
                                            <td>{formatNumber(p.users)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="admin-card">
                        <h4 className="usage-card-title">ผู้ใช้งานที่ใช้งานมากที่สุด</h4>
                        <div className="table-scroll">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>ผู้ใช้งาน</th>
                                        <th>เข้าสู่ระบบ</th>
                                        <th>เปิดหน้า</th>
                                        <th>ใช้งานล่าสุด</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topUsers.map((u) => (
                                        <tr key={u.userId}>
                                            <td>
                                                <div className="cell-primary">{displayName(u)}</div>
                                                {u.deptName && <div className="cell-secondary">{u.deptName}</div>}
                                            </td>
                                            <td>{formatNumber(u.logins)}</td>
                                            <td>{formatNumber(u.pageViews)}</td>
                                            <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(u.lastSeen)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {recentLogins.length > 0 && (
                <div className="admin-card">
                    <h4 className="usage-card-title">การเข้าสู่ระบบล่าสุด</h4>
                    <div className="table-scroll">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>วันที่</th>
                                    <th>ผู้ใช้งาน</th>
                                    <th>หน่วยงาน</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentLogins.map((l, i) => (
                                    <tr key={`${l.userId}-${l.createdAt}-${i}`}>
                                        <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(l.createdAt)}</td>
                                        <td>{displayName(l)}</td>
                                        <td>{l.deptName || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
