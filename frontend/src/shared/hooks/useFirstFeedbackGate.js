import { useAuth } from '../auth/AuthContext';

function decodeJwt(token) {
    try {
        const payload = token.split('.')[1];
        const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(json);
    } catch {
        return null;
    }
}

function getUserId(token) {
    if (!token) return 'anonymous';
    const claims = decodeJwt(token);
    return claims?.id || 'anonymous';
}

function storageKey(userId) {
    return `fast_first_feedback_done_${userId}`;
}

/**
 * Shared "first-time-use feedback gate", ported from archive/app.js's
 * needsFirstFeedback() / markFirstFeedbackDone(): the very first time a user
 * (across the WHOLE app, not per-feature) opens a troubleshoot step detail or
 * an ONU setup config, they must submit feedback once before the gate clears.
 * One localStorage flag per user id (`fast_first_feedback_done_<userId>`)
 * covers both features, so both TroubleshootPage and OnuSetupPage should call
 * this same hook rather than tracking gate state independently.
 */
export function useFirstFeedbackGate() {
    const { token } = useAuth();
    const userId = getUserId(token);
    const key = storageKey(userId);

    function isRequired() {
        return localStorage.getItem(key) !== '1';
    }

    function markDone() {
        localStorage.setItem(key, '1');
    }

    return { isRequired, markDone };
}
