import { useState } from 'react';
import { useParameters } from '../parameters/useParameters';

const emptyForm = { Type: '', Parameter: '', Standard: '', Recommendation: '', Level: 'none' };
const LEVELS = ['danger', 'warning', 'info', 'none'];
// Exact bilingual wording from the old admin panel's Level <select>.
const LEVEL_OPTION_LABELS = {
    danger: 'Danger (แดง)',
    warning: 'Warning (เหลือง/ส้ม)',
    info: 'Info (ฟ้า)',
    none: 'None (เทา/ปกติ)',
};
// Badge text — old admin.js's LEVEL_LABELS map (English words, kept as-is).
const LEVEL_BADGE_LABELS = { danger: 'Danger', warning: 'Warning', info: 'Info', none: 'None' };

export default function AdminParametersTab() {
    const { parameters, loading, error, createParameter, updateParameter, deleteParameter } = useParameters();
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [formError, setFormError] = useState(null);

    function startEdit(item) {
        setEditingId(item._id);
        setForm({
            Type: item.Type || '',
            Parameter: item.Parameter || '',
            Standard: item.Standard || '',
            Recommendation: item.Recommendation || '',
            Level: item.Level || 'none',
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
                await updateParameter(editingId, form);
            } else {
                await createParameter(form);
            }
            resetForm();
        } catch (err) {
            setFormError(err.response?.data?.message || 'บันทึกไม่สำเร็จ');
        }
    }

    async function handleDelete(id) {
        if (!window.confirm('ต้องการลบพารามิเตอร์นี้ใช่หรือไม่?')) return;
        try {
            await deleteParameter(id);
        } catch (err) {
            setFormError(err.response?.data?.message || 'ลบข้อมูลไม่สำเร็จ');
        }
    }

    // See AdminScomsTab for why this doesn't gate on every refetch.
    if (loading && parameters.length === 0) return <p>กำลังโหลด...</p>;
    if (error) return <div className="error-banner">{error}</div>;

    return (
        <div className="admin-section">
            <form className="admin-form" onSubmit={handleSubmit}>
                <h3>{editingId ? 'แก้ไขพารามิเตอร์' : 'เพิ่มพารามิเตอร์ใหม่'}</h3>
                {formError && <div className="error-banner">{formError}</div>}
                <div className="form-grid">
                    <label>
                        ประเภทอุปกรณ์ (Type)
                        <input value={form.Type} onChange={(e) => setForm({ ...form, Type: e.target.value })} required />
                    </label>
                    <label>
                        พารามิเตอร์ (Parameter)
                        <input
                            value={form.Parameter}
                            onChange={(e) => setForm({ ...form, Parameter: e.target.value })}
                            required
                        />
                    </label>
                    <label>
                        เกณฑ์มาตรฐาน (Standard)
                        <input
                            value={form.Standard}
                            onChange={(e) => setForm({ ...form, Standard: e.target.value })}
                            required
                        />
                    </label>
                    <label>
                        คำแนะนำของระบบ (Recommendation)
                        <input
                            value={form.Recommendation}
                            onChange={(e) => setForm({ ...form, Recommendation: e.target.value })}
                        />
                    </label>
                    <label>
                        Level (สีของป้ายเกณฑ์มาตรฐาน)
                        <select value={form.Level} onChange={(e) => setForm({ ...form, Level: e.target.value })}>
                            {LEVELS.map((l) => (
                                <option key={l} value={l}>
                                    {LEVEL_OPTION_LABELS[l]}
                                </option>
                            ))}
                        </select>
                    </label>
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
                        <th>ประเภทอุปกรณ์ (Type)</th>
                        <th>พารามิเตอร์ (Parameter)</th>
                        <th>เกณฑ์มาตรฐาน (Standard)</th>
                        <th>Level</th>
                        <th>การดำเนินการ</th>
                    </tr>
                </thead>
                <tbody>
                    {parameters.map((item) => (
                        <tr key={item._id}>
                            <td>{item.Type}</td>
                            <td>{item.Parameter}</td>
                            <td>{item.Standard}</td>
                            <td>
                                <span className={`level-badge level-${item.Level || 'none'}`}>
                                    {LEVEL_BADGE_LABELS[item.Level] || 'None'}
                                </span>
                            </td>
                            <td>
                                <button onClick={() => startEdit(item)}>แก้ไข</button>
                                <button className="danger" onClick={() => handleDelete(item._id)}>
                                    ลบ
                                </button>
                            </td>
                        </tr>
                    ))}
                    {parameters.length === 0 && (
                        <tr>
                            <td colSpan={5}>ไม่มีข้อมูล</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
