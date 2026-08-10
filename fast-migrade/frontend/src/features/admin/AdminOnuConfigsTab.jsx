import { useState } from 'react';
import { useOnuConfigs } from '../onu-configs/useOnuConfigs';
import { getOnuImageUrl } from '../onu-configs/onuConfigsService';

const emptyForm = { Brand: '', Mode: '', Details: '', Hidden: false };

export default function AdminOnuConfigsTab() {
    const {
        configs,
        loading,
        error,
        createOnuConfig,
        updateOnuConfig,
        deleteOnuConfig,
        addOnuConfigImages,
        removeOnuConfigImage,
    } = useOnuConfigs();
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [formError, setFormError] = useState(null);
    const [imageFiles, setImageFiles] = useState({});

    function startEdit(item) {
        setEditingId(item._id);
        setForm({ Brand: item.Brand || '', Mode: item.Mode || '', Details: item.Details || '', Hidden: !!item.Hidden });
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
                await updateOnuConfig(editingId, form);
            } else {
                await createOnuConfig(form);
            }
            resetForm();
        } catch (err) {
            setFormError(err.response?.data?.message || 'บันทึกไม่สำเร็จ');
        }
    }

    async function handleUpload(id) {
        const files = imageFiles[id];
        if (!files || files.length === 0) return;
        await addOnuConfigImages(id, files);
        setImageFiles((prev) => ({ ...prev, [id]: null }));
    }

    async function handleDelete(id) {
        if (!window.confirm('ต้องการลบการตั้งค่า ONU นี้ใช่หรือไม่?')) return;
        try {
            await deleteOnuConfig(id);
        } catch (err) {
            setFormError(err.response?.data?.message || 'ลบข้อมูลไม่สำเร็จ');
        }
    }

    async function handleDeleteImage(configId, imageId) {
        if (!window.confirm('ต้องการลบรูปภาพนี้ใช่หรือไม่?')) return;
        await removeOnuConfigImage(configId, imageId);
    }

    // See AdminScomsTab for why this doesn't gate on every refetch.
    if (loading && configs.length === 0) return <p>กำลังโหลด...</p>;
    if (error) return <div className="error-banner">{error}</div>;

    return (
        <div className="admin-section">
            <form className="admin-form" onSubmit={handleSubmit}>
                <h3>{editingId ? 'แก้ไขการตั้งค่า ONU' : 'เพิ่มการตั้งค่า ONU ใหม่'}</h3>
                {formError && <div className="error-banner">{formError}</div>}
                <div className="form-grid">
                    <label>
                        Brand (ยี่ห้อ)
                        <input value={form.Brand} onChange={(e) => setForm({ ...form, Brand: e.target.value })} required />
                    </label>
                    <label>
                        Mode (โหมด)
                        <input value={form.Mode} onChange={(e) => setForm({ ...form, Mode: e.target.value })} required />
                    </label>
                    <label>
                        Details (รายละเอียดขั้นตอน)
                        <textarea value={form.Details} onChange={(e) => setForm({ ...form, Details: e.target.value })} required />
                    </label>
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            checked={form.Hidden}
                            onChange={(e) => setForm({ ...form, Hidden: e.target.checked })}
                        />
                        ซ่อนจากผู้ใช้งาน
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
                        <th>Brand</th>
                        <th>Mode</th>
                        <th>การแสดงผล</th>
                        <th>รูปภาพ</th>
                        <th>การดำเนินการ</th>
                    </tr>
                </thead>
                <tbody>
                    {configs.map((item) => (
                        <tr key={item._id} className={item.Hidden ? 'admin-row-hidden' : undefined}>
                            <td>{item.Brand}</td>
                            <td>{item.Mode}</td>
                            <td>
                                {item.Hidden ? 'ซ่อน' : 'แสดง'}
                                {item.Hidden && <span className="hidden-badge">ซ่อนอยู่</span>}
                            </td>
                            <td>
                                <div className="image-gallery small">
                                    {item.Images?.map((img) => (
                                        <div key={img._id || img.key} className="image-thumb">
                                            <img src={getOnuImageUrl(img.key)} alt={img.originalName || ''} />
                                            <button
                                                className="danger"
                                                onClick={() => handleDeleteImage(item._id, img._id)}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <input
                                    type="file"
                                    multiple
                                    onChange={(e) =>
                                        setImageFiles((prev) => ({ ...prev, [item._id]: e.target.files }))
                                    }
                                />
                                <button onClick={() => handleUpload(item._id)}>อัปโหลด</button>
                            </td>
                            <td>
                                <button onClick={() => startEdit(item)}>แก้ไข</button>
                                <button className="danger" onClick={() => handleDelete(item._id)}>
                                    ลบ
                                </button>
                            </td>
                        </tr>
                    ))}
                    {configs.length === 0 && (
                        <tr>
                            <td colSpan={5}>ไม่มีข้อมูล</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
