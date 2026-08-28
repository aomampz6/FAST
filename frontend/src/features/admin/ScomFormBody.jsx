import { useMemo } from 'react';
import { ChevronRight, ArrowLeft, FolderTree, Plus, Save, Trash2, X } from 'lucide-react';
import RichTextField from './RichTextField';

const EMPTY_STEP = { StepTitle: '', Description: '' };

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

const REQUIRED_FIELDS = ['ID', 'Group', 'Scoms'];

/**
 * The step-1 (pick Group) / step-2 (fill fields) Scom wizard body, shared by
 * AdminScomsTab's inline "add new" card and ScomEditModal's popup — the two
 * flows differ only in chrome (header, submit label, where it's rendered),
 * not in the wizard logic or the fields themselves. Must be rendered inside
 * a <form onSubmit={...}> by the caller — this component renders fieldsets
 * and the submit/cancel row, not the <form> tag itself.
 */
export default function ScomFormBody({
    mode,
    form,
    setForm,
    formStep,
    setFormStep,
    newGroupInput,
    setNewGroupInput,
    groupOptions,
    scomPairs,
    onUploadImage,
    submitting,
    onCancel,
}) {
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

    function addStep() {
        setForm((prev) => ({ ...prev, StepItems: [...prev.StepItems, { ...EMPTY_STEP }] }));
    }

    function removeStep(index) {
        setForm((prev) => ({ ...prev, StepItems: prev.StepItems.filter((_, i) => i !== index) }));
    }

    function updateStep(index, patch) {
        setForm((prev) => ({
            ...prev,
            StepItems: prev.StepItems.map((step, i) => (i === index ? { ...step, ...patch } : step)),
        }));
    }

    if (formStep === 1) {
        return (
            <fieldset className="admin-fieldset">
                <legend>เลือกกลุ่มอาการเสีย (Group)</legend>
                {groupOptions.length > 0 ? (
                    <div className="admin-group-picker">
                        {groupOptions.map((g) => (
                            <button type="button" key={g} className="admin-group-option" onClick={() => pickGroup(g)}>
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
        );
    }

    return (
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
                        <select value={form.ID} onChange={(e) => pickId(e.target.value)} required>
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
                        <select value={form.Scoms} onChange={(e) => pickScomsTitle(e.target.value)} required>
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
                        <span className="field-label-row">ขั้นตอนแก้ไข (Steps)</span>
                        <div className="scom-steps-editor">
                            {form.StepItems.map((step, index) => (
                                <div className="scom-step-item" key={index}>
                                    <div className="scom-step-item-header">
                                        <span className="scom-step-item-index">ขั้นตอนที่ {index + 1}</span>
                                        <button
                                            type="button"
                                            className="icon-action-btn danger"
                                            onClick={() => removeStep(index)}
                                            title="ลบขั้นตอนนี้"
                                            aria-label={`ลบขั้นตอนที่ ${index + 1}`}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <label>
                                        <span className="field-label-row">หัวข้อขั้นตอน (Step Title)</span>
                                        <input
                                            value={step.StepTitle}
                                            onChange={(e) => updateStep(index, { StepTitle: e.target.value })}
                                            placeholder="เช่น ตรวจสอบ PPPoE Account"
                                        />
                                    </label>
                                    <div className="field-block">
                                        <span className="field-label-row">คำอธิบาย (Description)</span>
                                        <RichTextField
                                            value={step.Description}
                                            onChange={(html) => updateStep(index, { Description: html })}
                                            onUploadImage={onUploadImage}
                                            placeholder="อธิบายรายละเอียดของขั้นตอนนี้..."
                                        />
                                    </div>
                                </div>
                            ))}
                            {form.StepItems.length === 0 && (
                                <p className="field-hint">ยังไม่มีขั้นตอน — กด "เพิ่มขั้นตอน" ด้านล่างเพื่อเริ่มต้น</p>
                            )}
                        </div>
                        <button type="button" className="btn-secondary" onClick={addStep}>
                            <Plus size={14} /> เพิ่มขั้นตอน
                        </button>
                    </div>
                </div>
            </fieldset>

            <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={submitting}>
                    {mode === 'edit' ? <Save size={16} /> : <Plus size={16} />}
                    {submitting ? 'กำลังบันทึก...' : mode === 'edit' ? 'บันทึกการแก้ไข' : 'เพิ่มข้อมูล'}
                </button>
                <button type="button" onClick={onCancel} disabled={submitting}>
                    <X size={16} /> ยกเลิก
                </button>
            </div>
        </>
    );
}
