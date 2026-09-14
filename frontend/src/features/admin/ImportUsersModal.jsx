import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, Loader2, CheckCircle2 } from 'lucide-react';
import { importUsersPreview, importUsersCommit } from '../users/usersService';

const STATUS_LABELS = {
    create: 'สร้างใหม่',
    update: 'อัปเดต',
    invalid: 'ข้าม',
};

// The file may hold thousands of rows (the technician roster runs ~2,400) —
// the summary counts above the table always reflect all of them, but only
// this many rows are actually rendered so the modal stays responsive.
const MAX_PREVIEW_ROWS = 300;

/**
 * Import flow for the Excel employee roster: pick a file, preview how it maps
 * onto the account table (nothing is written yet), then confirm to commit.
 *
 * `onImported` is called after a successful commit so the caller can refresh
 * its user list; the modal stays open on its result screen until closed.
 */
export default function ImportUsersModal({ onClose, onImported }) {
    const [step, setStep] = useState('pick'); // 'pick' | 'preview' | 'result'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [preview, setPreview] = useState(null); // { accounts, summary }
    const [resetPassword, setResetPassword] = useState(false);
    const [committing, setCommitting] = useState(false);
    const [result, setResult] = useState(null);
    const fileInputRef = useRef(null);

    async function handleFileChosen(e) {
        const file = e.target.files?.[0];
        e.target.value = ''; // allow re-picking the same file after an error
        if (!file) return;

        setError(null);
        setLoading(true);
        try {
            const data = await importUsersPreview(file);
            setPreview(data);
            setStep('preview');
        } catch (err) {
            setError(err.response?.data?.message || 'อ่านไฟล์ไม่สำเร็จ');
        } finally {
            setLoading(false);
        }
    }

    async function handleConfirm() {
        const rows = preview.accounts.filter((a) => a.status === 'create' || a.status === 'update');
        setError(null);
        setCommitting(true);
        try {
            const data = await importUsersCommit(rows, { resetPassword });
            setResult(data);
            setStep('result');
            onImported?.();
        } catch (err) {
            setError(err.response?.data?.message || 'นำเข้าข้อมูลไม่สำเร็จ');
        } finally {
            setCommitting(false);
        }
    }

    function reset() {
        setPreview(null);
        setResult(null);
        setError(null);
        setResetPassword(false);
        setStep('pick');
    }

    const importableCount = preview ? preview.summary.toCreate + preview.summary.toUpdate : 0;

    return createPortal(
        <div className="user-modal-overlay" onClick={committing ? undefined : onClose}>
            <div
                className="user-modal import-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="import-modal-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="user-modal-header">
                    <div>
                        <h3 id="import-modal-title">นำเข้ารายชื่อพนักงานจาก Excel</h3>
                        <p className="user-modal-subtitle">
                            {step === 'pick' && 'รองรับไฟล์ Employee Data (.xlsx) — จับคู่คอลัมน์กับข้อมูลผู้ใช้งานในระบบโดยอัตโนมัติ'}
                            {step === 'preview' && 'ตรวจสอบข้อมูลก่อนบันทึกลงระบบ ยังไม่มีการเขียนข้อมูลใด ๆ ในขั้นตอนนี้'}
                            {step === 'result' && 'นำเข้าข้อมูลเสร็จสิ้น'}
                        </p>
                    </div>
                    <button type="button" className="user-modal-close" onClick={onClose} disabled={committing} aria-label="ปิด">
                        <X size={18} />
                    </button>
                </div>

                <div className="user-modal-body">
                    {error && <div className="error-banner">{error}</div>}

                    {step === 'pick' && (
                        <div className="import-dropzone">
                            {loading ? (
                                <>
                                    <Loader2 className="import-spin" size={28} />
                                    <p>กำลังอ่านไฟล์และตรวจสอบข้อมูล...</p>
                                </>
                            ) : (
                                <>
                                    <Upload size={28} />
                                    <p>เลือกไฟล์ Excel รายชื่อพนักงาน (.xlsx)</p>
                                    <button type="button" onClick={() => fileInputRef.current?.click()}>
                                        เลือกไฟล์
                                    </button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                                        hidden
                                        onChange={handleFileChosen}
                                    />
                                </>
                            )}
                        </div>
                    )}

                    {step === 'preview' && preview && (
                        <>
                            <div className="import-summary">
                                <span className="status-badge status-active">จะสร้างใหม่ {preview.summary.toCreate}</span>
                                <span className="status-badge import-badge-update">จะอัปเดต {preview.summary.toUpdate}</span>
                                {preview.summary.invalid > 0 && (
                                    <span className="status-badge status-suspended">ข้าม {preview.summary.invalid}</span>
                                )}
                            </div>

                            {preview.summary.toUpdate > 0 && (
                                <label className="checkbox-label import-reset-option">
                                    <input
                                        type="checkbox"
                                        checked={resetPassword}
                                        onChange={(e) => setResetPassword(e.target.checked)}
                                    />
                                    รีเซ็ตรหัสผ่านของผู้ใช้งานที่มีอยู่แล้วเป็นรหัสพนักงาน (ค่าเริ่มต้นคือคงรหัสผ่านเดิมไว้)
                                </label>
                            )}

                            <div className="table-scroll import-preview-scroll">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>แถว</th>
                                            <th>Username</th>
                                            <th>ชื่อ-นามสกุล</th>
                                            <th>รหัสพนักงาน</th>
                                            <th>ส่วนงาน</th>
                                            <th>E-mail</th>
                                            <th>สถานะ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {preview.accounts.slice(0, MAX_PREVIEW_ROWS).map((a) => (
                                            <tr key={a.line} className={a.status === 'invalid' ? 'row-hidden' : undefined}>
                                                <td>{a.line}</td>
                                                <td>{a.username || '—'}</td>
                                                <td>{a.fullName || '—'}</td>
                                                <td>{a.empId || '—'}</td>
                                                <td>{a.deptName || '—'}</td>
                                                <td>{a.email || '—'}</td>
                                                <td>
                                                    <span
                                                        className={`status-badge ${
                                                            a.status === 'invalid'
                                                                ? 'status-suspended'
                                                                : a.status === 'update'
                                                                    ? 'import-badge-update'
                                                                    : 'status-active'
                                                        }`}
                                                        title={a.reason || undefined}
                                                    >
                                                        {STATUS_LABELS[a.status]}
                                                    </span>
                                                    {a.reason && <span className="field-hint import-reason">{a.reason}</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {preview.accounts.length > MAX_PREVIEW_ROWS && (
                                <p className="field-hint">
                                    แสดง {MAX_PREVIEW_ROWS} จากทั้งหมด {preview.accounts.length} รายการ — ตัวเลขสรุปด้านบนนับครบทุกรายการ
                                </p>
                            )}
                        </>
                    )}

                    {step === 'result' && result && (
                        <div className="import-result">
                            <CheckCircle2 size={32} className="import-result-icon" />
                            <p>
                                สร้างผู้ใช้งานใหม่ {result.created} ราย · อัปเดต {result.updated} ราย
                                {result.skipped > 0 && ` · ข้าม ${result.skipped} ราย`}
                            </p>
                        </div>
                    )}
                </div>

                <div className="user-modal-footer">
                    {step === 'preview' && (
                        <>
                            <button type="button" onClick={reset} disabled={committing}>
                                เลือกไฟล์ใหม่
                            </button>
                            <button type="submit" onClick={handleConfirm} disabled={committing || importableCount === 0}>
                                {committing ? 'กำลังนำเข้า...' : `ยืนยันนำเข้า ${importableCount} รายการ`}
                            </button>
                        </>
                    )}
                    {step === 'result' && (
                        <button type="submit" onClick={onClose}>
                            ปิด
                        </button>
                    )}
                    {step === 'pick' && (
                        <button type="button" onClick={onClose}>
                            ยกเลิก
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
