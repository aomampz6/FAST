import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Wrench, X } from 'lucide-react';
import { addScomImages, getScomImageUrl } from '../scoms/scomsService';
import ScomFormBody from './ScomFormBody';

/**
 * Popup editor for a single Scom record, opened from the table's "แก้ไข"
 * button. Reuses ScomFormBody (the same step-1/step-2 wizard the "add new"
 * card uses) around its own local form state seeded from `item`, so editing
 * no longer scrolls the admin up to the shared inline form.
 *
 * Rendered through a portal on document.body, not inside `.admin-page` (see
 * UserEditModal for the same pattern): `.admin-section` animates `transform`,
 * which would make it the containing block for the overlay's
 * `position: fixed` and pin the dialog to the panel instead of the viewport.
 * The overlay carries the `admin-page` class itself purely so the existing
 * `.admin-page`-scoped form styles (fieldsets, the rich text editor, group
 * picker, buttons) apply unchanged inside the portal.
 */
// Records saved before the step-title/description split still hold the
// whole thing as one legacy `Steps` HTML blob. Rather than splitting that
// blob into guessed-at steps (lossy — inline formatting/images per line
// would be hard to preserve), it's shown as a single step with an empty
// title so nothing is lost; the admin can split it into more steps by hand
// if they want to. A record already using the new format just uses it as-is.
function initialStepItems(item) {
    if (item.StepItems?.length > 0) {
        return item.StepItems.map((s) => ({ StepTitle: s.StepTitle || '', Description: s.Description || '' }));
    }
    if (item.Steps) {
        return [{ StepTitle: '', Description: item.Steps }];
    }
    return [{ StepTitle: '', Description: '' }];
}

export default function ScomEditModal({ item, groupOptions, scomPairs, onClose, onSave, onImagesChanged }) {
    const [form, setForm] = useState({
        ID: item.ID || '',
        Group: item.Group || '',
        Scoms: item.Scoms || '',
        Symptom: item.Symptom || '',
        CheckPoint: item.CheckPoint || '',
        StepItems: initialStepItems(item),
        NormalValue: item.NormalValue || '',
        Equipment: item.Equipment || '',
    });
    // An existing record always has a group already, so open straight on the
    // detail fields — "เปลี่ยนกลุ่ม" still lets the admin go back to step 1.
    const [formStep, setFormStep] = useState(2);
    const [newGroupInput, setNewGroupInput] = useState('');
    const [formError, setFormError] = useState(null);
    const [saving, setSaving] = useState(false);

    // Escape closes the dialog, matching the Cancel button.
    useEffect(() => {
        function onKeyDown(e) {
            if (e.key === 'Escape') onClose();
        }
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    async function handleSubmit(e) {
        e.preventDefault();
        setFormError(null);
        setSaving(true);
        try {
            await onSave(form);
            onClose();
        } catch (err) {
            setFormError(err.response?.data?.message || 'บันทึกไม่สำเร็จ');
        } finally {
            setSaving(false);
        }
    }

    // Used by the Steps rich text editor's image button/paste/drop — the
    // record being edited always has an id, so images can attach right away
    // (unlike the "add new" card, which has nothing to attach to yet).
    async function handleInlineImageUpload(file) {
        const updated = await addScomImages(item._id, [file]);
        onImagesChanged?.();
        const last = updated.Images[updated.Images.length - 1];
        return getScomImageUrl(last.key);
    }

    return createPortal(
        <div className="admin-page scom-modal-overlay" onClick={onClose}>
            <div
                className="scom-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="scom-modal-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="scom-modal-header">
                    <div className="admin-card-header" style={{ marginBottom: 0 }}>
                        <div className="admin-card-icon">
                            <Wrench size={20} />
                        </div>
                        <div>
                            <h3 id="scom-modal-title">แก้ไขข้อมูล Scom</h3>
                            <p className="admin-card-subtitle">
                                {formStep === 1
                                    ? 'ขั้นตอนที่ 1: เลือกกลุ่มอาการเสีย (Group) ก่อน'
                                    : `รหัส ${item.ID}`}
                            </p>
                        </div>
                    </div>
                    <button type="button" className="scom-modal-close" onClick={onClose} aria-label="ปิด">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="scom-modal-form">
                    <div className="scom-modal-body">
                        {formError && <div className="error-banner">{formError}</div>}
                        <ScomFormBody
                            mode="edit"
                            form={form}
                            setForm={setForm}
                            formStep={formStep}
                            setFormStep={setFormStep}
                            newGroupInput={newGroupInput}
                            setNewGroupInput={setNewGroupInput}
                            groupOptions={groupOptions}
                            scomPairs={scomPairs}
                            onUploadImage={handleInlineImageUpload}
                            submitting={saving}
                            onCancel={onClose}
                        />
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
