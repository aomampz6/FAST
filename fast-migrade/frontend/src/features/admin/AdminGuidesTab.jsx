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
            setStatus('บันทึกสำเร็จ');
            await refresh();
        } catch (err) {
            setStatus(err.response?.data?.message || 'บันทึกไม่สำเร็จ');
        }
    }

    if (loading) return <p>กำลังโหลด...</p>;
    if (error) return <div className="error-banner">{error}</div>;

    return (
        <div className="admin-section">
            <p className="hint">
                คู่มือ Interactive คือไฟล์ HTML แบบสมบูรณ์ในตัวเอง (ฝังใน ONU setup ผ่าน iframe) — แก้ไขซอร์สโค้ด
                HTML/JS ได้ตรงนี้
            </p>
            <table className="data-table">
                <thead>
                    <tr>
                        <th>ไฟล์</th>
                        <th>ขนาด</th>
                        <th>แก้ไขล่าสุด</th>
                        <th>การดำเนินการ</th>
                    </tr>
                </thead>
                <tbody>
                    {guides.map((g) => (
                        <tr key={g.filename}>
                            <td>{g.filename}</td>
                            <td>{g.size}</td>
                            <td>{new Date(g.updatedAt).toLocaleString('th-TH')}</td>
                            <td>
                                <button onClick={() => openGuide(g.filename)}>แก้ไข</button>
                            </td>
                        </tr>
                    ))}
                    {guides.length === 0 && (
                        <tr>
                            <td colSpan={4}>ยังไม่มีไฟล์คู่มือ</td>
                        </tr>
                    )}
                </tbody>
            </table>

            {selected && (
                <form className="admin-form" onSubmit={handleSave}>
                    <h3>แก้ไขไฟล์: {selected}</h3>
                    <p className="hint">
                        แก้ไขซอร์สโค้ด HTML ทั้งไฟล์ — โปรดตรวจสอบให้ถูกต้องก่อนบันทึก เพราะจะเขียนทับไฟล์ทันที
                    </p>
                    {status && <div className="feedback-status">{status}</div>}
                    <textarea
                        className="guide-editor"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={20}
                    />
                    <div className="form-actions">
                        <button type="submit">บันทึก</button>
                        <button type="button" onClick={() => setSelected(null)}>
                            ยกเลิก
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
