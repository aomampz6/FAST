/**
 * Display formatting for personal names.
 *
 * The employee register is the source of truth for names, and its casing is
 * inconsistent — the same export contains "aatsawin khoksiri" and
 * "ADISAK CHUNPARK". Normalising happens at display time only: the stored value
 * stays exactly as the HR system spelled it, so the admin edit form and any
 * future re-import still show and write the real data.
 */

// Thai script has no letter case, so `toUpperCase()`/`toLowerCase()` leave it
// untouched and Thai names pass through this function unchanged.
function capitalizeWord(word) {
    // Split on the separators that appear inside a single name part, keeping them,
    // so "SOMCHAI-CHAI" becomes "Somchai-Chai" and "O'BRIEN" becomes "O'Brien"
    // rather than "Somchai-chai" / "O'brien".
    return word
        .split(/([-'’])/)
        .map((part) => (/^[-'’]$/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()))
        .join('');
}

export function toTitleCase(name) {
    if (!name) return name;
    return String(name)
        .trim()
        .split(/\s+/)
        .map(capitalizeWord)
        .join(' ');
}
