const fs = require('fs');
const path = require('path');

const GUIDES_DIR = path.join(__dirname, '../../../guides');
const HISTORY_DIR = path.join(GUIDES_DIR, '.history');

// Resolves a requested filename to a real path strictly inside GUIDES_DIR, rejecting
// path traversal (../, absolute paths, etc.) and anything that isn't a plain .html filename.
// The dirname check catches traversal that survives path.join (e.g. symlink tricks or
// filenames that resolve outside GUIDES_DIR once normalized).
function resolveGuidePath(filename) {
    if (typeof filename !== 'string' || !/^[a-zA-Z0-9._-]+\.html$/.test(filename)) return null;
    const fullPath = path.join(GUIDES_DIR, filename);
    if (path.dirname(fullPath) !== GUIDES_DIR) return null;
    return fullPath;
}

function listGuides() {
    const files = fs.readdirSync(GUIDES_DIR).filter((f) => f.endsWith('.html'));
    return files.map((filename) => {
        const stat = fs.statSync(path.join(GUIDES_DIR, filename));
        return { filename, size: stat.size, updatedAt: stat.mtime };
    });
}

function readGuide(filename) {
    const fullPath = resolveGuidePath(filename);
    if (!fullPath || !fs.existsSync(fullPath)) {
        const err = new Error('Guide not found');
        err.status = 404;
        throw err;
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    return { filename, content };
}

function writeGuide(filename, content) {
    const fullPath = resolveGuidePath(filename);
    if (!fullPath || !fs.existsSync(fullPath)) {
        const err = new Error('Guide not found');
        err.status = 404;
        throw err;
    }
    if (typeof content !== 'string' || content.trim().length === 0) {
        const err = new Error('Empty content');
        err.status = 400;
        throw err;
    }

    // Guides are hand-edited HTML with no version control of their own, so back up the
    // previous contents before every overwrite in case a bad edit needs to be reverted.
    if (!fs.existsSync(HISTORY_DIR)) fs.mkdirSync(HISTORY_DIR, { recursive: true });
    const backupPath = path.join(HISTORY_DIR, `${filename}.${Date.now()}.bak`);
    fs.copyFileSync(fullPath, backupPath);

    fs.writeFileSync(fullPath, content, 'utf8');
    return { filename };
}

module.exports = {
    GUIDES_DIR,
    resolveGuidePath,
    listGuides,
    readGuide,
    writeGuide
};
