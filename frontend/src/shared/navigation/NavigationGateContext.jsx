import { createContext, useCallback, useContext, useRef, useState } from 'react';

const NavigationGateContext = createContext(null);

/**
 * Lets a routed page (TroubleshootPage, OnuSetupPage — shared by ONU/ATA/AP
 * setup) tell Layout's sidebar "I currently require the user to submit their
 * first-ever feedback before they leave this view."
 *
 * Why this exists: each of those pages already blocks its own in-content
 * "back" button while feedback is required (TroubleshootPage.backToGroup,
 * OnuSetupPage.backToHome) — but Layout's sidebar links (หน้าหลัก, ตั้งค่า
 * อุปกรณ์, สมุดโทรศัพท์, ...) live outside that page's DOM tree entirely, so a
 * page has no way to intercept a click on them by itself. Layout has no
 * visibility into a page's local `feedbackRequired` state either. This
 * context bridges the two: the gated page reports `active` (and hands over
 * its existing shake-the-feedback-box nudge function), Layout reads `active`
 * to decide whether to block a sidebar click and calls `requestNudge()` to
 * reuse that same nudge — so a blocked sidebar click produces the identical
 * feedback as clicking the page's own back button while gated, not a
 * separate mechanism to keep in sync.
 *
 * Scope is intentionally per-page, not "has this account ever completed the
 * gate" — useFirstFeedbackGate already answers that. `active` here answers
 * "is a gated feedback form actually on screen right now", so browsing
 * elsewhere in the app before ever opening a gated detail view is never
 * blocked by this.
 */
export function NavigationGateProvider({ children }) {
    const [active, setActive] = useState(false);
    const nudgeRef = useRef(null);

    const registerNudge = useCallback((fn) => {
        nudgeRef.current = fn || null;
    }, []);

    const requestNudge = useCallback(() => {
        nudgeRef.current?.();
    }, []);

    return (
        <NavigationGateContext.Provider value={{ active, setActive, registerNudge, requestNudge }}>
            {children}
        </NavigationGateContext.Provider>
    );
}

export function useNavigationGate() {
    const ctx = useContext(NavigationGateContext);
    if (!ctx) {
        throw new Error('useNavigationGate must be used within a NavigationGateProvider');
    }
    return ctx;
}
