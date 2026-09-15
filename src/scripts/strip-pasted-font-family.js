/**
 * One-off (re-runnable) cleanup for rich text content that carries inline
 * `font-family` styles pasted in from Microsoft Word/Outlook — fonts like
 * "Cordia New", "Angsana New", or Calibri that this app never loads. Left in
 * place, the browser can't find the font and falls back to the OS's own
 * default serif/sans-serif instead of the app's Prompt stack, so the pasted
 * text visibly stops matching everything else on the page. Confirmed cause of
 * four HUAWEI HG8145V5 ONU setup guides (ตั้งค่า Bridge Mode, การตั้งค่าเปิด
 * รีโมท, ตั้งเวลา Time Zone, ตั้งค่า VOIP) rendering in a mismatched font.
 *
 * RichTextEditor.jsx's `transformPastedHTML` now strips this out of every
 * *future* paste at the source — this script is only for content saved
 * before that existed. Safe to run again later (e.g. after restoring an
 * older backup, or if a paste guard is ever bypassed): it is a no-op on
 * content that has no font-family left to remove.
 *
 * Scans every collection RichTextField/RichTextEditor is used against:
 * OnuConfig.Details (shared by ONU/ATA/AP configs — see DeviceType) and
 * Scom.Steps (legacy) / Scom.StepItems[].Description.
 *
 *   node src/scripts/strip-pasted-font-family.js [--dry-run]
 *
 * Every `font-size`/bold/color/etc. inline style is left untouched — only
 * font-family is presumed to be paste debris, never something worth keeping
 * from an external source. A deliberate choice made through the editor's own
 * "รูปแบบตัวอักษร" dropdown (Prompt/Noto Sans Thai/Inter/Arial/Times New
 * Roman/Courier New) looks identical to paste debris to this script and would
 * be stripped the same way — none of the content scanned so far has used
 * that picker, but re-check with --dry-run before trusting a future run
 * blindly if that ever changes.
 */
const { connectDb, mongoose } = require('../config/db');
const OnuConfig = require('../features/onu-configs/onuConfigs.model');
const Scom = require('../features/scoms/scoms.model');
const logger = require('../shared/logger');

function stripFontFamily(html) {
    return html.replace(/\s*style="([^"]*)"/gi, (full, rawStyleContent) => {
        // The style attribute is itself inside a double-quoted HTML
        // attribute, so a literal quote around a font name (e.g. "Cordia
        // New") arrives HTML-escaped as `&quot;` — decode that first so
        // splitting on `;` doesn't cut through the entity's own `;`.
        const styleContent = rawStyleContent.replace(/&quot;/g, '"');
        const decls = styleContent.split(';').map((s) => s.trim()).filter(Boolean);
        const kept = decls.filter((decl) => !/^font-family\s*:/i.test(decl));
        if (kept.length === 0) return '';
        const rebuilt = kept.join('; ').replace(/"/g, '&quot;');
        return ` style="${rebuilt}"`;
    });
}

async function cleanOnuConfigs(dryRun) {
    const docs = await OnuConfig.find({ Details: { $regex: 'font-family' } });
    for (const doc of docs) {
        const after = stripFontFamily(doc.Details);
        logger.info(`OnuConfig ${doc._id} (${doc.Brand} ${doc.Model} — ${doc.Mode}): ${doc.Details.length} -> ${after.length} chars`);
        if (!dryRun) {
            doc.Details = after;
            await doc.save();
        }
    }
    return docs.length;
}

async function cleanScoms(dryRun) {
    const docs = await Scom.find({
        $or: [{ Steps: { $regex: 'font-family' } }, { 'StepItems.Description': { $regex: 'font-family' } }]
    });
    for (const doc of docs) {
        if (doc.Steps) doc.Steps = stripFontFamily(doc.Steps);
        doc.StepItems.forEach((step) => {
            if (step.Description) step.Description = stripFontFamily(step.Description);
        });
        logger.info(`Scom ${doc._id} (${doc.ID} — ${doc.Scoms})`);
        if (!dryRun) await doc.save();
    }
    return docs.length;
}

async function main() {
    const dryRun = process.argv.includes('--dry-run');

    await connectDb();
    try {
        const onuCount = await cleanOnuConfigs(dryRun);
        const scomCount = await cleanScoms(dryRun);
        logger.info(
            dryRun
                ? `--dry-run: ไม่มีการเขียนลงฐานข้อมูล — พบ ${onuCount} OnuConfig, ${scomCount} Scom ที่มี font-family`
                : `เสร็จสิ้น — แก้ไข ${onuCount} OnuConfig, ${scomCount} Scom`
        );
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

module.exports = { stripFontFamily };
