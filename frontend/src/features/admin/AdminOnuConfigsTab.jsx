import { useMemo, useState } from 'react';
import { useOnuConfigs } from '../onu-configs/useOnuConfigs';
import { addOnuConfigImages as uploadOnuConfigImages, getOnuImageUrl } from '../onu-configs/onuConfigsService';
import RichTextField from './RichTextField';

const emptyForm = { Brand: '', Mode: '', Details: '', Hidden: false, DeviceType: 'ONU' };

export default function AdminOnuConfigsTab() {
    const {
        configs,
        loading,
        error,
        refresh,
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
    const [deviceTypeFilter, setDeviceTypeFilter] = useState('all');

    const filteredConfigs = useMemo(
        () =>
            deviceTypeFilter === 'all'
                ? configs
                : configs.filter((c) => (c.DeviceType || 'ONU') === deviceTypeFilter),
        [configs, deviceTypeFilter]
    );

    function startEdit(item) {
        setEditingId(item._id);
        setForm({
            Brand: item.Brand || '',
            Mode: item.Mode || '',
            Details: item.Details || '',
            Hidden: !!item.Hidden,
            DeviceType: item.DeviceType || 'ONU',
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
        if (!form.Details.replace(/<[^>]*>/g, '').trim()) {
            setFormError('กรุณากรอกรายละเอียดขั้นตอน');
            return;
        }
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

    // Used by the Details rich text editor's image button/paste/drop — goes
    // straight to the service function (not the useOnuConfigs wrapper) so it
    // can read back the newly attached image's key and hand the editor a URL
    // to insert, then refreshes the list separately to keep the gallery below
    // in sync.
    async function handleInlineImageUpload(file) {
        if (!editingId) throw new Error('บันทึกข้อมูลก่อน แล้วจึงแทรกรูปภาพได้');
        const updated = await uploadOnuConfigImages(editingId, [file]);
        refresh();
        const last = updated.Images[updated.Images.length - 1];
        return getOnuImageUrl(last.key);
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
                <h3>{editingId ? `แก้ไขการตั้งค่า ${form.DeviceType}` : 'เพิ่มการตั้งค่าอุปกรณ์ใหม่'}</h3>
                {formError && <div className="error-banner">{formError}</div>}
                <div className="form-grid form-grid-3col">
                    <label>
                        ประเภทอุปกรณ์ (Device Type)
                        <select
                            value={form.DeviceType}
                            onChange={(e) => setForm({ ...form, DeviceType: e.target.value })}
                        >
                            <option value="ONU">ONU</option>
                            <option value="ATA">ATA</option>
                        </select>
                    </label>
                    <label>
                        Brand (ยี่ห้อ)
                        <input value={form.Brand} onChange={(e) => setForm({ ...form, Brand: e.target.value })} required />
                    </label>
                    <label>
                        Mode (โหมด)
                        <input value={form.Mode} onChange={(e) => setForm({ ...form, Mode: e.target.value })} required />
                    </label>
                </div>

                <div className="form-grid">
                    <label>
                        Details (รายละเอียดขั้นตอน)
                        <RichTextField
                            value={form.Details}
                            onChange={(html) => setForm({ ...form, Details: html })}
                            onUploadImage={editingId ? handleInlineImageUpload : null}
                        />
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

            <div className="admin-scoms-filters" style={{ marginBottom: 12 }}>
                <select
                    className="admin-group-filter"
                    value={deviceTypeFilter}
                    onChange={(e) => setDeviceTypeFilter(e.target.value)}
                    aria-label="กรองตามประเภทอุปกรณ์"
                >
                    <option value="all">ทุกประเภทอุปกรณ์</option>
                    <option value="ONU">ONU เท่านั้น</option>
                    <option value="ATA">ATA เท่านั้น</option>
                </select>
            </div>

            <table className="data-table">
                <thead>
                    <tr>
                        <th>ประเภท</th>
                        <th>Brand</th>
                        <th>Mode</th>
                        <th>การแสดงผล</th>
                        <th>รูปภาพ</th>
                        <th>การดำเนินการ</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredConfigs.map((item) => (
                        <tr key={item._id} className={item.Hidden ? 'admin-row-hidden' : undefined}>
                            <td>{item.DeviceType || 'ONU'}</td>
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
                    {filteredConfigs.length === 0 && (
                        <tr>
                            <td colSpan={6}>ไม่มีข้อมูล</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
