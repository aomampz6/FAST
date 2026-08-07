import { useState } from 'react';
import { useGuides } from '../guides/useGuides';
import { readGuide, writeGuide } from '../guides/guidesService';

export default function AdminGuidesTab() {
    const { guides, loading, error, refresh } = useGuides();
    const [selected, setSelected] = useState(null);
    const [content, setContent] = useState('');
    const [status, setStatus] = useState(null);

    async function openGuide(filename) {
        setStatus(null);
        const data = await readGuide(filename);
        setSelected(filename);
        setContent(data.content);
    }

    async function handleSave(e) {
        e.preventDefault();
        setStatus(null);
        try {
            await writeGuide(selected, content);
            setStatus('Saved successfully');
            await refresh();
        } catch (err) {
            setStatus(err.response?.data?.message || 'Save failed');
        }
    }

    if (loading) return <p>Loading...</p>;
    if (error) return <div className="error-banner">{error}</div>;

    return (
        <div className="admin-section">
            <p className="hint">
                Guides are plain HTML files that already exist on disk; this editor can update their contents but
                cannot create or delete files.
            </p>
            <table className="data-table">
                <thead>
                    <tr>
                        <th>Filename</th>
                        <th>Size</th>
                        <th>Updated</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {guides.map((g) => (
                        <tr key={g.filename}>
                            <td>{g.filename}</td>
                            <td>{g.size}</td>
                            <td>{new Date(g.updatedAt).toLocaleString()}</td>
                            <td>
                                <button onClick={() => openGuide(g.filename)}>Edit</button>
                            </td>
                        </tr>
                    ))}
                    {guides.length === 0 && (
                        <tr>
                            <td colSpan={4}>No guide files found.</td>
                        </tr>
                    )}
                </tbody>
            </table>

            {selected && (
                <form className="admin-form" onSubmit={handleSave}>
                    <h3>Editing {selected}</h3>
                    {status && <div className="feedback-status">{status}</div>}
                    <textarea
                        className="guide-editor"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={20}
                    />
                    <div className="form-actions">
                        <button type="submit">Save</button>
                        <button type="button" onClick={() => setSelected(null)}>
                            Close
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
