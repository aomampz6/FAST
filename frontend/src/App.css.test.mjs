import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const css = readFileSync(new URL('./App.css', import.meta.url), 'utf8');

test('desktop sidebar lets the collapse control extend past its edge', () => {
    const desktopSidebar = css.match(/\.sidebar\s*\{(?<rules>[^}]*)\}/)?.groups?.rules;

    assert.ok(desktopSidebar, 'expected a base .sidebar rule');
    assert.match(desktopSidebar, /overflow:\s*visible\s*;/);
});

test('mobile sidebar remains vertically scrollable', () => {
    const mobileRules = css.match(/@media \(max-width: 768px\)\s*\{(?<rules>[\s\S]*)\}\s*$/)?.groups?.rules;
    const mobileSidebar = mobileRules?.match(/\.sidebar\s*\{(?<rules>[^}]*)\}/)?.groups?.rules;

    assert.ok(mobileSidebar, 'expected a mobile .sidebar rule');
    assert.match(mobileSidebar, /overflow-y:\s*auto\s*;/);
});
