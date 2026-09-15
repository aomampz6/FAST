import { Component } from 'react';

/**
 * Last-resort guard around the whole app. React unmounts a component's
 * entire tree on an uncaught render error, and with nothing catching it that
 * unmount propagates all the way to the root — the app goes blank white with
 * no way back except a manual reload. That happened for real: reopening a
 * troubleshoot/ONU/ATA/AP step that already had an image in its description
 * crashed RichTextEditor's image node view during mount (see the fixed bug in
 * resizableImage.js), and every admin who hit it saw exactly this — a dead
 * page at the same URL, no error message, nothing to click.
 *
 * This does not replace fixing the underlying crash (still worth doing —
 * users get *something* usable either way, but a caught error still means a
 * broken feature) — it just guarantees a future one like it degrades to a
 * legible message and a reload button instead of a silent blank page.
 */
export default class ErrorBoundary extends Component {
    state = { error: null };

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        // eslint-disable-next-line no-console
        console.error('Unhandled render error caught by ErrorBoundary:', error, info.componentStack);
    }

    render() {
        if (!this.state.error) return this.props.children;

        return (
            <div className="app-crash-screen">
                <div className="app-crash-card">
                    <h1>เกิดข้อผิดพลาดที่ไม่คาดคิด</h1>
                    <p>ระบบพบปัญหาระหว่างแสดงผลหน้านี้ กรุณาลองโหลดหน้าใหม่อีกครั้ง</p>
                    <p className="app-crash-hint">หากปัญหายังคงเกิดขึ้น กรุณาแจ้งผู้ดูแลระบบ</p>
                    <button type="button" onClick={() => window.location.reload()}>
                        โหลดหน้าใหม่
                    </button>
                </div>
            </div>
        );
    }
}
