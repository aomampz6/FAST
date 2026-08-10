import { useState } from 'react';
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

// Thai field labels, matching the old admin panel's wording (ID/Group/Scoms
// hints) and extended consistently to the remaining technical field names.
const FIELD_LABELS = {
    ID: 'ID (เช่น U0001)',
    Group: 'Group (กลุ่ม)',
    Scoms: 'Scoms (หัวข้อ)',
    Symptom: 'Symptom (อาการ)',
    CheckPoint: 'CheckPoint (จุดตรวจสอบ)',
    Steps: 'Steps (ขั้นตอนแก้ไข)',
    NormalValue: 'NormalValue (ค่าปกติ)',
    Equipment: 'Equipment (อุปกรณ์)',
};

export default function AdminScomsTab() {
    const { scoms, loading, error, createScom, updateScom, deleteScom } = useScoms();
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [formError, setFormError] = useState(null);

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
        if (!window.confirm('ต้องการลบข้อมูลนี้ใช่หรือไม่?')) return;
        try {
            await deleteScom(id);
        } catch (err) {
            setFormError(err.response?.data?.message || 'ลบข้อมูลไม่สำเร็จ');
        }
    }

    // Only block the whole tab behind "Loading..." before the first fetch
    // resolves. Later refetches (after create/edit/delete) also set
    // `loading`, but the table already holds the previous data — bailing out
    // here would unmount and remount the table, replaying every row's
    // entrance animation and reading as a flicker.
    if (loading && scoms.length === 0) return <p>กำลังโหลด...</p>;
    if (error) return <div className="error-banner">{error}</div>;

    return (
        <div className="admin-section">
            <form className="admin-form" onSubmit={handleSubmit}>
                <h3>{editingId ? 'แก้ไขข้อมูล Scom' : 'เพิ่ม Scom ใหม่'}</h3>
                {formError && <div className="error-banner">{formError}</div>}
                <div className="form-grid">
                    {Object.keys(emptyForm).map((field) => (
                        <label key={field}>
                            {FIELD_LABELS[field] || field}
                            {field === 'Steps' ? (
                                <textarea
                                    value={form[field]}
                                    onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                                />
                            ) : (
                                <input
                                    value={form[field]}
                                    onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                                    required={['ID', 'Group', 'Scoms'].includes(field)}
                                />
                            )}
                        </label>
                    ))}
                </div>
                <div className="form-actions">
                    <button type="submit">{editingId ? 'บันทึก' : 'เพิ่มข้อมูล'}</button>
                    {editingId && (
                        <button type="button" onClick={resetForm}>
                            ยกเลิก
                        </button>
                    )}
                </div>
            </form>

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
                    {scoms.map((item) => (
                        <tr key={item._id}>
                            <td>{item.ID}</td>
                            <td>{item.Group}</td>
                            <td>{item.Scoms}</td>
                            <td>{item.Symptom}</td>
                            <td>
                                <button onClick={() => startEdit(item)}>แก้ไข</button>
                                <button className="danger" onClick={() => handleDelete(item._id)}>
                                    ลบ
                                </button>
                            </td>
                        </tr>
                    ))}
                    {scoms.length === 0 && (
                        <tr>
                            <td colSpan={5}>ไม่มีข้อมูล</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
