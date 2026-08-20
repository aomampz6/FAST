import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2 } from 'lucide-react';

/**
 * Lightweight success confirmation popup shown after a feedback submission —
 * the page itself keeps no inline "saved"/history trace, this transient
 * modal is the only confirmation the user sees. Auto-dismisses after a few
 * seconds, or immediately on backdrop/button click.
 */
export default function SuccessPopup({ open, message, onClose }) {
    useEffect(() => {
        if (!open) return undefined;
        const timer = setTimeout(onClose, 2500);
        return () => clearTimeout(timer);
    }, [open, onClose]);

    if (!open) return null;

    return createPortal(
        <div className="success-popup-overlay" onClick={onClose}>
            <div className="success-popup" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-live="polite">
                <div className="success-popup-icon">
                    <CheckCircle2 size={48} />
                </div>
                <p className="success-popup-message">{message}</p>
                <button type="button" className="success-popup-btn" onClick={onClose}>
                    ตกลง
                </button>
            </div>
        </div>,
        document.body
    );
}
