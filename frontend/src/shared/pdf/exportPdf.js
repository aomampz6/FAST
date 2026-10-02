// Turns one on-screen topic panel (a TroubleshootPage symptom, an
// OnuSetupPage config topic) into a downloadable A4 PDF.
//
// The page renders as an image (html2canvas) rather than as PDF text
// (jsPDF fonts), because jsPDF's built-in fonts have no Thai glyphs and
// shaping Thai vowels/tone marks needs the browser's own text engine anyway.
//
// The live panel is cloned, not printed in place: anything marked
// `data-pdf-exclude` (prev/next buttons, the feedback form, the download
// button itself, an iframe html2canvas can't see into) is stripped from the
// clone, and a small header naming the document is added on top.

// CSS px laid out across an A4 page's printable width (190mm after the
// 10mm side margins below) — wide enough that the panel keeps its desktop
// layout even when exported from a phone.
const PDF_CONTENT_WIDTH = 720;

function sanitizeFilename(name) {
    return (
        String(name || 'document')
            .replace(/[\\/:*?"<>|]+/g, '-')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 120) || 'document'
    );
}

// The .pdf-export class (App.css) pins the theme tokens to their light
// values and the `onclone` hook below switches off the dark-theme rules, so
// the export comes out black-on-white whichever theme the viewer is using.
function buildExportNode(source, { title, subtitle }) {
    const wrapper = document.createElement('div');
    wrapper.className = 'pdf-export';
    wrapper.style.width = `${PDF_CONTENT_WIDTH}px`;

    const header = document.createElement('div');
    header.className = 'pdf-export-header';

    const brand = document.createElement('div');
    brand.className = 'pdf-export-brand';
    brand.textContent = 'FAST System — Field Assistant System for Technician';
    header.appendChild(brand);

    const heading = document.createElement('div');
    heading.className = 'pdf-export-title';
    heading.textContent = title;
    header.appendChild(heading);

    const meta = document.createElement('div');
    meta.className = 'pdf-export-meta';
    const printedAt = new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' });
    meta.textContent = [subtitle, `ดาวน์โหลดเมื่อ ${printedAt}`].filter(Boolean).join(' · ');
    header.appendChild(meta);

    wrapper.appendChild(header);

    const clone = source.cloneNode(true);
    clone.querySelectorAll('[data-pdf-exclude]').forEach((el) => el.remove());
    wrapper.appendChild(clone);

    return wrapper;
}

/**
 * @param {HTMLElement} source   the panel to export (left untouched)
 * @param {object} options
 * @param {string} options.filename  without the .pdf extension
 * @param {string} options.title     big heading at the top of page 1
 * @param {string} [options.subtitle]
 */
export async function exportElementToPdf(source, { filename, title, subtitle }) {
    // Loaded on first click only — html2pdf (html2canvas + jsPDF) is several
    // hundred kB that nobody needs until they actually ask for a PDF.
    const { default: html2pdf } = await import('html2pdf.js');

    const node = buildExportNode(source, { title, subtitle });

    await html2pdf()
        .set({
            margin: [10, 10, 12, 10],
            filename: `${sanitizeFilename(filename)}.pdf`,
            image: { type: 'jpeg', quality: 0.92 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                windowWidth: PDF_CONTENT_WIDTH,
                // html2canvas renders from its own copy of the whole document;
                // switching *that* copy to light means every
                // `[data-theme='dark'] …` rule stops matching, without the live
                // page flashing light while the PDF is being made.
                onclone: (doc) => doc.documentElement.setAttribute('data-theme', 'light'),
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            // Push a heading, image, paragraph or table row to the next
            // page rather than slicing it in half at the page edge.
            pagebreak: { mode: ['css'], avoid: ['h1', 'h2', 'h3', 'h4', 'p', 'img', 'tr', '.sg-step-title', '.pdf-avoid-break'] },
        })
        .from(node)
        .save();
}
