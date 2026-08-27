import { Monitor } from 'lucide-react';

/**
 * Brand-specific logos for the ONU brand picker, ported 1:1 from
 * archive/app.js's `ONU_BRAND_ICONS` (inline SVG / styled-div marks per
 * brand). Unknown brands fall back to a generic lucide `Monitor` icon,
 * matching archive's `<i data-lucide="monitor"></i>` fallback.
 */
const BRAND_ICONS = {
    Huawei: (
        <div style={{ color: '#E61D2B', display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                <path d="M12 2C10.5 7 10 13 12 22C14 13 13.5 7 12 2Z" />
                <path d="M8.5 5C6.5 9 6.5 14 8.5 20C10.5 14 10.5 9 8.5 5Z" />
                <path d="M15.5 5C17.5 9 17.5 14 15.5 20C13.5 14 13.5 9 15.5 5Z" />
                <path d="M5.5 9.5C4 12 4 16 5.5 18.5C7 16 7 12 5.5 9.5Z" />
                <path d="M18.5 9.5C20 12 20 16 18.5 18.5C17 16 17 12 18.5 9.5Z" />
                <path d="M3 13.5C2 15 2 17 3 18C4 17 4 15 3 13.5Z" />
                <path d="M21 13.5C22 15 22 17 21 18C20 17 20 15 21 13.5Z" />
            </svg>
        </div>
    ),
    ZTE: (
        <div style={{ color: '#0082CC', fontWeight: 900, fontSize: 18, fontFamily: "'Arial Black', sans-serif", letterSpacing: 1 }}>
            ZTE
        </div>
    ),
    Forth: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#ED1C24' }}>
            <span style={{ fontWeight: 900, fontStyle: 'italic', fontSize: 13, fontFamily: "'Arial Black', sans-serif", letterSpacing: -0.5 }}>
                FORTH
            </span>
            <div style={{ width: '100%', height: 2, background: '#ED1C24', marginTop: -2 }} />
        </div>
    ),
    Fiberhome: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 4 }}>
            <svg viewBox="0 0 40 12" width="28" height="10">
                <path d="M 2 10 Q 20 -2 38 10" fill="none" stroke="#0082CC" strokeWidth="2.5" />
                <path d="M 12 10 Q 20 3 28 10" fill="none" stroke="#ED1C24" strokeWidth="2.5" />
            </svg>
            <span style={{ color: '#0082CC', fontSize: 8, fontWeight: 'bold', fontFamily: 'Arial, sans-serif', marginTop: 2 }}>
                FiberHome
            </span>
        </div>
    ),
};

// Case-insensitive lookup — admin-entered Brand values aren't guaranteed to
// match this map's casing exactly (e.g. "HUAWEI" vs "Huawei"), and falling
// back to the generic Monitor icon for a real match just because the case
// differs is confusing next to the same brand's badge on the home card.
const BRAND_ICON_KEYS = Object.keys(BRAND_ICONS).reduce((map, key) => {
    map[key.toLowerCase()] = key;
    return map;
}, {});

export function OnuBrandIcon({ brand }) {
    const key = BRAND_ICON_KEYS[String(brand || '').toLowerCase().trim()];
    return (key && BRAND_ICONS[key]) || <Monitor />;
}
