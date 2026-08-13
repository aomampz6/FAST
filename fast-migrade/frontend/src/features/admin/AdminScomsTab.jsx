import { useMemo, useRef, useState } from 'react';
import { Wrench, ListChecks, Search, Pencil, Trash2, Plus, Save, X, Inbox, SearchX } from 'lucide-react';
import { useScoms } from '../scoms/useScoms';

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
// inputs in a row.
const PRIMARY_FIELDS = [
    { key: 'ID', label: 'ID', hint: 'เช่น U0001', span: 1 },
    { key: 'Group', label: 'Group (กลุ่ม)', hint: 'กลุ่มอาการเสีย เช่น Disconnect บ่อย', span: 1 },
    { key: 'Scoms', label: 'Scoms (หัวข้อ)', hint: 'หัวข้อสั้นๆ ของ Scom นี้', span: 1 },
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
    const { scoms, loading, error, createScom, updateScom, deleteScom } = useScoms();
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [formError, setFormError] = useState(null);
    const [search, setSearch] = useState('');
    const [deletingId, setDeletingId] = useState(null);
    const formRef = useRef(null);

    const filteredScoms = useMemo(() => {
        const q = normalize(search.trim());
        if (!q) return scoms;
        return scoms.filter((item) =>
            [item.ID, item.Group, item.Scoms, item.Symptom].some((field) => normalize(field).includes(q))
        );
    }, [scoms, search]);

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
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function resetForm() {
        setEditingId(null);
        setForm(emptyForm);
        setFormError(null);
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
                            ข้อมูลอาการเสียและขั้นตอนการแก้ไขปัญหาที่ผู้ใช้งานจะเห็นในหน้าตรวจสอบงานเสีย
                        </p>
                    </div>
                </div>

                {formError && <div className="error-banner">{formError}</div>}

                <fieldset className="admin-fieldset">
                    <legend>ข้อมูลระบุตัวตน</legend>
                    <div className="form-grid">
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
                        <label style={{ gridColumn: '1 / -1' }}>
                            <span className="field-label-row">Steps (ขั้นตอนแก้ไข)</span>
                            <textarea
                                value={form.Steps}
                                onChange={(e) => setForm({ ...form, Steps: e.target.value })}
                                placeholder={'ขึ้นบรรทัดใหม่ทุกขั้นตอน เช่น\nตรวจสอบสายไฟเบอร์\nรีสตาร์ทอุปกรณ์'}
                                rows={5}
                            />
                            <span className="field-hint">แต่ละบรรทัดจะแสดงเป็นหนึ่งขั้นตอนในระบบ</span>
                        </label>
                    </div>
                </fieldset>

                <div className="form-actions">
                    <button type="submit" className="btn-primary">
                        {editingId ? <Save size={16} /> : <Plus size={16} />}
                        {editingId ? 'บันทึกการแก้ไข' : 'เพิ่มข้อมูล'}
                    </button>
                    {editingId && (
                        <button type="button" onClick={resetForm}>
                            <X size={16} /> ยกเลิก
                        </button>
                    )}
                </div>
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
                                {search.trim() && ` · พบ ${filteredScoms.length} รายการที่ตรงกับการค้นหา`}
                            </p>
                        </div>
                    </div>
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
                            {filteredScoms.map((item) => (
                                <tr key={item._id}>
                                    <td>{item.ID}</td>
                                    <td>{item.Group}</td>
                                    <td>{item.Scoms}</td>
                                    <td>{item.Symptom}</td>
                                    <td>
                                        <button onClick={() => startEdit(item)} aria-label={`แก้ไข ${item.ID}`}>
                                            <Pencil size={14} /> แก้ไข
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
                            <p>ไม่พบรายการที่ตรงกับ "{search}"</p>
                            <button type="button" onClick={() => setSearch('')}>
                                ล้างการค้นหา
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
            </div>
        </div>
    );
}
