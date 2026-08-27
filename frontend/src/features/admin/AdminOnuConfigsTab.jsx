import { useEffect, useMemo, useState } from 'react';
import {
    ArrowDown,
    ArrowUp,
    ChevronLeft,
    ChevronRight,
    Inbox,
    ListChecks,
    Pencil,
    Plus,
    Save,
    Search,
    SearchX,
    Trash2,
    X,
} from 'lucide-react';
import { useOnuConfigs } from '../onu-configs/useOnuConfigs';
import { addOnuConfigImages as uploadOnuConfigImages, getOnuImageUrl } from '../onu-configs/onuConfigsService';
import { useModeTopics } from '../onu-configs/useModeTopics';
import RichTextField from './RichTextField';

const PAGE_SIZE = 10;

const emptyForm = { Brand: '', Model: '', Mode: '', Details: '', Hidden: false, DeviceType: 'ONU' };

function normalize(str) {
    return (str || '').toLowerCase();
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
    const {
        topics,
        loading: topicsLoading,
        error: topicsError,
        createModeTopic,
        updateModeTopic,
        deleteModeTopic,
    } = useModeTopics();
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [formError, setFormError] = useState(null);
    const [imageFiles, setImageFiles] = useState({});
    const [deviceTypeFilter, setDeviceTypeFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    // Brand and Model are picked from what already exists; these flip the
    // matching box back to a text input when the admin adds a new one.
    const [addingBrand, setAddingBrand] = useState(false);
    const [addingModel, setAddingModel] = useState(false);
    const [addingMode, setAddingMode] = useState(false);

    // Topic (Mode) manager — its own device-type toggle, independent from the
    // config form above, since an admin may want to curate ATA's topic list
    // while still adding an ONU config.
    const [topicDeviceType, setTopicDeviceType] = useState('ONU');
    const [newTopicLabel, setNewTopicLabel] = useState('');
    const [topicFormError, setTopicFormError] = useState(null);
    const [editingTopicId, setEditingTopicId] = useState(null);
    const [editingTopicLabel, setEditingTopicLabel] = useState('');

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

    // Topics for the currently chosen device type, in the admin-managed order.
    const topicsForFormDeviceType = useMemo(
        () => topics.filter((t) => (t.DeviceType || 'ONU') === form.DeviceType),
        [topics, form.DeviceType]
    );

    // The Mode dropdown is driven entirely by the managed topic list above —
    // in its curated order — so it always matches "จัดการหัวข้อการตั้งค่า"
    // exactly. A record whose Mode isn't (or isn't yet) in that list falls
    // back to the free-text box instead of silently mismatching an option
    // (see startEdit below).
    const modeOptions = useMemo(() => topicsForFormDeviceType.map((t) => t.Label), [topicsForFormDeviceType]);

    const topicsForManagerDeviceType = useMemo(
        () => topics.filter((t) => (t.DeviceType || 'ONU') === topicDeviceType),
        [topics, topicDeviceType]
    );

    const filteredConfigs = useMemo(() => {
        let base = deviceTypeFilter === 'all' ? configs : configs.filter((c) => (c.DeviceType || 'ONU') === deviceTypeFilter);
        const q = normalize(search.trim());
        if (q) {
            base = base.filter((c) => [c.Brand, c.Model, c.Mode].some((field) => normalize(field).includes(q)));
        }
        return base;
    }, [configs, deviceTypeFilter, search]);

    const totalPages = Math.max(1, Math.ceil(filteredConfigs.length / PAGE_SIZE));
    const pagedConfigs = filteredConfigs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const rangeStart = filteredConfigs.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const rangeEnd = Math.min(page * PAGE_SIZE, filteredConfigs.length);

    // Reset to page 1 whenever the search term or device-type filter changes
    // so a filter never leaves the view stranded on a now-empty later page.
    useEffect(() => {
        setPage(1);
    }, [search, deviceTypeFilter]);

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
        // A Mode saved before the topic manager existed (or since deleted
        // from it) won't be one of the dropdown's options — show it in the
        // free-text box instead of leaving the dropdown mismatched.
        const itemDeviceType = item.DeviceType || 'ONU';
        const itemManagedLabels = topics
            .filter((t) => (t.DeviceType || 'ONU') === itemDeviceType)
            .map((t) => t.Label);
        setAddingMode(!!item.Mode && !itemManagedLabels.includes(item.Mode));
    }

    function resetForm() {
        setEditingId(null);
        setForm(emptyForm);
        setFormError(null);
        setAddingBrand(false);
        setAddingModel(false);
        setAddingMode(false);
    }

    // Switching device type invalidates the brand (and therefore the model)
    // and the topic list, so clear all three rather than leaving an ONU
    // brand/topic on an ATA record.
    function pickDeviceType(deviceType) {
        setForm((prev) => ({ ...prev, DeviceType: deviceType, Brand: '', Model: '', Mode: '' }));
        setAddingBrand(false);
        setAddingModel(false);
        setAddingMode(false);
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

    async function handleAddTopic(e) {
        e.preventDefault();
        setTopicFormError(null);
        if (!newTopicLabel.trim()) return;
        try {
            await createModeTopic({
                Label: newTopicLabel.trim(),
                DeviceType: topicDeviceType,
                Order: topicsForManagerDeviceType.length,
            });
            setNewTopicLabel('');
        } catch (err) {
            setTopicFormError(err.response?.data?.message || 'เพิ่มหัวข้อไม่สำเร็จ');
        }
    }

    function startEditTopic(topic) {
        setEditingTopicId(topic._id);
        setEditingTopicLabel(topic.Label);
        setTopicFormError(null);
    }

    function cancelEditTopic() {
        setEditingTopicId(null);
        setEditingTopicLabel('');
    }

    async function saveEditTopic(e) {
        e.preventDefault();
        if (!editingTopicLabel.trim()) return;
        setTopicFormError(null);
        try {
            await updateModeTopic(editingTopicId, { Label: editingTopicLabel.trim() });
            cancelEditTopic();
        } catch (err) {
            setTopicFormError(err.response?.data?.message || 'บันทึกหัวข้อไม่สำเร็จ');
        }
    }

    async function handleDeleteTopic(topic) {
        if (!window.confirm(`ต้องการลบหัวข้อ "${topic.Label}" ใช่หรือไม่? (การตั้งค่าที่ใช้หัวข้อนี้อยู่แล้วจะไม่ถูกลบ)`)) return;
        try {
            await deleteModeTopic(topic._id);
        } catch (err) {
            setTopicFormError(err.response?.data?.message || 'ลบหัวข้อไม่สำเร็จ');
        }
    }

    // Manual reorder — swaps this topic with its neighbor, then renumbers the
    // whole list 0..n-1 so `Order` stays a clean sequence regardless of what
    // it held before (older topics predate this feature and default to 0).
    // This is what the setup page's Mode list actually sorts by.
    async function moveTopic(topic, direction) {
        const list = topicsForManagerDeviceType;
        const index = list.findIndex((t) => t._id === topic._id);
        const swapIndex = index + direction;
        if (index === -1 || swapIndex < 0 || swapIndex >= list.length) return;

        const reordered = [...list];
        [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];

        setTopicFormError(null);
        try {
            await Promise.all(reordered.map((t, i) => updateModeTopic(t._id, { Order: i })));
        } catch (err) {
            setTopicFormError(err.response?.data?.message || 'จัดเรียงลำดับไม่สำเร็จ');
        }
    }

    // See AdminScomsTab for why this doesn't gate on every refetch.
    if (loading && configs.length === 0) return <p>กำลังโหลด...</p>;
    if (error) return <div className="error-banner">{error}</div>;

    return (
        <div className="admin-section">
            <div className="admin-form">
                <h3>จัดการหัวข้อการตั้งค่า (Mode)</h3>
                <p className="hint">
                    หัวข้อเหล่านี้เป็นตัวเลือกกลางที่ใช้ร่วมกันทุกยี่ห้อ/รุ่นของประเภทอุปกรณ์ที่เลือก —
                    เพิ่ม/แก้ไข/ลบที่นี่แล้วจะไปปรากฏในช่อง Mode ของฟอร์มด้านล่างและในเมนูของหน้าตั้งค่าอุปกรณ์ทันที
                </p>
                {topicsError && <div className="error-banner">{topicsError}</div>}
                {topicFormError && <div className="error-banner">{topicFormError}</div>}

                <div className="admin-scoms-filters" style={{ marginBottom: 16 }}>
                    <select
                        className="admin-group-filter"
                        value={topicDeviceType}
                        onChange={(e) => {
                            setTopicDeviceType(e.target.value);
                            cancelEditTopic();
                            setTopicFormError(null);
                        }}
                        aria-label="ประเภทอุปกรณ์ของหัวข้อที่จัดการ"
                    >
                        <option value="ONU">ONU</option>
                        <option value="ATA">ATA</option>
                    </select>
                </div>

                {topicsLoading && topics.length === 0 ? (
                    <p>กำลังโหลด...</p>
                ) : (
                    <ul className="topic-manage-list">
                        {topicsForManagerDeviceType.map((topic, index) => (
                            <li key={topic._id} className="topic-manage-item">
                                {editingTopicId === topic._id ? (
                                    <form className="admin-inline-field" onSubmit={saveEditTopic} style={{ flex: 1 }}>
                                        <input
                                            value={editingTopicLabel}
                                            onChange={(e) => setEditingTopicLabel(e.target.value)}
                                            autoFocus
                                            required
                                        />
                                        <button type="submit">บันทึก</button>
                                        <button type="button" className="btn-secondary" onClick={cancelEditTopic}>
                                            <X size={14} /> ยกเลิก
                                        </button>
                                    </form>
                                ) : (
                                    <>
                                        <div className="topic-manage-reorder">
                                            <button
                                                type="button"
                                                onClick={() => moveTopic(topic, -1)}
                                                disabled={index === 0}
                                                title="เลื่อนขึ้น"
                                                aria-label="เลื่อนขึ้น"
                                            >
                                                <ArrowUp size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => moveTopic(topic, 1)}
                                                disabled={index === topicsForManagerDeviceType.length - 1}
                                                title="เลื่อนลง"
                                                aria-label="เลื่อนลง"
                                            >
                                                <ArrowDown size={14} />
                                            </button>
                                        </div>
                                        <span className="topic-manage-label">{topic.Label}</span>
                                        <div className="topic-manage-actions">
                                            <button type="button" onClick={() => startEditTopic(topic)}>
                                                <Pencil size={14} /> แก้ไข
                                            </button>
                                            <button type="button" className="danger" onClick={() => handleDeleteTopic(topic)}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </li>
                        ))}
                        {topicsForManagerDeviceType.length === 0 && (
                            <li className="topic-manage-empty">ยังไม่มีหัวข้อสำหรับ {topicDeviceType}</li>
                        )}
                    </ul>
                )}

                <form className="admin-inline-field" onSubmit={handleAddTopic} style={{ marginTop: 12 }}>
                    <input
                        value={newTopicLabel}
                        onChange={(e) => setNewTopicLabel(e.target.value)}
                        placeholder={`เพิ่มหัวข้อใหม่สำหรับ ${topicDeviceType} เช่น ตั้งค่า Voice / SIP`}
                    />
                    <button type="submit">
                        <Plus size={14} /> เพิ่มหัวข้อ
                    </button>
                </form>
            </div>

            <form className="admin-form" onSubmit={handleSubmit}>
                <h3>{editingId ? `แก้ไขการตั้งค่า ${form.DeviceType}` : 'เพิ่มการตั้งค่าอุปกรณ์ใหม่'}</h3>
                {formError && <div className="error-banner">{formError}</div>}
                <div className="form-grid form-grid-3col">
                    <label>
                        <span className="field-label-row">
                            ประเภทอุปกรณ์<span className="required-mark">*</span>
                        </span>
                        <select value={form.DeviceType} onChange={(e) => pickDeviceType(e.target.value)}>
                            <option value="ONU">ONU</option>
                            <option value="ATA">ATA</option>
                        </select>
                    </label>
                    <label>
                        <span className="field-label-row">
                            ยี่ห้อ (Brand)<span className="required-mark">*</span>
                        </span>
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
                                        className="icon-btn"
                                        onClick={() => {
                                            setAddingBrand(false);
                                            setForm({ ...form, Brand: '' });
                                        }}
                                        title="ยกเลิก"
                                        aria-label="ยกเลิกการเพิ่มยี่ห้อใหม่"
                                    >
                                        <X size={14} />
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
                                    className="icon-btn"
                                    onClick={() => {
                                        setAddingBrand(true);
                                        setForm({ ...form, Brand: '', Model: '' });
                                    }}
                                    title="เพิ่มยี่ห้อใหม่"
                                    aria-label="เพิ่มยี่ห้อใหม่"
                                >
                                    <Plus size={14} />
                                </button>
                            </div>
                        )}
                    </label>
                    <label>
                        <span className="field-label-row">
                            รุ่น (Model)<span className="required-mark">*</span>
                        </span>
                        {addingModel || modelOptions.length === 0 ? (
                            <div className="admin-inline-field">
                                <input
                                    value={form.Model}
                                    onChange={(e) => setForm({ ...form, Model: e.target.value })}
                                    placeholder={form.DeviceType === 'ATA' ? 'เช่น HT812' : 'เช่น HG8145V5'}
                                    required
                                    autoFocus={addingModel}
                                />
                                {modelOptions.length > 0 && (
                                    <button
                                        type="button"
                                        className="icon-btn"
                                        onClick={() => {
                                            setAddingModel(false);
                                            setForm({ ...form, Model: '' });
                                        }}
                                        title="ยกเลิก"
                                        aria-label="ยกเลิกการเพิ่มรุ่นใหม่"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="admin-inline-field">
                                <select
                                    value={form.Model}
                                    onChange={(e) => setForm({ ...form, Model: e.target.value })}
                                    required
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
                                    className="icon-btn"
                                    onClick={() => {
                                        setAddingModel(true);
                                        setForm({ ...form, Model: '' });
                                    }}
                                    title="เพิ่มรุ่นใหม่"
                                    aria-label="เพิ่มรุ่นใหม่"
                                >
                                    <Plus size={14} />
                                </button>
                            </div>
                        )}
                        <span className="field-hint">เมนูด้านซ้ายของหน้าตั้งค่าจัดกลุ่มตามรุ่นนี้</span>
                    </label>
                </div>

                <div className="form-grid form-grid-3col">
                    <label>
                        <span className="field-label-row">
                            หัวข้อการตั้งค่า (Mode)<span className="required-mark">*</span>
                        </span>
                        {addingMode ? (
                            <div className="admin-inline-field">
                                <input
                                    value={form.Mode}
                                    onChange={(e) => setForm({ ...form, Mode: e.target.value })}
                                    placeholder="เช่น ตั้งค่า Voice / SIP"
                                    required
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    className="icon-btn"
                                    onClick={() => {
                                        setAddingMode(false);
                                        setForm({ ...form, Mode: '' });
                                    }}
                                    title="ยกเลิก"
                                    aria-label="ยกเลิกการเพิ่มหัวข้อใหม่"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <div className="admin-inline-field">
                                <select
                                    value={form.Mode}
                                    onChange={(e) => setForm({ ...form, Mode: e.target.value })}
                                    required
                                >
                                    <option value="">-- เลือกหัวข้อการตั้งค่า --</option>
                                    {modeOptions.map((m) => (
                                        <option key={m} value={m}>
                                            {m}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    className="icon-btn"
                                    onClick={() => {
                                        setAddingMode(true);
                                        setForm({ ...form, Mode: '' });
                                    }}
                                    title="เพิ่มหัวข้อใหม่"
                                    aria-label="เพิ่มหัวข้อใหม่"
                                >
                                    <Plus size={14} />
                                </button>
                            </div>
                        )}
                    </label>
                </div>

                <div className="form-grid">
                    {/* A plain <div>, not <label> — wrapping the editor in a bare
                        <label> makes the browser forward any click inside it to
                        the first *labelable* descendant, which is the toolbar's
                        <select> (a contentEditable div doesn't count as one).
                        That stole focus from the actual typing area, so a single
                        click never placed a cursor there — only a click-drag
                        (a text-selection gesture, which bypasses that forwarding)
                        did. */}
                    <div className="field-block" style={{ gridColumn: '1 / -1' }}>
                        <span className="field-label-row">รายละเอียดขั้นตอน</span>
                        <RichTextField
                            value={form.Details}
                            onChange={(html) => setForm({ ...form, Details: html })}
                            onUploadImage={editingId ? handleInlineImageUpload : null}
                        />
                    </div>
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            checked={form.Hidden}
                            onChange={(e) => setForm({ ...form, Hidden: e.target.checked })}
                        />
                        ซ่อนข้อมูลจากผู้ใช้งานทั่วไป (Draft)
                    </label>
                </div>
                <div className="form-actions form-actions-end">
                    {editingId && (
                        <button type="button" onClick={resetForm}>
                            ยกเลิก
                        </button>
                    )}
                    <button type="submit" className="btn-primary">
                        <Save size={16} />
                        {editingId ? 'บันทึก' : 'บันทึกข้อมูล'}
                    </button>
                </div>
            </form>

            <div className="admin-card">
                <div className="admin-card-header-row">
                    <div className="admin-card-header">
                        <div className="admin-card-icon">
                            <ListChecks size={20} />
                        </div>
                        <div>
                            <div className="admin-card-title-row">
                                <h3>รายการตั้งค่าทั้งหมด</h3>
                                <span className="admin-count-badge">{configs.length} รายการ</span>
                            </div>
                            <p className="admin-card-subtitle">
                                {deviceTypeFilter === 'all' && !search.trim() && 'แสดงรายการล่าสุด'}
                                {deviceTypeFilter !== 'all' && `${deviceTypeFilter} เท่านั้น · ${filteredConfigs.length} รายการ`}
                                {search.trim() &&
                                    `${deviceTypeFilter !== 'all' ? ' · ' : ''}พบ ${filteredConfigs.length} รายการที่ตรงกับการค้นหา`}
                                {filteredConfigs.length > PAGE_SIZE && ` · หน้า ${page}/${totalPages}`}
                            </p>
                        </div>
                    </div>
                    <div className="admin-scoms-filters">
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
                        <div className="admin-search-box">
                            <Search size={16} className="admin-search-icon" />
                            <input
                                type="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="ค้นหารุ่น, ยี่ห้อ, โหมด..."
                                aria-label="ค้นหาการตั้งค่า"
                            />
                        </div>
                    </div>
                </div>

                <div className="table-scroll">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>อุปกรณ์</th>
                                <th>ยี่ห้อ / รุ่น</th>
                                <th>หัวข้อ (Mode)</th>
                                <th>สถานะ</th>
                                <th>รูปภาพประกอบ</th>
                                <th>จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pagedConfigs.map((item) => {
                                const images = item.Images || [];
                                const shownImages = images.slice(0, 3);
                                const extraImages = images.length - shownImages.length;
                                return (
                                    <tr key={item._id} className={item.Hidden ? 'admin-row-hidden' : undefined}>
                                        <td>
                                            <span className="device-type-badge">{item.DeviceType || 'ONU'}</span>
                                        </td>
                                        <td>
                                            <span className="cell-primary">{item.Brand}</span>
                                            <span className="cell-secondary">{item.Model || '—'}</span>
                                        </td>
                                        <td>{item.Mode}</td>
                                        <td>
                                            <span className="status-dot-row">
                                                <span className={`status-dot${item.Hidden ? '' : ' is-active'}`} />
                                                {item.Hidden ? 'ซ่อน' : 'แสดงผล'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="image-gallery small">
                                                {shownImages.map((img) => (
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
                                                {extraImages > 0 && <span className="image-extra-badge">+{extraImages}</span>}
                                            </div>
                                            <input
                                                type="file"
                                                multiple
                                                onChange={(e) =>
                                                    setImageFiles((prev) => ({ ...prev, [item._id]: e.target.files }))
                                                }
                                            />
                                            <button
                                                type="button"
                                                className="link-button"
                                                onClick={() => handleUpload(item._id)}
                                            >
                                                อัปโหลดรูปเพิ่ม
                                            </button>
                                        </td>
                                        <td>
                                            <div className="row-actions">
                                                <button
                                                    className="icon-action-btn"
                                                    onClick={() => startEdit(item)}
                                                    aria-label={`แก้ไข ${item.Brand} ${item.Model || ''}`}
                                                    title="แก้ไข"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    className="icon-action-btn danger"
                                                    onClick={() => handleDelete(item._id)}
                                                    aria-label={`ลบ ${item.Brand} ${item.Model || ''}`}
                                                    title="ลบ"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {filteredConfigs.length === 0 && configs.length > 0 && (
                        <div className="admin-empty-state">
                            <SearchX size={32} />
                            <p>
                                {search.trim()
                                    ? `ไม่พบรายการที่ตรงกับ "${search}"`
                                    : `ไม่พบรายการในประเภท "${deviceTypeFilter}"`}
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    setSearch('');
                                    setDeviceTypeFilter('all');
                                }}
                            >
                                ล้างตัวกรอง
                            </button>
                        </div>
                    )}

                    {configs.length === 0 && (
                        <div className="admin-empty-state">
                            <Inbox size={32} />
                            <p>ยังไม่มีข้อมูลการตั้งค่าในระบบ</p>
                            <span className="field-hint">เพิ่มรายการแรกได้จากฟอร์มด้านบน</span>
                        </div>
                    )}
                </div>

                {totalPages > 1 && (
                    <div className="admin-pagination">
                        <span className="admin-pagination-range">
                            แสดงผล {rangeStart} ถึง {rangeEnd} จาก {filteredConfigs.length} รายการ
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
    );
}
