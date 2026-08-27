import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Wrench,
    ListChecks,
    Search,
    Pencil,
    Trash2,
    Plus,
    Save,
    X,
    Inbox,
    SearchX,
    ChevronLeft,
    ChevronRight,
    Eye,
    EyeOff,
    FolderTree,
    ArrowLeft,
} from 'lucide-react';
import { useScoms } from '../scoms/useScoms';
import { addScomImages, getScomImageUrl } from '../scoms/scomsService';
import RichTextField from './RichTextField';

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

const REQUIRED_FIELDS = ['ID', 'Group', 'Scoms'];

// Primary fields identify the record; detail fields describe the fix. Split
// into two visual groups instead of one flat grid so the form reads as
// "what is this" then "how do you fix it" rather than 8 identical-looking
// inputs in a row. Group itself is chosen in its own wizard step before
// these render — see formStep below.
//
// ID and Scoms are no longer free text — they are two views of the same saved
// record and render as linked <select>s above this grid, so only the
// remaining free-text identity field lives here.
const PRIMARY_FIELDS = [
    { key: 'Symptom', label: 'Symptom (อาการ)', hint: 'อาการที่ผู้ใช้งานพบเจอ', span: 1 },
];

const DETAIL_FIELDS = [
    { key: 'CheckPoint', label: 'CheckPoint (จุดตรวจสอบ)', hint: 'จุดแรกที่ต้องเช็คก่อนแก้ไข' },
    { key: 'NormalValue', label: 'NormalValue (ค่าปกติ)', hint: 'ค่ามาตรฐานเมื่ออุปกรณ์ทำงานปกติ' },
    { key: 'Equipment', label: 'Equipment (อุปกรณ์)', hint: 'อุปกรณ์ที่เกี่ยวข้อง' },
];

function normalize(str) {
    return (str || '').toLowerCase();
}

export default function AdminScomsTab() {
    const { scoms, loading, error, refresh, createScom, updateScom, deleteScom } = useScoms();
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [formStep, setFormStep] = useState(1);
    const [newGroupInput, setNewGroupInput] = useState('');
    const [formError, setFormError] = useState(null);
    const [search, setSearch] = useState('');
    const [groupFilter, setGroupFilter] = useState('all');
    const [deletingId, setDeletingId] = useState(null);
    const [togglingId, setTogglingId] = useState(null);
    const [page, setPage] = useState(1);
    const formRef = useRef(null);

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

    // Codes narrow to the group chosen in step 1. A brand new group has no
    // codes yet, so fall back to the full list rather than an empty dropdown.
    const idOptions = useMemo(() => {
        const inGroup = scomPairs.filter((p) => p.Group === form.Group);
        const source = inGroup.length > 0 ? inGroup : scomPairs;
        return Array.from(new Set(source.map((p) => p.ID)));
    }, [scomPairs, form.Group]);

    // Once an ID is picked the title list narrows to that code's own titles.
    // With no ID chosen yet, every title inside the current group is offered
    // so the admin can start from either box.
    const scomsOptions = useMemo(() => {
        if (form.ID) return scomPairs.filter((p) => p.ID === form.ID);
        const inGroup = scomPairs.filter((p) => p.Group === form.Group);
        return inGroup.length > 0 ? inGroup : scomPairs;
    }, [scomPairs, form.ID, form.Group]);

    // Auto-sync, ID side: keep the current title if it belongs to the new
    // code, otherwise take the code's only title, or clear the box so the
    // admin picks from the narrowed list. The group follows the code too, so
    // ID / Group / Scoms always stay one row of the table below.
    function pickId(id) {
        const rows = scomPairs.filter((p) => p.ID === id);
        const titles = rows.map((p) => p.Scoms);
        setForm((prev) => ({
            ...prev,
            ID: id,
            Group: rows[0]?.Group || prev.Group,
            Scoms: titles.includes(prev.Scoms) ? prev.Scoms : titles.length === 1 ? titles[0] : '',
        }));
    }

    // Auto-sync, title side: a title always resolves to its own code and
    // group. Search within the selected ID first so a title shared by two
    // codes does not yank the ID box to the other one.
    function pickScomsTitle(title) {
        const match =
            scomPairs.find((p) => p.Scoms === title && p.ID === form.ID) ||
            scomPairs.find((p) => p.Scoms === title);
        setForm((prev) => ({
            ...prev,
            Scoms: title,
            ID: match ? match.ID : prev.ID,
            Group: match?.Group || prev.Group,
        }));
    }

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

    // Reset to page 1 whenever the search term or group filter changes so a
    // filter never leaves the view stranded on a now-empty later page.
    useEffect(() => {
        setPage(1);
    }, [search, groupFilter]);

    function startEdit(item) {
        setEditingId(item._id);
        setForm({
            ID: item.ID || '',
            Group: item.Group || '',
            Scoms: item.Scoms || '',
            Symptom: item.Symptom || '',
            CheckPoint: item.CheckPoint || '',
            Steps: item.Steps || '',
            NormalValue: item.NormalValue || '',
            Equipment: item.Equipment || '',
        });
        // Editing an existing entry already has a group — skip straight to
        // the detail fields; "เปลี่ยนกลุ่ม" still lets them go back to step 1.
        setFormStep(2);
        setFormError(null);
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function resetForm() {
        setEditingId(null);
        setForm(emptyForm);
        setNewGroupInput('');
        setFormStep(1);
        setFormError(null);
    }

    function pickGroup(groupName) {
        setForm((prev) => ({ ...prev, Group: groupName }));
        setFormStep(2);
    }

    function confirmNewGroup() {
        const name = newGroupInput.trim();
        if (!name) return;
        pickGroup(name);
    }

    function changeGroup() {
        setNewGroupInput('');
        setFormStep(1);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setFormError(null);
        try {
            if (editingId) {
                await updateScom(editingId, form);
            } else {
                await createScom(form);
            }
            resetForm();
        } catch (err) {
            setFormError(err.response?.data?.message || 'บันทึกไม่สำเร็จ');
        }
    }

    // Used by the Steps rich text editor's image button/paste/drop — goes
    // straight to the service function (not the useScoms wrapper) so it can
    // read back the newly attached image's key and hand the editor a URL to
    // insert, then refreshes the list separately (same pattern as
    // AdminOnuConfigsTab's handleInlineImageUpload).
    async function handleInlineImageUpload(file) {
        if (!editingId) throw new Error('บันทึกข้อมูลก่อน แล้วจึงแทรกรูปภาพได้');
        const updated = await addScomImages(editingId, [file]);
        refresh();
        const last = updated.Images[updated.Images.length - 1];
        return getScomImageUrl(last.key);
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
        <div className="admin-section">
            <form className="admin-form" onSubmit={handleSubmit} ref={formRef}>
                <div className="admin-card-header">
                    <div className="admin-card-icon">
                        <Wrench size={20} />
                    </div>
                    <div>
                        <h3>{editingId ? 'แก้ไขข้อมูล Scom' : 'เพิ่ม Scom ใหม่'}</h3>
                        <p className="admin-card-subtitle">
                            {formStep === 1
                                ? 'ขั้นตอนที่ 1: เลือกกลุ่มอาการเสีย (Group) ก่อน'
                                : 'ขั้นตอนที่ 2: กรอกอาการและขั้นตอนการแก้ไข'}
                        </p>
                    </div>
                </div>

                {formError && <div className="error-banner">{formError}</div>}

                {formStep === 1 ? (
                    <fieldset className="admin-fieldset">
                        <legend>เลือกกลุ่มอาการเสีย (Group)</legend>
                        {groupOptions.length > 0 ? (
                            <div className="admin-group-picker">
                                {groupOptions.map((g) => (
                                    <button
                                        type="button"
                                        key={g}
                                        className="admin-group-option"
                                        onClick={() => pickGroup(g)}
                                    >
                                        <FolderTree size={16} />
                                        {g}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className="field-hint">ยังไม่มีกลุ่มในระบบ — เพิ่มกลุ่มแรกด้านล่าง</p>
                        )}

                        <div className="admin-group-new">
                            <input
                                value={newGroupInput}
                                onChange={(e) => setNewGroupInput(e.target.value)}
                                placeholder="หรือพิมพ์ชื่อกลุ่มใหม่ เช่น Disconnect บ่อย"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        confirmNewGroup();
                                    }
                                }}
                            />
                            <button type="button" className="btn-secondary" onClick={confirmNewGroup} disabled={!newGroupInput.trim()}>
                                ใช้กลุ่มนี้ <ChevronRight size={16} />
                            </button>
                        </div>
                    </fieldset>
                ) : (
                    <>
                        <div className="admin-selected-group">
                            <span>
                                <FolderTree size={16} /> กลุ่ม: <strong>{form.Group}</strong>
                            </span>
                            <button type="button" onClick={changeGroup}>
                                <ArrowLeft size={14} /> เปลี่ยนกลุ่ม
                            </button>
                        </div>

                        <fieldset className="admin-fieldset">
                            <legend>ข้อมูลระบุตัวตน</legend>
                            <div className="form-grid">
                                <label>
                                    <span className="field-label-row">
                                        ID<span className="required-mark">*</span>
                                    </span>
                                    <select
                                        value={form.ID}
                                        onChange={(e) => pickId(e.target.value)}
                                        required
                                    >
                                        <option value="">-- เลือกรหัส --</option>
                                        {idOptions.map((id) => (
                                            <option key={id} value={id}>
                                                {id}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label>
                                    <span className="field-label-row">
                                        Scoms (หัวข้อ)<span className="required-mark">*</span>
                                    </span>
                                    <select
                                        value={form.Scoms}
                                        onChange={(e) => pickScomsTitle(e.target.value)}
                                        required
                                    >
                                        <option value="">-- เลือกหัวข้ออาการเสีย --</option>
                                        {scomsOptions.map((o) => (
                                            <option key={`${o.ID} ${o.Scoms}`} value={o.Scoms}>
                                                {o.Scoms}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                {PRIMARY_FIELDS.map(({ key, label, hint }) => (
                                    <label key={key}>
                                        <span className="field-label-row">
                                            {label}
                                            {REQUIRED_FIELDS.includes(key) && <span className="required-mark">*</span>}
                                        </span>
                                        <input
                                            value={form[key]}
                                            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                                            required={REQUIRED_FIELDS.includes(key)}
                                            placeholder={hint}
                                        />
                                    </label>
                                ))}
                            </div>
                        </fieldset>

                        <fieldset className="admin-fieldset">
                            <legend>รายละเอียดการแก้ไข</legend>
                            <div className="form-grid">
                                {DETAIL_FIELDS.map(({ key, label, hint }) => (
                                    <label key={key}>
                                        <span className="field-label-row">{label}</span>
                                        <input
                                            value={form[key]}
                                            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                                            placeholder={hint}
                                        />
                                    </label>
                                ))}
                                {/* A plain <div>, not <label> — see AdminOnuConfigsTab's Details
                                    field for why: a bare <label> forwards clicks to its first
                                    labelable descendant (the toolbar's <select>), stealing focus
                                    from the editor's contentEditable area. */}
                                <div className="field-block" style={{ gridColumn: '1 / -1' }}>
                                    <span className="field-label-row">Steps (ขั้นตอนแก้ไข)</span>
                                    <RichTextField
                                        value={form.Steps}
                                        onChange={(html) => setForm({ ...form, Steps: html })}
                                        onUploadImage={editingId ? handleInlineImageUpload : null}
                                        placeholder="ขึ้นบรรทัดใหม่ทุกขั้นตอน เช่น ตรวจสอบสายไฟเบอร์ / รีสตาร์ทอุปกรณ์"
                                    />
                                    <span className="field-hint">แต่ละบรรทัด/ย่อหน้าจะแสดงเป็นหนึ่งขั้นตอนในระบบ</span>
                                </div>
                            </div>
                        </fieldset>

                        <div className="form-actions">
                            <button type="submit" className="btn-primary">
                                {editingId ? <Save size={16} /> : <Plus size={16} />}
                                {editingId ? 'บันทึกการแก้ไข' : 'เพิ่มข้อมูล'}
                            </button>
                            <button type="button" onClick={resetForm}>
                                <X size={16} /> ยกเลิก
                            </button>
                        </div>
                    </>
                )}
            </form>

            <div className="admin-card">
                <div className="admin-card-header-row">
                    <div className="admin-card-header">
                        <div className="admin-card-icon">
                            <ListChecks size={20} />
                        </div>
                        <div>
                            <h3>รายการ Scom ทั้งหมด</h3>
                            <p className="admin-card-subtitle">
                                {scoms.length} รายการทั้งหมด
                                {groupFilter !== 'all' && ` · กลุ่ม "${groupFilter}" ${filteredScoms.length} รายการ`}
                                {search.trim() && ` · พบ ${filteredScoms.length} รายการที่ตรงกับการค้นหา`}
                                {filteredScoms.length > PAGE_SIZE &&
                                    ` · แสดงล่าสุด ${PAGE_SIZE} รายการ (หน้า ${page}/${totalPages})`}
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
                                <th>ID</th>
                                <th>Group</th>
                                <th>Scoms</th>
                                <th>Symptom</th>
                                <th>การดำเนินการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pagedScoms.map((item) => (
                                <tr key={item._id} className={item.hidden ? 'row-hidden' : undefined}>
                                    <td>
                                        {item.ID}
                                        {item.hidden && <span className="hidden-badge">ซ่อนอยู่</span>}
                                    </td>
                                    <td>{item.Group}</td>
                                    <td>{item.Scoms}</td>
                                    <td>{item.Symptom}</td>
                                    <td>
                                        <button onClick={() => startEdit(item)} aria-label={`แก้ไข ${item.ID}`}>
                                            <Pencil size={14} /> แก้ไข
                                        </button>
                                        <button
                                            className={item.hidden ? 'success' : 'muted'}
                                            onClick={() => handleToggleHidden(item)}
                                            disabled={togglingId === item._id}
                                            aria-label={item.hidden ? `แสดง ${item.ID}` : `ซ่อน ${item.ID}`}
                                        >
                                            {item.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                                            {item.hidden ? 'แสดง' : 'ซ่อน'}
                                        </button>
                                        <button
                                            className="danger"
                                            onClick={() => handleDelete(item._id)}
                                            disabled={deletingId === item._id}
                                            aria-label={`ลบ ${item.ID}`}
                                        >
                                            <Trash2 size={14} /> ลบ
                                        </button>
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
                        <button
                            type="button"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            aria-label="หน้าก่อนหน้า"
                        >
                            <ChevronLeft size={16} /> ก่อนหน้า
                        </button>
                        <span className="admin-pagination-indicator">
                            หน้า {page} / {totalPages}
                        </span>
                        <button
                            type="button"
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            aria-label="หน้าถัดไป"
                        >
                            ถัดไป <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
