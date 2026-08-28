import { useEffect, useState } from 'react';

/**
 * Light/dark theme toggle, shared by the main app layout and the admin
 * layout so switching it in either place stays in sync (both read/write the
 * same `theme` localStorage key and the same `data-theme` attribute on
 * <html>, which every themed stylesheet in the app keys off of).
 */
export function useTheme() {
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    return [theme, () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))];
}
