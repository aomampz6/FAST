/**
 * Title-casing for personal names, applied when importing the employee
 * register so the stored value is consistent regardless of how the HR export
 * spelled it (the same file contains "aatsawin khoksiri" and "ADISAK CHUNPARK").
 *
 * Deliberately duplicated in frontend/src/shared/format/names.js: the frontend
 * is a separate Vite build with no path into src/, and it keeps applying the
 * same rule at display time to cover names that never went through this import
 * (accounts an admin types in by hand). The two must stay in sync — the
 * function is idempotent, so running both is harmless.
 */

// Thai script has no letter case, so toUpperCase/toLowerCase leave it untouched
// and Thai names pass through unchanged.
function capitalizeWord(word) {
    // Keep the separators that appear inside a single name part so
    // "SOMCHAI-CHAI" becomes "Somchai-Chai" and "O'BRIEN" becomes "O'Brien".
    return word
        .split(/([-'’])/)
        .map((part) => (/^[-'’]$/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()))
        .join('');
}

function toTitleCase(name) {
    if (!name) return name;
    return String(name)
        .trim()
        .split(/\s+/)
        .map(capitalizeWord)
        .join(' ');
}

module.exports = { toTitleCase };
