import { useEffect, useMemo, useState } from 'react';
import {
    Wrench,
    ListChecks,
    Search,
    Pencil,
    Trash2,
    Inbox,
    SearchX,
    ChevronLeft,
    ChevronRight,
    Eye,
    EyeOff,
} from 'lucide-react';
import { useScoms } from '../scoms/useScoms';
import ScomFormBody from './ScomFormBody';
import ScomEditModal from './ScomEditModal';

const PAGE_SIZE = 20;

const emptyForm = {
    ID: '',
    Group: '',
    Scoms: '',
    Symptom: '',
    CheckPoint: '',
    Steps: '',
    NormalValue: '',
    Equipment: '',
};

function normalize(str) {
    return (str || '').toLowerCase();
}

// Deterministic color per group name (same group always gets the same badge
// color) so the "กลุ่มอาการ" column reads at a glance instead of as plain
// text — mirrors the reference table's colored Group pills.
function groupBadgeClass(group) {
    if (!group) return 'group-badge-0';
    let hash = 0;
    for (let i = 0; i < group.length; i++) {
        hash = (hash * 31 + group.charCodeAt(i)) >>> 0;
    }
    return `group-badge-${hash % 6}`;
}

// Simple 1-neighbor windowed pager: 1 ... p-1 p p+1 ... total, so a large
// result set doesn't spill dozens of page buttons across the card.
function getPageNumbers(current, total) {
    const delta = 1;
    const pages = [1];
    const start = Math.max(2, current - delta);
    const end = Math.min(total - 1, current + delta);
    if (start > 2) pages.push('...');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < total - 1) pages.push('...');
    if (total > 1) pages.push(total);
    return pages;
}

export default function AdminScomsTab() {
    const { scoms, loading, error, refresh, createScom, updateScom, deleteScom } = useScoms();
    const [form, setForm] = useState(emptyForm);
    const [formStep, setFormStep] = useState(1);
    const [newGroupInput, setNewGroupInput] = useState('');
    const [formError, setFormError] = useState(null);
    const [search, setSearch] = useState('');
    const [groupFilter, setGroupFilter] = useState('all');
    const [deletingId, setDeletingId] = useState(null);
    const [togglingId, setTogglingId] = useState(null);
    const [page, setPage] = useState(1);
    // "แก้ไข" opens ScomEditModal instead of populating the inline form below —
    // holding the full record (not just an id) lets the modal seed its own
    // form state without waiting on a lookup.
    const [editingItem, setEditingItem] = useState(null);

    const groupOptions = useMemo(() => {
        const seen = new Set();
        scoms.forEach((item) => {
            if (item.Group) seen.add(item.Group);
        });
        return Array.from(seen).sort((a, b) => a.localeCompare(b, 'th'));
    }, [scoms]);

    // Options come only from the Scoms already saved in the database. The list
    // holds every distinct Group + ID + Scoms combination — the same grouping
    // the table below shows — because the data repeats each combination once
    // per saved record, and one ID can carry several titles.
    const scomPairs = useMemo(() => {
        const seen = new Map();
        scoms.forEach((item) => {
            if (!item?.ID || !item?.Scoms) return;
            const key = `${item.Group || ''}|${item.ID}|${item.Scoms}`;
            if (!seen.has(key)) seen.set(key, { ID: item.ID, Group: item.Group || '', Scoms: item.Scoms });
        });
        return Array.from(seen.values()).sort(
            (a, b) => a.ID.localeCompare(b.ID, 'en', { numeric: true }) || a.Scoms.localeCompare(b.Scoms, 'th')
        );
    }, [scoms]);

    const filteredScoms = useMemo(() => {
        const q = normalize(search.trim());
        let base = groupFilter === 'all' ? scoms : scoms.filter((item) => item.Group === groupFilter);
        if (q) {
            base = base.filter((item) =>
                [item.ID, item.Group, item.Scoms, item.Symptom].some((field) => normalize(field).includes(q))
            );
        }
        // Newest first — "รายการล่าสุด" means most recently added, not ID order.
        return [...base].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }, [scoms, search, groupFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredScoms.length / PAGE_SIZE));
    const pagedScoms = filteredScoms.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const rangeStart = filteredScoms.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const rangeEnd = Math.min(page * PAGE_SIZE, filteredScoms.length);

    // Reset to page 1 whenever the search term or group filter changes so a
    // filter never leaves the view stranded on a now-empty later page.
    useEffect(() => {
        setPage(1);
    }, [search, groupFilter]);

    function resetForm() {
        setForm(emptyForm);
        setNewGroupInput('');
        setFormStep(1);
        setFormError(null);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setFormError(null);
        try {
            await createScom(form);
            resetForm();
        } catch (err) {
            setFormError(err.response?.data?.message || 'บันทึกไม่สำเร็จ');
        }
    }

    async function handleDelete(id) {
        if (!window.confirm('ต้องการลบข้อมูลนี้ใช่หรือไม่? การลบไม่สามารถย้อนกลับได้')) return;
        setDeletingId(id);
        try {
            await deleteScom(id);
        } catch (err) {
            setFormError(err.response?.data?.message || 'ลบข้อมูลไม่สำเร็จ');
        } finally {
            setDeletingId(null);
        }
    }

    // Hidden Scoms stay fully visible/editable here for admins — only the
    // user-facing troubleshoot list excludes them (filtered server-side by
    // role, see scoms.service.js getAll).
    async function handleToggleHidden(item) {
        const nextHidden = !item.hidden;
        const confirmMessage = nextHidden
            ? `ต้องการซ่อนรายการ "${item.ID}" ใช่หรือไม่? กด OK เพื่อบันทึก`
            : `ต้องการยกเลิกการซ่อนรายการ "${item.ID}" ใช่หรือไม่? กด OK เพื่อบันทึก`;
        if (!window.confirm(confirmMessage)) return;

        setTogglingId(item._id);
        try {
            await updateScom(item._id, { hidden: nextHidden });
        } catch (err) {
            setFormError(err.response?.data?.message || 'อัปเดตสถานะการซ่อนไม่สำเร็จ');
        } finally {
            setTogglingId(null);
        }
    }

    // Only block the whole tab behind a skeleton before the first fetch
    // resolves. Later refetches (after create/edit/delete) also set
    // `loading`, but the table already holds the previous data — bailing out
    // here would unmount and remount the table, replaying every row's
    // entrance animation and reading as a flicker.
    if (loading && scoms.length === 0) {
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

    return (
        <>
            <div className="admin-section">
                <form className="admin-form" onSubmit={handleSubmit}>
                    <div className="admin-card-header">
                        <div className="admin-card-icon">
                            <Wrench size={20} />
                        </div>
                        <div>
                            <h3>เพิ่ม Scom ใหม่</h3>
                            <p className="admin-card-subtitle">
                                {formStep === 1
                                    ? 'ขั้นตอนที่ 1: เลือกกลุ่มอาการเสีย (Group) ก่อน'
                                    : 'ขั้นตอนที่ 2: กรอกอาการและขั้นตอนการแก้ไข'}
                            </p>
                        </div>
                    </div>

                    {formError && <div className="error-banner">{formError}</div>}

                    <ScomFormBody
                        mode="add"
                        form={form}
                        setForm={setForm}
                        formStep={formStep}
                        setFormStep={setFormStep}
                        newGroupInput={newGroupInput}
                        setNewGroupInput={setNewGroupInput}
                        groupOptions={groupOptions}
                        scomPairs={scomPairs}
                        onUploadImage={null}
                        onCancel={resetForm}
                    />
                </form>

                <div className="admin-card">
                    <div className="admin-card-header-row">
                        <div className="admin-card-header">
                            <div className="admin-card-icon">
                                <ListChecks size={20} />
                            </div>
                            <div>
                                <div className="admin-card-title-row">
                                    <h3>รายการ Scom ทั้งหมด</h3>
                                    <span className="admin-count-badge">{scoms.length} รายการ</span>
                                </div>
                                <p className="admin-card-subtitle">
                                    {groupFilter === 'all' && !search.trim() && 'แสดงรายการล่าสุด'}
                                    {groupFilter !== 'all' && `กลุ่ม "${groupFilter}" ${filteredScoms.length} รายการ`}
                                    {search.trim() &&
                                        `${groupFilter !== 'all' ? ' · ' : ''}พบ ${filteredScoms.length} รายการที่ตรงกับการค้นหา`}
                                    {filteredScoms.length > PAGE_SIZE && ` · หน้า ${page}/${totalPages}`}
                                </p>
                            </div>
                        </div>
                        <div className="admin-scoms-filters">
                            <select
                                className="admin-group-filter"
                                value={groupFilter}
                                onChange={(e) => setGroupFilter(e.target.value)}
                                aria-label="กรองตามกลุ่ม"
                            >
                                <option value="all">ทุกกลุ่ม</option>
                                {groupOptions.map((g) => (
                                    <option key={g} value={g}>
                                        {g}
                                    </option>
                                ))}
                            </select>
                            <div className="admin-search-box">
                                <Search size={16} className="admin-search-icon" />
                                <input
                                    type="search"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="ค้นหา ID, กลุ่ม, หัวข้อ หรืออาการ..."
                                    aria-label="ค้นหา Scom"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="table-scroll">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>รหัส ID</th>
                                    <th>กลุ่มอาการ (Group)</th>
                                    <th>Scoms</th>
                                    <th>อาการที่พบ (Symptom)</th>
                                    <th>จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pagedScoms.map((item) => (
                                    <tr key={item._id} className={item.hidden ? 'row-hidden' : undefined}>
                                        <td>
                                            <span className="scom-id-cell">#{item.ID}</span>
                                            {item.hidden && <span className="hidden-badge">ซ่อนอยู่</span>}
                                        </td>
                                        <td>
                                            {item.Group && (
                                                <span className={`group-badge ${groupBadgeClass(item.Group)}`}>{item.Group}</span>
                                            )}
                                        </td>
                                        <td>
                                            <span className="scom-title-cell">{item.Scoms}</span>
                                        </td>
                                        <td>{item.Symptom}</td>
                                        <td>
                                            <div className="row-actions">
                                                <button
                                                    className="icon-action-btn"
                                                    onClick={() => setEditingItem(item)}
                                                    aria-label={`แก้ไข ${item.ID}`}
                                                    title="แก้ไข"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    className={`icon-action-btn ${item.hidden ? 'success' : 'muted'}`}
                                                    onClick={() => handleToggleHidden(item)}
                                                    disabled={togglingId === item._id}
                                                    aria-label={item.hidden ? `แสดง ${item.ID}` : `ซ่อน ${item.ID}`}
                                                    title={item.hidden ? 'แสดง' : 'ซ่อน'}
                                                >
                                                    {item.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                                                </button>
                                                <button
                                                    className="icon-action-btn danger"
                                                    onClick={() => handleDelete(item._id)}
                                                    disabled={deletingId === item._id}
                                                    aria-label={`ลบ ${item.ID}`}
                                                    title="ลบ"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {filteredScoms.length === 0 && scoms.length > 0 && (
                            <div className="admin-empty-state">
                                <SearchX size={32} />
                                <p>
                                    {search.trim()
                                        ? `ไม่พบรายการที่ตรงกับ "${search}"`
                                        : `ไม่พบรายการในกลุ่ม "${groupFilter}"`}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearch('');
                                        setGroupFilter('all');
                                    }}
                                >
                                    ล้างตัวกรอง
                                </button>
                            </div>
                        )}

                        {scoms.length === 0 && (
                            <div className="admin-empty-state">
                                <Inbox size={32} />
                                <p>ยังไม่มีข้อมูล Scom ในระบบ</p>
                                <span className="field-hint">เพิ่มรายการแรกได้จากฟอร์มด้านบน</span>
                            </div>
                        )}
                    </div>

                    {totalPages > 1 && (
                        <div className="admin-pagination">
                            <span className="admin-pagination-range">
                                แสดง {rangeStart} ถึง {rangeEnd} จาก {filteredScoms.length} รายการ
                            </span>
                            <div className="admin-pagination-controls">
                                <button
                                    type="button"
                                    className="admin-page-nav"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    aria-label="หน้าก่อนหน้า"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                {getPageNumbers(page, totalPages).map((p, idx) =>
                                    p === '...' ? (
                                        <span key={`ellipsis-${idx}`} className="admin-pagination-ellipsis">
                                            …
                                        </span>
                                    ) : (
                                        <button
                                            type="button"
                                            key={p}
                                            className={`admin-page-number${p === page ? ' active' : ''}`}
                                            onClick={() => setPage(p)}
                                            aria-current={p === page ? 'page' : undefined}
                                            aria-label={`หน้า ${p}`}
                                        >
                                            {p}
                                        </button>
                                    )
                                )}
                                <button
                                    type="button"
                                    className="admin-page-nav"
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    aria-label="หน้าถัดไป"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {editingItem && (
                <ScomEditModal
                    item={editingItem}
                    groupOptions={groupOptions}
                    scomPairs={scomPairs}
                    onClose={() => setEditingItem(null)}
                    onSave={(payload) => updateScom(editingItem._id, payload)}
                    onImagesChanged={refresh}
                />
            )}
        </>
    );
}
