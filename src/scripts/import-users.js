/**
 * Bulk-imports login accounts for NT employees from an HR export CSV.
 *
 *   node src/scripts/import-users.js <path-to-csv> [--dry-run] [--reset-password]
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
 * of accounts that already exist.
 */
const fs = require('fs');
const path = require('path');
const { connectDb, mongoose } = require('../config/db');
const User = require('../features/auth/auth.model');
const logger = require('../shared/logger');

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

// The HR system exports Thai text as TIS-620 (windows-874), not UTF-8 — reading
// it as UTF-8 turns every Thai column into replacement characters.
function readCsv(filePath) {
    const buffer = fs.readFileSync(filePath);
    return new TextDecoder('windows-874').decode(buffer);
}

const COLUMN = { empId: 0, first: 2, last: 3, mailName: 6 };

function buildAccounts(rows) {
    const accounts = [];
    const warnings = [];
    const takenUsernames = new Map();

    rows.slice(1).forEach((row, index) => {
        const lineNumber = index + 2;
        const empId = (row[COLUMN.empId] || '').trim();
        const firstName = (row[COLUMN.first] || '').trim();
        const lastName = (row[COLUMN.last] || '').trim();
        const mailName = (row[COLUMN.mailName] || '').trim();

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

        accounts.push({ username, password: empId.padStart(PASSWORD_LENGTH, '0'), fullName });
    });

    return { accounts, warnings };
}

async function importUsers({ csvPath, dryRun, resetPassword }) {
    const rows = parseCsv(readCsv(csvPath));
    const { accounts, warnings } = buildAccounts(rows);

    logger.info(`อ่านไฟล์ ${path.basename(csvPath)}: ${rows.length - 1} แถว → ${accounts.length} บัญชี`);
    warnings.forEach((w) => logger.warn(w));

    if (dryRun) {
        logger.info('--dry-run: ไม่มีการเขียนลงฐานข้อมูล');
        accounts.slice(0, 10).forEach((a) => logger.info(`  ${a.fullName} | ${a.username} | ${a.password}`));
        return { created: 0, updated: 0, skipped: accounts.length };
    }

    const existing = await User.find({ username: { $in: accounts.map((a) => a.username) } }).select('username');
    const existingUsernames = new Set(existing.map((u) => u.username));

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

        if (!resetPassword) {
            skipped += 1;
            continue;
        }

        const user = await User.findOne({ username: account.username });
        user.password = account.password;
        user.fullName = account.fullName;
        await user.save();
        updated += 1;
    }

    return { created, updated, skipped };
}

async function main() {
    const args = process.argv.slice(2);
    const csvPath = args.find((a) => !a.startsWith('--'));
    if (!csvPath) {
        console.error('ใช้งาน: node src/scripts/import-users.js <path-to-csv> [--dry-run] [--reset-password]');
        process.exit(1);
    }

    const dryRun = args.includes('--dry-run');
    const resetPassword = args.includes('--reset-password');

    if (!dryRun) await connectDb();
    try {
        const result = await importUsers({ csvPath, dryRun, resetPassword });
        logger.info(`เสร็จสิ้น — สร้างใหม่ ${result.created}, อัปเดต ${result.updated}, ข้าม ${result.skipped}`);
    } finally {
        if (!dryRun) await mongoose.disconnect();
    }
}

if (require.main === module) {
    main().catch((err) => {
        logger.error(err.message);
        process.exit(1);
    });
}

module.exports = { parseCsv, buildAccounts, importUsers };
