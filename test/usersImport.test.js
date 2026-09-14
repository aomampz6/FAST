const assert = require('node:assert/strict');
const test = require('node:test');
const XLSX = require('xlsx');
const { parseAccounts } = require('../src/features/users/users.import');

const HEADER = ['รหัสพนักงาน', 'ชื่อ-นามสกุล', 'ตำแหน่ง', 'ต.บริหาร', 'ส่วนงาน', 'โทรศัพท์', 'มือถือ', 'e-mail'];

function workbookOf(rows) {
    const sheet = XLSX.utils.aoa_to_sheet([HEADER, ...rows]);
    return XLSX.write({ SheetNames: ['Sheet1'], Sheets: { Sheet1: sheet } }, { type: 'buffer', bookType: 'xlsx' });
}

test('maps a well-formed row onto the derived account fields', () => {
    const buffer = workbookOf([
        ['13603053', 'นายประสิทธิ์ พรายงาม', 'ผจก.11', 'ผจก.ททค.', 'ททค.', '025749623', '0818543153', 'prasit@ntplc.co.th']
    ]);

    const [account] = parseAccounts(buffer);
    assert.deepEqual(account, {
        line: 2,
        empId: '13603053',
        username: 'prasit',
        password: '13603053',
        fullName: 'นายประสิทธิ์ พรายงาม',
        deptName: 'ททค.',
        deptFullName: 'ผจก.ททค.',
        email: 'prasit@ntplc.co.th',
        status: 'pending',
        reason: ''
    });
});

test('left-pads a short รหัสพนักงาน to an 8-character password', () => {
    const buffer = workbookOf([
        ['4297', 'นายทรงวิทย์ ดวงพัตรา', 'พธก.6', '', 'วทกค.', '', '0882959595', 'songwit.d@ntplc.co.th']
    ]);

    const [account] = parseAccounts(buffer);
    assert.equal(account.password, '00004297');
});

test('suffixes a username that repeats within the file instead of dropping the row', () => {
    const buffer = workbookOf([
        ['00301136', 'นายเอ หนึ่ง', '', '', 'ททค.', '', '', 'somchai@ntplc.co.th'],
        ['00301137', 'นายบี สอง', '', '', 'ททค.', '', '', 'somchai@ntplc.co.th']
    ]);

    const [first, second] = parseAccounts(buffer);
    assert.equal(first.username, 'somchai');
    assert.equal(second.username, 'somchai2');
    assert.match(second.reason, /ซ้ำในไฟล์/);
});

test('flags a row with an invalid รหัสพนักงาน instead of importing a bad password', () => {
    const buffer = workbookOf([
        ['ไม่ระบุ', 'นางสาวข ทดสอบ', '', '', 'ททค.', '', '', 'kaew@ntplc.co.th']
    ]);

    const [account] = parseAccounts(buffer);
    assert.equal(account.status, 'invalid');
    assert.match(account.reason, /รหัสพนักงานไม่ถูกต้อง/);
});

test('flags a row whose e-mail cannot produce a username', () => {
    const buffer = workbookOf([
        ['00301136', 'นายซี ทดสอบ', '', '', 'ททค.', '', '', '']
    ]);

    const [account] = parseAccounts(buffer);
    assert.equal(account.status, 'invalid');
    assert.match(account.reason, /e-mail ไม่ถูกต้อง/);
});

test('skips a fully blank row', () => {
    const buffer = workbookOf([
        ['00301136', 'นายดี ทดสอบ', '', '', 'ททค.', '', '', 'dee@ntplc.co.th'],
        ['', '', '', '', '', '', '', '']
    ]);

    assert.equal(parseAccounts(buffer).length, 1);
});
