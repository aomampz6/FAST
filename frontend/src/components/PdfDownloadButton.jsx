import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { exportElementToPdf } from '../shared/pdf/exportPdf';

// "ดาวน์โหลด PDF" for one topic panel. `targetRef` points at the panel to
// export; the button marks itself data-pdf-exclude so it doesn't end up in
// its own PDF.
export default function PdfDownloadButton({ targetRef, filename, title, subtitle, className = '' }) {
    const [busy, setBusy] = useState(false);
    const [failed, setFailed] = useState(false);

    async function handleClick() {
        if (!targetRef.current || busy) return;
        setBusy(true);
        setFailed(false);
        try {
            await exportElementToPdf(targetRef.current, { filename, title, subtitle });
        } catch (err) {
            console.error('pdf_export_failed', err);
            setFailed(true);
        } finally {
            setBusy(false);
        }
    }

    return (
        <button
            type="button"
            className={`pdf-download-btn${className ? ` ${className}` : ''}`}
            onClick={handleClick}
            disabled={busy}
            data-pdf-exclude
            title={failed ? 'สร้างไฟล์ PDF ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' : 'ดาวน์โหลดหัวข้อนี้เป็นไฟล์ PDF'}
        >
            {busy ? <Loader2 size={16} className="pdf-download-spin" /> : <FileDown size={16} />}
            <span>{busy ? 'กำลังสร้าง PDF...' : failed ? 'ลองใหม่อีกครั้ง' : 'ดาวน์โหลด PDF'}</span>
        </button>
    );
}
