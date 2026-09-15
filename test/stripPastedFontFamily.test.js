const assert = require('node:assert/strict');
const test = require('node:test');
const { stripFontFamily } = require('../src/scripts/strip-pasted-font-family');

test('removes a Word-pasted font-family, keeping other declarations in the same style', () => {
    const html = '<span style="font-size: 14pt; font-family: &quot;Cordia New&quot;, sans-serif;">กดที่รูปเฟือง</span>';
    assert.equal(stripFontFamily(html), '<span style="font-size: 14pt">กดที่รูปเฟือง</span>');
});

test('drops the style attribute entirely when font-family was the only declaration', () => {
    const html = '<span style="font-family: Calibri, sans-serif;">Voice</span>';
    assert.equal(stripFontFamily(html), '<span>Voice</span>');
});

test('handles an unquoted font-family value', () => {
    const html = '<span style="font-family: Calibri, sans-serif;">Save</span>';
    assert.equal(stripFontFamily(html), '<span>Save</span>');
});

test('leaves an element with no style attribute untouched', () => {
    const html = '<p><strong>ปกติ</strong></p>';
    assert.equal(stripFontFamily(html), html);
});

test('leaves non-font-family styles (color, alignment) untouched, aside from re-joining declarations', () => {
    const html = '<span style="color: red; text-align: center;">เตือน</span>';
    assert.equal(stripFontFamily(html), '<span style="color: red; text-align: center">เตือน</span>');
});

test('strips font-family from every span in a multi-paragraph document', () => {
    const html =
        '<p><span style="font-family: &quot;Angsana New&quot;, serif;">(</span></p>' +
        '<p><span style="font-family: Calibri, sans-serif;">)</span></p>';
    assert.equal(stripFontFamily(html), '<p><span>(</span></p><p><span>)</span></p>');
});
