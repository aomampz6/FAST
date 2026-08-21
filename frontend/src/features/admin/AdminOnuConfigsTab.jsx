import { useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useOnuConfigs } from '../onu-configs/useOnuConfigs';
import { addOnuConfigImages as uploadOnuConfigImages, getOnuImageUrl } from '../onu-configs/onuConfigsService';
import RichTextField from './RichTextField';

const emptyForm = { Brand: '', Model: '', Mode: '', Details: '', Hidden: false, DeviceType: 'ONU' };

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
    // Brand and Model are picked from what already exists; these flip the
    // matching box back to a text input when the admin adds a new one.
    const [addingBrand, setAddingBrand] = useState(false);
    const [addingModel, setAddingModel] = useState(false);

    // Brands are per device type — an ONU brand list should not offer ATA
    // brands and the other way round.
    const brandOptions = useMemo(() => {
        const set = new Set(
            configs
                .filter((c) => (c.DeviceType || 'ONU') === form.DeviceType && c.Brand)
                .map((c) => c.Brand)
        );
        return Array.from(set).sort((a, b) => a.localeCompare(b, 'th'));
    }, [configs, form.DeviceType]);

    // Models narrow further to the chosen brand, so picking Huawei never
    // offers a ZTE model number.
    const modelOptions = useMemo(() => {
        const set = new Set(
            configs
                .filter(
                    (c) =>
                        (c.DeviceType || 'ONU') === form.DeviceType && c.Brand === form.Brand && c.Model
                )
                .map((c) => c.Model)
        );
        return Array.from(set).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
    }, [configs, form.DeviceType, form.Brand]);

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
            Model: item.Model || '',
            Mode: item.Mode || '',
            Details: item.Details || '',
            Hidden: !!item.Hidden,
            DeviceType: item.DeviceType || 'ONU',
        });
        setAddingBrand(false);
        setAddingModel(false);
    }

    function resetForm() {
        setEditingId(null);
        setForm(emptyForm);
        setFormError(null);
        setAddingBrand(false);
        setAddingModel(false);
    }

    // Switching device type invalidates the brand (and therefore the model),
    // so clear both rather than leaving an ONU brand on an ATA record.
    function pickDeviceType(deviceType) {
        setForm((prev) => ({ ...prev, DeviceType: deviceType, Brand: '', Model: '' }));
        setAddingBrand(false);
        setAddingModel(false);
    }

    function pickBrand(brand) {
        setForm((prev) => ({ ...prev, Brand: brand, Model: '' }));
        setAddingModel(false);
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
                        <select value={form.DeviceType} onChange={(e) => pickDeviceType(e.target.value)}>
                            <option value="ONU">ONU</option>
                            <option value="ATA">ATA</option>
                        </select>
                    </label>
                    <label>
                        Brand (ยี่ห้อ)
                        {addingBrand || brandOptions.length === 0 ? (
                            <div className="admin-inline-field">
                                <input
                                    value={form.Brand}
                                    onChange={(e) => setForm({ ...form, Brand: e.target.value })}
                                    placeholder={`ยี่ห้อ ${form.DeviceType} ใหม่`}
                                    required
                                    autoFocus={addingBrand}
                                />
                                {brandOptions.length > 0 && (
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={() => {
                                            setAddingBrand(false);
                                            setForm({ ...form, Brand: '' });
                                        }}
                                    >
                                        <X size={14} /> ยกเลิก
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="admin-inline-field">
                                <select value={form.Brand} onChange={(e) => pickBrand(e.target.value)} required>
                                    <option value="">-- เลือกยี่ห้อ --</option>
                                    {brandOptions.map((b) => (
                                        <option key={b} value={b}>
                                            {b}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => {
                                        setAddingBrand(true);
                                        setForm({ ...form, Brand: '', Model: '' });
                                    }}
                                >
                                    <Plus size={14} /> เพิ่มยี่ห้อ
                                </button>
                            </div>
                        )}
                    </label>
                    <label>
                        Model (รุ่น)
                        {addingModel || modelOptions.length === 0 ? (
                            <div className="admin-inline-field">
                                <input
                                    value={form.Model}
                                    onChange={(e) => setForm({ ...form, Model: e.target.value })}
                                    placeholder={form.DeviceType === 'ATA' ? 'เช่น HT812' : 'เช่น HG8145V5'}
                                    autoFocus={addingModel}
                                />
                                {modelOptions.length > 0 && (
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={() => {
                                            setAddingModel(false);
                                            setForm({ ...form, Model: '' });
                                        }}
                                    >
                                        <X size={14} /> ยกเลิก
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="admin-inline-field">
                                <select
                                    value={form.Model}
                                    onChange={(e) => setForm({ ...form, Model: e.target.value })}
                                >
                                    <option value="">-- เลือกรุ่น --</option>
                                    {modelOptions.map((m) => (
                                        <option key={m} value={m}>
                                            {m}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => {
                                        setAddingModel(true);
                                        setForm({ ...form, Model: '' });
                                    }}
                                >
                                    <Plus size={14} /> เพิ่มรุ่น
                                </button>
                            </div>
                        )}
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
                        <th>รุ่น</th>
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
                            <td>{item.Model || '—'}</td>
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
