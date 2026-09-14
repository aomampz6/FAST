const multer = require('multer');

const MAX_EXCEL_SIZE = 15 * 1024 * 1024;
const ALLOWED_EXCEL_TYPES = new Set([
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls, and what some browsers send for .xlsx
    'application/octet-stream' // fallback some browsers use for either
]);

function invalidExcel(message) {
    const err = new Error(message);
    err.status = 400;
    return err;
}

const excelUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_EXCEL_SIZE, files: 1 },
    fileFilter: (req, file, callback) => {
        if (!ALLOWED_EXCEL_TYPES.has(file.mimetype)) {
            return callback(invalidExcel('Only Excel files (.xlsx, .xls) are allowed'));
        }
        callback(null, true);
    }
});

// Zip local-file-header signature ("PK\x03\x04") covers .xlsx; the legacy OLE2
// signature covers .xls. Anything else got past fileFilter only because a
// browser mislabeled it as application/octet-stream.
const ZIP_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const OLE2_SIGNATURE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

function hasExcelSignature(file) {
    const bytes = file.buffer;
    if (bytes.length >= ZIP_SIGNATURE.length && bytes.subarray(0, ZIP_SIGNATURE.length).equals(ZIP_SIGNATURE)) {
        return true;
    }
    return bytes.length >= OLE2_SIGNATURE.length && bytes.subarray(0, OLE2_SIGNATURE.length).equals(OLE2_SIGNATURE);
}

function validateUploadedExcel(req, res, next) {
    if (!req.file || !hasExcelSignature(req.file)) {
        return next(invalidExcel('File content does not match an Excel file'));
    }
    next();
}

module.exports = { excelUpload, validateUploadedExcel, MAX_EXCEL_SIZE };
