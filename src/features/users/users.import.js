/**
 * Bulk-imports accounts from an admin-uploaded Excel roster (the NT "Employee
 * Data" export) — the same employee register as src/scripts/import-users.js,
 * but as an admin-facing preview/commit flow instead of a one-shot CLI script,
 * and against a different HR export layout:
 *
 *   รหัสพนักงาน | ชื่อ-นามสกุล | ตำแหน่ง | ต.บริหาร | ส่วนงาน | โทรศัพท์ | มือถือ | e-mail
 *
 * ตำแหน่ง and the two phone columns have no matching field on the User model
 * and are ignored; everything else maps onto the existing HR columns
 * (empId, fullName, deptName, deptFullName, email).
 *
 * Credentials are derived, never read from a column the file doesn't have:
 *   username — the local part of the e-mail column, lowercased (matches the
 *              CLI importer's "ชื่อเมลล์" convention — this export's e-mail
 *              addresses use the same account name before the @)
 *   password — รหัสพนักงาน left-padded with zeros to 8 characters
 */
const XLSX = require('xlsx');
const User = require('../auth/auth.model');

const PASSWORD_LENGTH = 8;
const MIN_USERNAME_LENGTH = 3;

// Header text (as it appears in row 1) mapped to the field it fills. Matched
// by name rather than fixed column index so a reordered export still works.
const HEADER_FIELDS = {
    'รหัสพนักงาน': 'empId',
    'ชื่อ-นามสกุล': 'fullName',
    'ส่วนงาน': 'deptName',
    'ต.บริหาร': 'deptFullName',
    'e-mail': 'email'
};

const REQUIRED_HEADERS = ['รหัสพนักงาน', 'e-mail'];

function invalidFile(message) {
    const err = new Error(message);
    err.status = 400;
    return err;
}

function readWorkbookRows(buffer) {
    let workbook;
    try {
        workbook = XLSX.read(buffer, { type: 'buffer' });
    } catch {
        throw invalidFile('อ่านไฟล์ไม่สำเร็จ — ตรวจสอบว่าเป็นไฟล์ Excel (.xlsx) ที่ไม่เสียหาย');
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw invalidFile('ไม่พบชีทข้อมูลในไฟล์ Excel');

    // header: 1 keeps every row as a plain array so a merged/odd header cell
    // doesn't silently collapse two columns into one, the way sheet_to_json's
    // object mode (keyed by header text) would.
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '', blankrows: false });
    if (rows.length < 1) throw invalidFile('ไฟล์ Excel ไม่มีข้อมูล');
    return rows;
}

function buildHeaderMap(headerRow) {
    const headerLabels = headerRow.map((c) => String(c).trim());
    const map = {};
    headerLabels.forEach((label, index) => {
        const field = HEADER_FIELDS[label];
        if (field) map[field] = index;
    });

    const missing = REQUIRED_HEADERS.filter((header) => !headerLabels.includes(header));
    if (missing.length) {
        throw invalidFile(
            `ไม่พบคอลัมน์ที่จำเป็น: ${missing.join(', ')} — ตรวจสอบว่าไฟล์ตรงกับรูปแบบ Employee Data ที่ระบบรองรับ`
        );
    }
    return map;
}

function cell(row, headerMap, field) {
    const index = headerMap[field];
    if (index === undefined) return '';
    return String(row[index] ?? '').trim();
}

/**
 * Parses the workbook into candidate accounts plus per-row status, without
 * touching the database. Username collisions *within the file* are
 * auto-suffixed (mirroring the CLI importer) so two employees who share an
 * e-mail local part both get an account instead of one silently overwriting
 * the other.
 */
function parseAccounts(buffer) {
    const rows = readWorkbookRows(buffer);
    const headerMap = buildHeaderMap(rows[0]);
    const dataRows = rows.slice(1);

    const accounts = [];
    const takenUsernames = new Map();

    dataRows.forEach((row, index) => {
        const line = index + 2; // 1-based, header is row 1
        const empId = cell(row, headerMap, 'empId');
        const fullName = cell(row, headerMap, 'fullName').replace(/\s+/g, ' ');
        const deptName = cell(row, headerMap, 'deptName');
        const deptFullName = cell(row, headerMap, 'deptFullName');
        const email = cell(row, headerMap, 'email');

        if (!empId && !fullName && !email) return; // fully blank row

        let username = email.split('@')[0].toLowerCase().replace(/\s+/g, '');
        let note = '';

        if (!username || username.length < MIN_USERNAME_LENGTH) {
            accounts.push({
                line, empId, fullName, deptName, deptFullName, email, username: '',
                status: 'invalid', reason: `e-mail ไม่ถูกต้อง ("${email}") — ไม่สามารถสร้าง username ได้`
            });
            return;
        }
        if (!/^\d+$/.test(empId) || empId.length > PASSWORD_LENGTH) {
            accounts.push({
                line, empId, fullName, deptName, deptFullName, email, username,
                status: 'invalid', reason: `รหัสพนักงานไม่ถูกต้อง ("${empId}")`
            });
            return;
        }

        if (takenUsernames.has(username)) {
            const nextSuffix = takenUsernames.get(username) + 1;
            takenUsernames.set(username, nextSuffix);
            note = `username ซ้ำในไฟล์ — ใช้ "${username}${nextSuffix}" แทน`;
            username = `${username}${nextSuffix}`;
        } else {
            takenUsernames.set(username, 1);
        }

        accounts.push({
            line,
            empId,
            username,
            password: empId.padStart(PASSWORD_LENGTH, '0'),
            fullName,
            deptName,
            deptFullName,
            email,
            status: 'pending', // resolved to create/update once checked against the database
            reason: note
        });
    });

    return accounts;
}

/**
 * Parses the file and resolves each valid row to create/update against the
 * current database state, for the admin to review before anything is written.
 */
async function preview(buffer) {
    const accounts = parseAccounts(buffer);
    const validUsernames = accounts.filter((a) => a.status === 'pending').map((a) => a.username);

    const existing = await User.find({ username: { $in: validUsernames } }).select('username');
    const existingUsernames = new Set(existing.map((u) => u.username));

    accounts.forEach((account) => {
        if (account.status !== 'pending') return;
        account.status = existingUsernames.has(account.username) ? 'update' : 'create';
    });

    const summary = accounts.reduce(
        (acc, a) => {
            if (a.status === 'create') acc.toCreate += 1;
            else if (a.status === 'update') acc.toUpdate += 1;
            else acc.invalid += 1;
            return acc;
        },
        { toCreate: 0, toUpdate: 0, invalid: 0, total: accounts.length }
    );

    return { accounts, summary };
}

/**
 * Writes the reviewed rows to the database. Only `create`/`update` rows from
 * the preview should be sent here — the password is always re-derived from
 * empId server-side rather than trusted from the request body, so the stored
 * credential can't drift from the file even if the payload was edited in
 * transit.
 */
async function commit(accounts, { resetPassword = false } = {}) {
    const usernames = accounts.map((a) => a.username);
    const existing = await User.find({ username: { $in: usernames } });
    const existingByUsername = new Map(existing.map((u) => [u.username, u]));

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const account of accounts) {
        const password = String(account.empId || '').padStart(PASSWORD_LENGTH, '0');
        const existingUser = existingByUsername.get(account.username);

        if (!existingUser) {
            // Saved one at a time (not insertMany) so the model's pre-save hook
            // hashes the password — insertMany would bypass it and store plaintext.
            await new User({
                username: account.username,
                password,
                role: 'user',
                fullName: account.fullName,
                empId: account.empId,
                deptName: account.deptName,
                deptFullName: account.deptFullName,
                email: account.email
            }).save();
            created += 1;
            continue;
        }

        existingUser.fullName = account.fullName;
        existingUser.empId = account.empId;
        existingUser.deptName = account.deptName;
        existingUser.deptFullName = account.deptFullName;
        existingUser.email = account.email;
        if (resetPassword) existingUser.password = password;
        await existingUser.save();
        updated += 1;
    }

    skipped = accounts.length - created - updated;
    return { created, updated, skipped };
}

module.exports = { preview, commit, parseAccounts, PASSWORD_LENGTH, MIN_USERNAME_LENGTH };
