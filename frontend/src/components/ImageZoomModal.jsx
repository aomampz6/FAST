import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Minus, Plus, X } from 'lucide-react';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const STEP = 0.4;
/** A second tap within this long, and this close to the first, is a double tap. */
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_SLOP = 30;
/** Past this much travel a gesture counts as a pan, not a tap. */
const TAP_SLOP = 10;

const RESET = { scale: MIN_SCALE, x: 0, y: 0 };

function clampScale(value) {
    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
}

function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Pointer capture throws if the id is no longer active (a cancelled touch, a
 * pointer the browser already retargeted). Nothing here depends on it
 * succeeding โ€” it only keeps a finger that slides off the image still driving
 * the gesture โ€” so a failure isn't worth breaking the drag over.
 */
function capturePointer(el, pointerId, release) {
    try {
        if (release) el.releasePointerCapture?.(pointerId);
        else el.setPointerCapture?.(pointerId);
    } catch {
        /* pointer already released by the browser */
    }
}

/**
 * Full-screen zoomable/pannable image viewer. Opened by passing a `src`
 * (falsy hides it); the caller owns that piece of state, this component only
 * renders the overlay. The technician pages this is used on (setup guide
 * screenshots) are mostly viewed on phones and tablets in the field, so every
 * gesture has both a mouse and a touch route:
 *
 *   zoom  โ€” wheel / +โ€“ buttons (mouse), two-finger pinch (touch)
 *   pan   โ€” drag (both), or drag with either finger while pinching
 *   reset โ€” double-click (mouse), double-tap (touch)
 *
 * The overlay sets `touch-action: none`, so the browser's own pinch never
 * fires here and the gestures below are the only ones acting on the image โ€”
 * which is what keeps zooming the picture from zooming the whole page.
 */
export default function ImageZoomModal({ src, onClose }) {
    const [view, setView] = useState(RESET);
    const imgRef = useRef(null);
    /** Live pointers on the overlay, keyed by pointerId โ€” 2 of them means pinch. */
    const pointersRef = useRef(new Map());
    const pinchRef = useRef(null);
    const dragRef = useRef(null);
    const lastTapRef = useRef(null);
    /** Set while a gesture pans/pinches, so its trailing click doesn't close. */
    const gestureRef = useRef({ moved: false, pinched: false });
    /** dblclick carries no pointerType, so remember what opened the gesture. */
    const pointerTypeRef = useRef('mouse');

    // Handlers need the committed view without re-binding on every change.
    const viewRef = useRef(view);
    viewRef.current = view;

    useEffect(() => {
        function onKeyDown(e) {
            if (e.key === 'Escape') onClose();
        }
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    // A newly opened image always starts at fit-to-screen, un-panned.
    useEffect(() => {
        setView(RESET);
        pointersRef.current.clear();
        pinchRef.current = null;
        dragRef.current = null;
        lastTapRef.current = null;
    }, [src]);

    if (!src) return null;

    /**
     * Keep the image overlapping the viewport centre: it may only be dragged
     * by however much it overflows the screen at the current scale, so a
     * zoomed-in picture can never be flicked off into the void.
     */
    function clampPan(x, y, scale) {
        const el = imgRef.current;
        if (!el) return { x: 0, y: 0 };
        const slackX = Math.max(0, (el.offsetWidth * scale - window.innerWidth) / 2);
        const slackY = Math.max(0, (el.offsetHeight * scale - window.innerHeight) / 2);
        return {
            x: Math.min(slackX, Math.max(-slackX, x)),
            y: Math.min(slackY, Math.max(-slackY, y)),
        };
    }

    /**
     * Scale to `nextScale` while pinning the content under (anchorX, anchorY)
     * in place โ€” the pinch midpoint on touch, the cursor on wheel. `panX/panY`
     * is an extra translation applied first, used to follow a pinch that also
     * slides across the screen.
     */
    function zoomAt(nextScale, anchorX, anchorY, panX = 0, panY = 0) {
        setView((prev) => {
            const scale = clampScale(nextScale);
            const x = prev.x + panX;
            const y = prev.y + panY;
            if (scale === MIN_SCALE) return RESET;

            // The untransformed image is centred by the flex overlay, so the
            // anchor's offset from the image centre is (anchor - centre - pan).
            const ratio = scale / prev.scale;
            const dx = anchorX - window.innerWidth / 2 - x;
            const dy = anchorY - window.innerHeight / 2 - y;
            const panned = clampPan(x + (1 - ratio) * dx, y + (1 - ratio) * dy, scale);
            return { scale, ...panned };
        });
    }

    function zoomBy(delta) {
        zoomAt(viewRef.current.scale + delta, window.innerWidth / 2, window.innerHeight / 2);
    }

    function toggleZoomAt(x, y) {
        if (viewRef.current.scale > MIN_SCALE) setView(RESET);
        else zoomAt(2, x, y);
    }

    function handleWheel(e) {
        e.preventDefault();
        zoomAt(viewRef.current.scale + (e.deltaY < 0 ? STEP : -STEP), e.clientX, e.clientY);
    }

    function handleDoubleClick(e) {
        e.stopPropagation();
        // Touch double-taps are handled in handlePointerUp; browsers also
        // synthesise a dblclick for them, which would undo that toggle.
        if (pointerTypeRef.current !== 'mouse') return;
        toggleZoomAt(e.clientX, e.clientY);
    }

    function handlePointerDown(e) {
        const pointers = pointersRef.current;
        pointerTypeRef.current = e.pointerType || 'mouse';

        if (pointers.size === 0) gestureRef.current = { moved: false, pinched: false };
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY });
        capturePointer(e.currentTarget, e.pointerId, false);

        if (pointers.size === 2) {
            const [a, b] = [...pointers.values()];
            dragRef.current = null;
            gestureRef.current.pinched = true;
            pinchRef.current = {
                startDistance: distance(a, b) || 1,
                startScale: viewRef.current.scale,
                lastMid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
            };
        } else if (pointers.size === 1 && viewRef.current.scale > MIN_SCALE) {
            dragRef.current = { x: e.clientX, y: e.clientY, origin: { ...viewRef.current } };
        }
    }

    function handlePointerMove(e) {
        const pointers = pointersRef.current;
        const tracked = pointers.get(e.pointerId);
        if (!tracked) return;
        tracked.x = e.clientX;
        tracked.y = e.clientY;

        if (Math.hypot(e.clientX - tracked.startX, e.clientY - tracked.startY) > TAP_SLOP) {
            gestureRef.current.moved = true;
        }

        if (pointers.size >= 2 && pinchRef.current) {
            const [a, b] = [...pointers.values()];
            const spread = distance(a, b);
            if (!spread) return;
            const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
            const { lastMid, startDistance, startScale } = pinchRef.current;
            pinchRef.current.lastMid = mid;
            // Pinch and drag at once: the midpoint's travel pans, its spread zooms.
            zoomAt(
                startScale * (spread / startDistance),
                mid.x,
                mid.y,
                mid.x - lastMid.x,
                mid.y - lastMid.y
            );
            return;
        }

        const drag = dragRef.current;
        if (!drag) return;
        setView((prev) => ({
            scale: prev.scale,
            ...clampPan(
                drag.origin.x + (e.clientX - drag.x),
                drag.origin.y + (e.clientY - drag.y),
                prev.scale
            ),
        }));
    }

    function handlePointerUp(e) {
        const pointers = pointersRef.current;
        pointers.delete(e.pointerId);
        capturePointer(e.currentTarget, e.pointerId, true);

        if (pointers.size < 2) pinchRef.current = null;
        if (pointers.size === 0) {
            dragRef.current = null;
        } else if (pointers.size === 1 && viewRef.current.scale > MIN_SCALE) {
            // Lifting one finger mid-pinch: the other one takes over panning.
            const [rest] = [...pointers.values()];
            rest.startX = rest.x;
            rest.startY = rest.y;
            dragRef.current = { x: rest.x, y: rest.y, origin: { ...viewRef.current } };
            return;
        }

        if (e.type === 'pointercancel') return;
        if (pointerTypeRef.current === 'mouse') return;
        if (gestureRef.current.moved || gestureRef.current.pinched) return;

        const now = Date.now();
        const last = lastTapRef.current;
        // Compare against clientX/clientY explicitly: React's synthetic mouse
        // event carries no `x`/`y` aliases, so distance() would read NaN off it.
        const near = Math.hypot(e.clientX - last?.x, e.clientY - last?.y) < DOUBLE_TAP_SLOP;
        if (last && now - last.time < DOUBLE_TAP_MS && near) {
            lastTapRef.current = null;
            gestureRef.current.pinched = true; // suppress the click that closes
            toggleZoomAt(e.clientX, e.clientY);
        } else {
            lastTapRef.current = { time: now, x: e.clientX, y: e.clientY };
        }
    }

    function handleOverlayClick() {
        // A pan or pinch that ends over the backdrop shouldn't close the viewer.
        if (gestureRef.current.moved || gestureRef.current.pinched) return;
        onClose();
    }

    return createPortal(
        <div
            className="image-zoom-overlay"
            onClick={handleOverlayClick}
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
        >
            <div className="image-zoom-toolbar" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={() => zoomBy(-STEP)} disabled={view.scale <= MIN_SCALE} aria-label="ซูมออก">
                    <Minus size={18} />
                </button>
                <span className="image-zoom-level">{Math.round(view.scale * 100)}%</span>
                <button type="button" onClick={() => zoomBy(STEP)} disabled={view.scale >= MAX_SCALE} aria-label="ซูมเข้า">
                    <Plus size={18} />
                </button>
                <button type="button" onClick={onClose} aria-label="ปิด">
                    <X size={18} />
                </button>
            </div>
            <img
                ref={imgRef}
                src={src}
                alt=""
                className="image-zoom-img"
                draggable={false}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={handleDoubleClick}
                style={{
                    transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
                    cursor: view.scale > MIN_SCALE ? 'grab' : 'zoom-in',
                }}
            />
            <p className="image-zoom-hint">ใช้สองนิ้วเพื่อซูม · แตะสองครั้งเพื่อขยาย</p>
        </div>,
        document.body
    );
}
