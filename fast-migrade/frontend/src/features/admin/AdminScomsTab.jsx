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
            setFormError(err.response?.data?.message || 'Save failed');
        }
    }

    if (loading) return <p>Loading...</p>;
    if (error) return <div className="error-banner">{error}</div>;

    return (
        <div>
            <form className="admin-form" onSubmit={handleSubmit}>
                <h3>{editingId ? 'Edit Scom' : 'New Scom'}</h3>
                {formError && <div className="error-banner">{formError}</div>}
                <div className="form-grid">
                    {Object.keys(emptyForm).map((field) => (
                        <label key={field}>
                            {field}
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
                        <th>ID</th>
                        <th>Group</th>
                        <th>Scoms</th>
                        <th>Symptom</th>
                        <th>Actions</th>
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
                                <button onClick={() => startEdit(item)}>Edit</button>
                                <button className="danger" onClick={() => deleteScom(item._id)}>
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                    {scoms.length === 0 && (
                        <tr>
                            <td colSpan={5}>No records.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
