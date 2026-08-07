import { useState } from 'react';
import { useParameters } from '../parameters/useParameters';

const emptyForm = { Type: '', Parameter: '', Standard: '', Recommendation: '', Level: 'none' };
const LEVELS = ['danger', 'warning', 'info', 'none'];

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
            setFormError(err.response?.data?.message || 'Save failed');
        }
    }

    if (loading) return <p>Loading...</p>;
    if (error) return <div className="error-banner">{error}</div>;

    return (
        <div className="admin-section">
            <form className="admin-form" onSubmit={handleSubmit}>
                <h3>{editingId ? 'Edit Parameter' : 'New Parameter'}</h3>
                {formError && <div className="error-banner">{formError}</div>}
                <div className="form-grid">
                    <label>
                        Type
                        <input value={form.Type} onChange={(e) => setForm({ ...form, Type: e.target.value })} required />
                    </label>
                    <label>
                        Parameter
                        <input
                            value={form.Parameter}
                            onChange={(e) => setForm({ ...form, Parameter: e.target.value })}
                            required
                        />
                    </label>
                    <label>
                        Standard
                        <input
                            value={form.Standard}
                            onChange={(e) => setForm({ ...form, Standard: e.target.value })}
                            required
                        />
                    </label>
                    <label>
                        Recommendation
                        <input
                            value={form.Recommendation}
                            onChange={(e) => setForm({ ...form, Recommendation: e.target.value })}
                        />
                    </label>
                    <label>
                        Level
                        <select value={form.Level} onChange={(e) => setForm({ ...form, Level: e.target.value })}>
                            {LEVELS.map((l) => (
                                <option key={l} value={l}>
                                    {l}
                                </option>
                            ))}
                        </select>
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
                        <th>Type</th>
                        <th>Parameter</th>
                        <th>Standard</th>
                        <th>Level</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {parameters.map((item) => (
                        <tr key={item._id}>
                            <td>{item.Type}</td>
                            <td>{item.Parameter}</td>
                            <td>{item.Standard}</td>
                            <td>
                                <span className={`level-badge level-${item.Level || 'none'}`}>{item.Level || 'none'}</span>
                            </td>
                            <td>
                                <button onClick={() => startEdit(item)}>Edit</button>
                                <button className="danger" onClick={() => deleteParameter(item._id)}>
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                    {parameters.length === 0 && (
                        <tr>
                            <td colSpan={5}>No records.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
