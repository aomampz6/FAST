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
            setFormError(err.response?.data?.message || 'Save failed');
        }
    }

    async function handleUpload(id) {
        const files = imageFiles[id];
        if (!files || files.length === 0) return;
        await addOnuConfigImages(id, files);
        setImageFiles((prev) => ({ ...prev, [id]: null }));
    }

    if (loading) return <p>Loading...</p>;
    if (error) return <div className="error-banner">{error}</div>;

    return (
        <div>
            <form className="admin-form" onSubmit={handleSubmit}>
                <h3>{editingId ? 'Edit ONU Config' : 'New ONU Config'}</h3>
                {formError && <div className="error-banner">{formError}</div>}
                <div className="form-grid">
                    <label>
                        Brand
                        <input value={form.Brand} onChange={(e) => setForm({ ...form, Brand: e.target.value })} required />
                    </label>
                    <label>
                        Mode
                        <input value={form.Mode} onChange={(e) => setForm({ ...form, Mode: e.target.value })} required />
                    </label>
                    <label>
                        Details
                        <textarea value={form.Details} onChange={(e) => setForm({ ...form, Details: e.target.value })} required />
                    </label>
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            checked={form.Hidden}
                            onChange={(e) => setForm({ ...form, Hidden: e.target.checked })}
                        />
                        Hidden
                    </label>
                </div>
                <div className="form-actions">
                    <button type="submit">{editingId ? 'Save' : 'Create'}</button>
                    {editingId && (
                        <button type="button" onClick={resetForm}>
                            Cancel
                        </button>
                    )}
                </div>
            </form>

            <table className="data-table">
                <thead>
                    <tr>
                        <th>Brand</th>
                        <th>Mode</th>
                        <th>Hidden</th>
                        <th>Images</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {configs.map((item) => (
                        <tr key={item._id}>
                            <td>{item.Brand}</td>
                            <td>{item.Mode}</td>
                            <td>{item.Hidden ? 'Yes' : 'No'}</td>
                            <td>
                                <div className="image-gallery small">
                                    {item.Images?.map((img) => (
                                        <div key={img._id || img.key} className="image-thumb">
                                            <img src={getOnuImageUrl(img.key)} alt={img.originalName || ''} />
                                            <button
                                                className="danger"
                                                onClick={() => removeOnuConfigImage(item._id, img._id)}
                                            >
                                                x
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
                                <button onClick={() => handleUpload(item._id)}>Upload</button>
                            </td>
                            <td>
                                <button onClick={() => startEdit(item)}>Edit</button>
                                <button className="danger" onClick={() => deleteOnuConfig(item._id)}>
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                    {configs.length === 0 && (
                        <tr>
                            <td colSpan={5}>No records.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
