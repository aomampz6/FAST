/**
 * Bulk-imports login accounts for NT employees from an HR export CSV.
 *
 *   node src/scripts/import-users.js <path-to-csv> [--dry-run] [--reset-password] [--backfill]
 *
 * The CSV is the raw HR export: TIS-620/windows-874 encoded, with the columns
 *   รหัสพนักงาน, คำนำชื่อ-อังกฤษ, ชื่อ-อังกฤษ, นามสกุล-อังกฤษ, ส่วนงาน, ชื่อเต็มส่วนงาน, ชื่อเมลล์, e-mail
 *
 * Credentials are derived, never read from the file:
 *   username — the "ชื่อเมลล์" column, lowercased (already unique across the
 *              export and identical to the employee's NT mail/AD name)
 *   password — "รหัสพนักงาน", left-padded with zeros to 8 characters, which is
 *              the minimum the users API enforces (238 of 2364 ids are shorter)
 *
 * Existing accounts are left alone by default so the script is safe to re-run
 * after a partial import; --reset-password additionally rewrites the password
 * of accounts that already exist, and --backfill refreshes only their HR fields
 * (name, employee id, department, e-mail) without touching credentials — the
 * roster imported before those columns existed needs exactly that.
 */
const fs = require('fs');
const path = require('path');
const { connectDb, mongoose } = require('../config/db');
const User = require('../features/auth/auth.model');
const logger = require('../shared/logger');
const { toTitleCase } = require('../shared/names');

const PASSWORD_LENGTH = 8;
const MIN_USERNAME_LENGTH = 3;

// Minimal RFC4180 parser. A plain split(',') is not enough — the export
// contains quoted fields with commas inside (e.g. a title recorded as "mr,").
function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i += 1) {
        const char = text[i];

        if (inQuotes) {
            if (char !== '"') {
                field += char;
            } else if (text[i + 1] === '"') {
                field += '"';
                i += 1;
            } else {
                inQuotes = false;
            }
            continue;
        }

        if (char === '"') inQuotes = true;
        else if (char === ',') { row.push(field); field = ''; }
        else if (char === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
        else if (char !== '\r') field += char;
    }

    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows.filter((r) => r.some((f) => f.trim() !== ''));
}

// A header cell that must survive decoding intact. Getting the encoding wrong
// does not throw — it silently turns every Thai column into mojibake and the
// import writes thousands of corrupted names — so the decode is verified
// against this before anything else runs.
const HEADER_CANARY = 'รหัสพนักงาน';

/**
 * The HR system exports Thai text as TIS-620 (windows-874), but a file that has
 * been through Excel's "CSV UTF-8" save comes back as UTF-8 — decoding either
 * one with the other's decoder corrupts all Thai text. Detect instead of
 * assuming: UTF-8 is self-validating (TIS-620's high bytes are not valid UTF-8
 * sequences), so strict UTF-8 decoding succeeding is itself the test.
 */
function decodeCsv(buffer) {
    // Excel writes a BOM with "CSV UTF-8"; strip it or it ends up inside the
    // first header cell and breaks the canary check below.
    if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
        return { text: new TextDecoder('utf-8').decode(buffer.subarray(3)), encoding: 'utf-8 (BOM)' };
    }
    try {
        return { text: new TextDecoder('utf-8', { fatal: true }).decode(buffer), encoding: 'utf-8' };
    } catch {
        return { text: new TextDecoder('windows-874').decode(buffer), encoding: 'windows-874 (TIS-620)' };
    }
}

function readCsv(filePath) {
    const { text, encoding } = decodeCsv(fs.readFileSync(filePath));
    if (!text.includes(HEADER_CANARY)) {
        throw new Error(
            `อ่านไฟล์เป็น ${encoding} แล้วไม่พบหัวคอลัมน์ "${HEADER_CANARY}" — ` +
            'ไฟล์อาจไม่ใช่ HR export หรือ encoding ไม่ถูกต้อง (ให้ Save As เป็น "CSV (Comma delimited)" ไม่ใช่ "CSV UTF-8")'
        );
    }
    logger.info(`encoding ที่ตรวจพบ: ${encoding}`);
    return text;
}

// Column order of the HR export, as documented at the top of this file.
// Index 4 is the short ส่วนงาน code and index 5 the full ชื่อเต็มส่วนงาน — both
// are stored, on their own fields, so the admin edit modal can show each one.
const COLUMN = { empId: 0, first: 2, last: 3, deptName: 4, deptFullName: 5, mailName: 6, email: 7 };

function buildAccounts(rows) {
    const accounts = [];
    const warnings = [];
    const takenUsernames = new Map();

    rows.slice(1).forEach((row, index) => {
        const lineNumber = index + 2;
        const empId = (row[COLUMN.empId] || '').trim();
        // Names are normalised to Title Case on the way in; ส่วนงาน /
        // ชื่อเต็มส่วนงาน / e-mail are left exactly as exported (Thai has no case,
        // and an address should stay lower-case).
        const firstName = toTitleCase((row[COLUMN.first] || '').trim());
        const lastName = toTitleCase((row[COLUMN.last] || '').trim());
        const deptName = (row[COLUMN.deptName] || '').trim();
        const deptFullName = (row[COLUMN.deptFullName] || '').trim();
        const mailName = (row[COLUMN.mailName] || '').trim();
        const email = (row[COLUMN.email] || '').trim();

        let username = mailName.toLowerCase().replace(/\s+/g, '');
        const fullName = `${firstName} ${lastName}`.replace(/\s+/g, ' ').trim();

        if (!username || username.length < MIN_USERNAME_LENGTH) {
            warnings.push(`บรรทัด ${lineNumber}: ข้ามเพราะ username ไม่ถูกต้อง ("${username}") — ${fullName}`);
            return;
        }
        if (!/^\d+$/.test(empId) || empId.length > PASSWORD_LENGTH) {
            warnings.push(`บรรทัด ${lineNumber}: ข้ามเพราะรหัสพนักงานไม่ถูกต้อง ("${empId}") — ${fullName}`);
            return;
        }

        // Defensive: the current export has no collisions, but a future one
        // could — suffix rather than silently dropping the second person.
        if (takenUsernames.has(username)) {
            const nextSuffix = takenUsernames.get(username) + 1;
            takenUsernames.set(username, nextSuffix);
            warnings.push(`บรรทัด ${lineNumber}: username ซ้ำ "${username}" → ใช้ "${username}${nextSuffix}" แทน`);
            username = `${username}${nextSuffix}`;
        } else {
            takenUsernames.set(username, 1);
        }

        accounts.push({
            username,
            password: empId.padStart(PASSWORD_LENGTH, '0'),
            fullName,
            empId,
            firstName,
            lastName,
            deptName,
            deptFullName,
            email
        });
    });

    return { accounts, warnings };
}

async function importUsers({ csvPath, dryRun, resetPassword, backfill }) {
    const rows = parseCsv(readCsv(csvPath));
    const { accounts, warnings } = buildAccounts(rows);

    logger.info(`อ่านไฟล์ ${path.basename(csvPath)}: ${rows.length - 1} แถว → ${accounts.length} บัญชี`);
    warnings.forEach((w) => logger.warn(w));

    const existing = await User.find({ username: { $in: accounts.map((a) => a.username) } }).select('username');
    const existingUsernames = new Set(existing.map((u) => u.username));

    // --dry-run reads the database (never writes) so it can report the same
    // create/update/skip split the real run would produce. Knowing how many
    // accounts would be *created* is the whole point: matching is by username,
    // so a changed "ชื่อเมลล์" shows up here as an unexpected new account rather
    // than as an update, which is the one mistake this import can silently make.
    if (dryRun) {
        const toCreate = accounts.filter((a) => !existingUsernames.has(a.username));
        const willUpdate = resetPassword || backfill ? accounts.length - toCreate.length : 0;
        logger.info('--dry-run: ไม่มีการเขียนลงฐานข้อมูล');
        logger.info(
            `จะสร้างใหม่ ${toCreate.length}, อัปเดต ${willUpdate}, ข้าม ${accounts.length - toCreate.length - willUpdate}`
        );
        if (toCreate.length) {
            logger.info(`บัญชีที่จะถูกสร้างใหม่ (${Math.min(toCreate.length, 20)} รายการแรก):`);
            toCreate.slice(0, 20).forEach((a) => logger.info(`  ${a.username} | ${a.fullName} | ${a.deptName}`));
            if (toCreate.length > 20) logger.info(`  ... และอีก ${toCreate.length - 20} รายการ`);
        }
        return { created: 0, updated: 0, skipped: accounts.length };
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const account of accounts) {
        if (!existingUsernames.has(account.username)) {
            // Saved one at a time (not insertMany) so the model's pre-save hook
            // hashes each password — insertMany bypasses it and would store
            // plaintext.
            await new User({ ...account, role: 'user' }).save();
            created += 1;
            continue;
        }

        if (!resetPassword && !backfill) {
            skipped += 1;
            continue;
        }

        const user = await User.findOne({ username: account.username });
        user.fullName = account.fullName;
        user.empId = account.empId;
        user.firstName = account.firstName;
        user.lastName = account.lastName;
        user.deptName = account.deptName;
        user.deptFullName = account.deptFullName;
        user.email = account.email;
        // Only --reset-password touches the password; --backfill refreshes the
        // HR fields of accounts imported before those columns existed, leaving
        // the credentials people already use alone.
        if (resetPassword) user.password = account.password;
        await user.save();
        updated += 1;
    }

    return { created, updated, skipped };
}

async function main() {
    const args = process.argv.slice(2);
    const csvPath = args.find((a) => !a.startsWith('--'));
    if (!csvPath) {
        console.error('ใช้งาน: node src/scripts/import-users.js <path-to-csv> [--dry-run] [--reset-password] [--backfill]');
        process.exit(1);
    }

    const dryRun = args.includes('--dry-run');
    const resetPassword = args.includes('--reset-password');
    const backfill = args.includes('--backfill');

    // --dry-run needs the connection too now: it compares the file against the
    // accounts that already exist. It only ever reads.
    await connectDb();
    try {
        const result = await importUsers({ csvPath, dryRun, resetPassword, backfill });
        // A dry run already printed the projected counts; repeating the real
        // (all-zero) totals underneath them just reads as a contradiction.
        if (!dryRun) {
            logger.info(`เสร็จสิ้น — สร้างใหม่ ${result.created}, อัปเดต ${result.updated}, ข้าม ${result.skipped}`);
        }
    } finally {
        await mongoose.disconnect();
    }
}

if (require.main === module) {
    main().catch((err) => {
        logger.error(err.message);
        process.exit(1);
    });
}

module.exports = { parseCsv, buildAccounts, importUsers };
