import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Minus, Plus, X } from 'lucide-react';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const STEP = 0.4;

/**
 * Full-screen zoomable/pannable image viewer. Opened by passing a `src`
 * (falsy hides it); the caller owns that piece of state, this component only
 * renders the overlay. Supports mouse wheel, the +/- buttons, and
 * double-click/tap to zoom, plus drag-to-pan once zoomed in — the technician
 * pages this is used on (setup guide screenshots) are mostly viewed on phones
 * in the field, so both desktop and touch input need to work.
 */
export default function ImageZoomModal({ src, onClose }) {
    const [scale, setScale] = useState(1);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const dragRef = useRef(null);

    useEffect(() => {
        function onKeyDown(e) {
            if (e.key === 'Escape') onClose();
        }
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    // A newly opened image always starts at fit-to-screen, un-panned.
    useEffect(() => {
        setScale(1);
        setPos({ x: 0, y: 0 });
    }, [src]);

    if (!src) return null;

    function zoomBy(delta) {
        setScale((prev) => {
            const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev + delta));
            if (next === MIN_SCALE) setPos({ x: 0, y: 0 });
            return next;
        });
    }

    function handleWheel(e) {
        e.preventDefault();
        zoomBy(e.deltaY < 0 ? STEP : -STEP);
    }

    function handleDoubleClick(e) {
        e.stopPropagation();
        if (scale > MIN_SCALE) {
            setScale(MIN_SCALE);
            setPos({ x: 0, y: 0 });
        } else {
            setScale(2);
        }
    }

    function handlePointerDown(e) {
        if (scale <= MIN_SCALE) return;
        dragRef.current = { startX: e.clientX, startY: e.clientY, origin: pos };
        e.currentTarget.setPointerCapture(e.pointerId);
    }

    function handlePointerMove(e) {
        if (!dragRef.current) return;
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        setPos({ x: dragRef.current.origin.x + dx, y: dragRef.current.origin.y + dy });
    }

    function handlePointerUp(e) {
        dragRef.current = null;
        e.currentTarget.releasePointerCapture?.(e.pointerId);
    }

    return createPortal(
        <div className="image-zoom-overlay" onClick={onClose}>
            <div className="image-zoom-toolbar" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={() => zoomBy(-STEP)} disabled={scale <= MIN_SCALE} aria-label="ซูมออก">
                    <Minus size={18} />
                </button>
                <span className="image-zoom-level">{Math.round(scale * 100)}%</span>
                <button type="button" onClick={() => zoomBy(STEP)} disabled={scale >= MAX_SCALE} aria-label="ซูมเข้า">
                    <Plus size={18} />
                </button>
                <button type="button" onClick={onClose} aria-label="ปิด">
                    <X size={18} />
                </button>
            </div>
            <img
                src={src}
                alt=""
                className="image-zoom-img"
                draggable={false}
                onClick={(e) => e.stopPropagation()}
                onWheel={handleWheel}
                onDoubleClick={handleDoubleClick}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                style={{
                    transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
                    cursor: scale > MIN_SCALE ? 'grab' : 'zoom-in',
                }}
            />
        </div>,
        document.body
    );
}
