import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Slide-up bottom sheet, structurally identical to archive/app.html's static
 * #sheetOverlay / #bottomSheet markup + archive/app.js's window.openSheet /
 * window.closeSheet behavior: overlay dims background, body scroll is locked
 * while open, a short vibration fires on open (if supported), and the close
 * button can be hidden while a feedback gate (`hideClose`) is active — closing
 * via the overlay click is also blocked in that case.
 */
export default function BottomSheet({ open, onClose, hideClose, children }) {
    const contentContainerRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        document.body.style.overflow = 'hidden';
        if (navigator.vibrate) navigator.vibrate(50);
        return () => {
            document.body.style.overflow = '';
        };
    }, [open]);

    // The scroll container is part of this component's own persistent DOM —
    // it never unmounts between opens, so a leftover scrollTop from a long
    // previous item (e.g. scrolled to the bottom reading 14 steps) carries
    // over into the next, shorter item and can leave the sheet showing blank
    // space past the new content's end. Reset only on the false->true edge
    // (not on every re-render, e.g. from typing in the feedback textarea).
    useEffect(() => {
        if (open && contentContainerRef.current) {
            contentContainerRef.current.scrollTop = 0;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // A transformed ancestor (for example the `.page` entrance animation)
    // creates the containing block for `position: fixed`. Portal the sheet to
    // the document body so it is always positioned relative to the viewport.
    return createPortal(
        <>
            <div className={`sheet-overlay${open ? ' active' : ''}`} onClick={onClose} />
            <div className={`bottom-sheet${open ? ' active' : ''}`}>
                <div className="sheet-drag-area">
                    <div className="sheet-handle" />
                </div>
                {!hideClose && (
                    <button type="button" className="sheet-close-btn" onClick={onClose} aria-label="ปิด">
                        <X size={18} />
                    </button>
                )}
                <div id="sheet-content-container" ref={contentContainerRef}>
                    <div className={`sheet-content sheet-content-dark${open ? ' active' : ''}`}>{children}</div>
                </div>
            </div>
        </>,
        document.body
    );
}
