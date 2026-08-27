import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle, FontSize, FontFamily, Color } from '@tiptap/extension-text-style';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { Highlight } from '@tiptap/extension-highlight';
import {
    AlignCenter,
    AlignJustify,
    AlignLeft,
    AlignRight,
    AppWindowMac,
    ArrowLeftToLine,
    ArrowRightToLine,
    Bold,
    Columns3,
    Eraser,
    Highlighter,
    Image as ImageIcon,
    Italic,
    List,
    ListOrdered,
    Minus,
    Palette,
    Plus,
    Redo,
    Rows3,
    Subscript as SubscriptIcon,
    Superscript as SuperscriptIcon,
    Strikethrough,
    Table as TableIcon,
    TableCellsSplit,
    Trash2,
    Underline as UnderlineIcon,
    Undo,
    X,
} from 'lucide-react';
import { ResizableImage } from './resizableImage';
import './richTextEditor.css';

// Table width is on the <table> element itself (the whole table's overall
// size); row height is on each <tr> — neither exists on the stock
// extensions, both render as an inline style so the read-only technician
// page (which shares this HTML) picks them up with no extra CSS.
const ResizableTable = Table.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            width: {
                default: null,
                parseHTML: (element) => element.style.width || null,
                renderHTML: (attributes) => (attributes.width ? { style: `width: ${attributes.width}` } : {}),
            },
        };
    },
});

const ResizableTableRow = TableRow.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            height: {
                default: null,
                parseHTML: (element) => {
                    const h = parseInt(element.style.height, 10);
                    return Number.isFinite(h) ? h : null;
                },
                renderHTML: (attributes) => (attributes.height ? { style: `height: ${attributes.height}px` } : {}),
            },
        };
    },
});

const TABLE_WIDTHS = [
    { label: '25%', value: '25%' },
    { label: '50%', value: '50%' },
    { label: '75%', value: '75%' },
    { label: '100%', value: '100%' },
];

const DEFAULT_ROW_HEIGHT = 36;
const ROW_HEIGHT_STEP = 8;
const MIN_ROW_HEIGHT = 24;

const TEXT_ALIGNMENTS = [
    { value: 'left', Icon: AlignLeft, label: 'จัดชิดซ้าย' },
    { value: 'center', Icon: AlignCenter, label: 'จัดกึ่งกลาง' },
    { value: 'right', Icon: AlignRight, label: 'จัดชิดขวา' },
    { value: 'justify', Icon: AlignJustify, label: 'จัดเต็มบรรทัด' },
];

const FONT_SIZES = [
    { label: 'ปกติ', value: '' },
    { label: 'เล็ก', value: '13px' },
    { label: 'กลาง', value: '16px' },
    { label: 'ใหญ่', value: '20px' },
    { label: 'ใหญ่มาก', value: '26px' },
];

// Fonts already loaded by the app (index.css's Google Fonts import) plus a
// few common web-safe fallbacks, so a choice here always renders correctly
// both while editing and on the read-only technician-facing page.
const FONT_FAMILIES = [
    { label: 'ปกติ', value: '' },
    { label: 'Prompt', value: 'Prompt, sans-serif' },
    { label: 'Noto Sans Thai', value: '"Noto Sans Thai", sans-serif' },
    { label: 'Inter', value: 'Inter, sans-serif' },
    { label: 'Arial', value: 'Arial, sans-serif' },
    { label: 'Times New Roman', value: '"Times New Roman", serif' },
    { label: 'Courier New', value: '"Courier New", monospace' },
];

/**
 * Rich text editor for the ONU config "Details" field. Renders to/from an
 * HTML string (same shape the field already stored as plain text, now with
 * markup) — the caller owns that string via `value`/`onChange`.
 *
 * Image insertion (toolbar button, or pasting/dropping an image file) goes
 * through `onUploadImage(file) => Promise<url>` so this component stays
 * unaware of the onu-configs API; when it's not provided (e.g. a brand new
 * record that hasn't been saved yet, so there's no id to attach images to)
 * image insertion is simply disabled.
 */
export default function RichTextEditor({
    value,
    onChange,
    onUploadImage,
    placeholder,
    disabledImageHint = 'บันทึกข้อมูลก่อน แล้วจึงแทรกรูปภาพได้',
}) {
    const uploadingRef = useRef(false);
    const fileInputRef = useRef(null);
    // The popover is portaled to document.body (see the render below) instead
    // of living inside `.rte` — that box has `overflow: hidden` for its own
    // rounded corners, which silently clipped an absolutely-positioned
    // popover nested inside it to almost nothing. Position is computed from
    // the toggle button's viewport rect, so `position: fixed` on the portaled
    // element lines up without needing any offsetParent math.
    const tableMenuBtnRef = useRef(null);
    const tableMenuRef = useRef(null);
    const [tableMenuOpen, setTableMenuOpen] = useState(false);
    const [tableMenuPos, setTableMenuPos] = useState(null);
    const [tableRows, setTableRows] = useState(3);
    const [tableCols, setTableCols] = useState(3);

    function toggleTableMenu() {
        if (!tableMenuOpen) {
            const rect = tableMenuBtnRef.current?.getBoundingClientRect();
            if (rect) setTableMenuPos({ top: rect.bottom + 6, left: rect.left });
        }
        setTableMenuOpen((v) => !v);
    }

    useEffect(() => {
        if (!tableMenuOpen) return;
        function handleOutsideClick(e) {
            if (
                tableMenuRef.current &&
                !tableMenuRef.current.contains(e.target) &&
                !tableMenuBtnRef.current?.contains(e.target)
            ) {
                setTableMenuOpen(false);
            }
        }
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [tableMenuOpen]);

    // Tiptap v3's `useEditor` re-diffs its whole options object on every
    // render (when no deps array is given) and calls `editor.setOptions()`
    // whenever any key's *reference* differs from last time — including
    // `content` and `editorProps`. Passing `content: value` straight through
    // meant every keystroke (which updates `value` via onUpdate → parent
    // state → re-render) got immediately reset by that auto-setOptions call,
    // wiping the cursor/selection before the next character could land — the
    // editor looked unresponsive. `content` is now only read once at mount
    // (a live `value` prop is still kept in sync by the effect below, via
    // `editor.commands.setContent`, for external changes like switching
    // records); `extensions`/`editorProps` are memoized so their identity
    // stays stable across renders instead of retriggering the same reset.
    const initialContentRef = useRef(value || '');
    const onUploadImageRef = useRef(onUploadImage);
    onUploadImageRef.current = onUploadImage;
    const insertImageRef = useRef(null);

    const extensions = useMemo(
        () => [
            StarterKit,
            ResizableImage.configure({ inline: false }),
            TextStyle,
            FontSize,
            FontFamily,
            Color,
            // Paragraphs and headings only — a list item inherits its alignment
            // from the list, and images carry their own `align` attribute.
            TextAlign.configure({ types: ['paragraph', 'heading'] }),
            Placeholder.configure({ placeholder: placeholder || 'พิมพ์รายละเอียดขั้นตอน...' }),
            ResizableTable.configure({ resizable: true }),
            ResizableTableRow,
            TableHeader,
            TableCell,
            // Bold/italic/strike/underline already come from StarterKit.
            Subscript,
            Superscript,
            Highlight.configure({ multicolor: true }),
        ],
        [placeholder]
    );

    const editorProps = useMemo(
        () => ({
            handlePaste: (view, event) => {
                if (!onUploadImageRef.current) return false;
                const file = Array.from(event.clipboardData?.files || []).find((f) => f.type.startsWith('image/'));
                if (!file) return false;
                event.preventDefault();
                insertImageRef.current?.(file);
                return true;
            },
            handleDrop: (view, event) => {
                if (!onUploadImageRef.current) return false;
                const file = Array.from(event.dataTransfer?.files || []).find((f) => f.type.startsWith('image/'));
                if (!file) return false;
                event.preventDefault();
                insertImageRef.current?.(file);
                return true;
            },
        }),
        []
    );

    const editor = useEditor({
        extensions,
        content: initialContentRef.current,
        onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
        editorProps,
        // Without this, the toolbar only re-renders on content changes
        // (onUpdate) — clicking into a table without typing anything left
        // `editor.isActive('table')` stale, so the row/column/delete-table
        // controls didn't reliably appear. `true` is a stable primitive
        // passed identically every render, so it doesn't trip the
        // content/editorProps reset described above.
        shouldRerenderOnTransaction: true,
    });

    // Keep the editor's content in sync when the caller swaps `value` out from
    // under it (e.g. switching from "add new" to editing an existing record).
    useEffect(() => {
        if (!editor) return;
        if (value !== editor.getHTML()) {
            editor.commands.setContent(value || '', { emitUpdate: false });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editor, value]);

    const insertImage = useCallback(
        async (file) => {
            if (!editor || !onUploadImage || uploadingRef.current) return;
            uploadingRef.current = true;
            try {
                const url = await onUploadImage(file);
                editor.chain().focus().setImage({ src: url }).run();
            } catch (err) {
                window.alert(err.message || 'แทรกรูปภาพไม่สำเร็จ');
            } finally {
                uploadingRef.current = false;
            }
        },
        [editor, onUploadImage]
    );
    insertImageRef.current = insertImage;

    function insertTableWithSize() {
        editor
            .chain()
            .focus()
            .insertTable({ rows: tableRows, cols: tableCols, withHeaderRow: true })
            .run();
        setTableMenuOpen(false);
    }

    function adjustRowHeight(delta) {
        const current = editor.getAttributes('tableRow').height || DEFAULT_ROW_HEIGHT;
        const next = Math.max(MIN_ROW_HEIGHT, current + delta);
        editor.chain().focus().updateAttributes('tableRow', { height: next }).run();
    }

    function handlePickImage(e) {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (file) insertImage(file);
    }

    if (!editor) return null;

    return (
        <div className="rte">
            <div className="rte-toolbar">
                <select
                    className="rte-heading-select"
                    aria-label="ขนาดหัวข้อ"
                    value={
                        editor.isActive('heading', { level: 2 })
                            ? '2'
                            : editor.isActive('heading', { level: 3 })
                              ? '3'
                              : '0'
                    }
                    onChange={(e) => {
                        const level = Number(e.target.value);
                        if (!level) editor.chain().focus().setParagraph().run();
                        else editor.chain().focus().toggleHeading({ level }).run();
                    }}
                >
                    <option value="0">ข้อความปกติ</option>
                    <option value="2">หัวข้อใหญ่</option>
                    <option value="3">หัวข้อย่อย</option>
                </select>
                <select
                    className="rte-heading-select"
                    aria-label="ขนาดตัวอักษร"
                    value={editor.getAttributes('textStyle').fontSize || ''}
                    onChange={(e) => {
                        const size = e.target.value;
                        if (!size) editor.chain().focus().unsetFontSize().run();
                        else editor.chain().focus().setFontSize(size).run();
                    }}
                >
                    {FONT_SIZES.map((s) => (
                        <option key={s.label} value={s.value}>
                            {s.label}
                        </option>
                    ))}
                </select>
                <select
                    className="rte-heading-select"
                    aria-label="รูปแบบตัวอักษร"
                    value={editor.getAttributes('textStyle').fontFamily || ''}
                    onChange={(e) => {
                        const font = e.target.value;
                        if (!font) editor.chain().focus().unsetFontFamily().run();
                        else editor.chain().focus().setFontFamily(font).run();
                    }}
                >
                    {FONT_FAMILIES.map((f) => (
                        <option key={f.label} value={f.value} style={{ fontFamily: f.value || undefined }}>
                            {f.label}
                        </option>
                    ))}
                </select>
                <span className="rte-toolbar-sep" />
                <label className="rte-color-swatch" title="สีตัวอักษร">
                    <Palette size={14} />
                    <input
                        type="color"
                        aria-label="สีตัวอักษร"
                        value={editor.getAttributes('textStyle').color || '#ffffff'}
                        onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
                    />
                </label>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().unsetColor().run()}
                    disabled={!editor.getAttributes('textStyle').color}
                    title="ล้างสีตัวอักษร"
                    aria-label="ล้างสีตัวอักษร"
                >
                    <X size={14} />
                </button>
                <label className="rte-color-swatch" title="สีไฮไลต์">
                    <Highlighter size={14} />
                    <input
                        type="color"
                        aria-label="สีไฮไลต์"
                        value={editor.getAttributes('highlight').color || '#fff2a8'}
                        onChange={(e) => editor.chain().focus().setHighlight({ color: e.target.value }).run()}
                    />
                </label>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().unsetHighlight().run()}
                    disabled={!editor.isActive('highlight')}
                    title="ล้างสีไฮไลต์"
                    aria-label="ล้างสีไฮไลต์"
                >
                    <X size={14} />
                </button>
                <span className="rte-toolbar-sep" />
                <button
                    type="button"
                    className={editor.isActive('bold') ? 'active' : undefined}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    aria-label="ตัวหนา"
                >
                    <Bold size={16} />
                </button>
                <button
                    type="button"
                    className={editor.isActive('italic') ? 'active' : undefined}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    aria-label="ตัวเอียง"
                >
                    <Italic size={16} />
                </button>
                <button
                    type="button"
                    className={editor.isActive('underline') ? 'active' : undefined}
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    aria-label="ขีดเส้นใต้"
                >
                    <UnderlineIcon size={16} />
                </button>
                <button
                    type="button"
                    className={editor.isActive('strike') ? 'active' : undefined}
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    aria-label="ขีดฆ่า"
                >
                    <Strikethrough size={16} />
                </button>
                <button
                    type="button"
                    className={editor.isActive('subscript') ? 'active' : undefined}
                    onClick={() => editor.chain().focus().toggleSubscript().run()}
                    aria-label="ตัวห้อย"
                    title="ตัวห้อย (Subscript)"
                >
                    <SubscriptIcon size={16} />
                </button>
                <button
                    type="button"
                    className={editor.isActive('superscript') ? 'active' : undefined}
                    onClick={() => editor.chain().focus().toggleSuperscript().run()}
                    aria-label="ตัวยก"
                    title="ตัวยก (Superscript)"
                >
                    <SuperscriptIcon size={16} />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
                    title="ล้างการจัดรูปแบบทั้งหมด"
                    aria-label="ล้างการจัดรูปแบบทั้งหมด"
                >
                    <Eraser size={16} />
                </button>
                <span className="rte-toolbar-sep" />
                <button
                    type="button"
                    className={editor.isActive('bulletList') ? 'active' : undefined}
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    aria-label="รายการแบบจุด"
                >
                    <List size={16} />
                </button>
                <button
                    type="button"
                    className={editor.isActive('orderedList') ? 'active' : undefined}
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    aria-label="รายการแบบตัวเลข"
                >
                    <ListOrdered size={16} />
                </button>
                <span className="rte-toolbar-sep" />
                {/* Paragraph alignment. Images are aligned from their own
                    on-image toolbar instead, because `align` is an attribute of
                    the image node rather than of the block it sits in. */}
                {TEXT_ALIGNMENTS.map(({ value, Icon, label }) => (
                    <button
                        key={value}
                        type="button"
                        className={editor.isActive({ textAlign: value }) ? 'active' : undefined}
                        onClick={() => editor.chain().focus().setTextAlign(value).run()}
                        title={label}
                        aria-label={label}
                        aria-pressed={editor.isActive({ textAlign: value })}
                    >
                        <Icon size={16} />
                    </button>
                ))}
                <span className="rte-toolbar-sep" />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!onUploadImage}
                    title={onUploadImage ? 'แทรกรูปภาพ' : disabledImageHint}
                    aria-label="แทรกรูปภาพ"
                >
                    <ImageIcon size={16} />
                </button>
                {/* Only meaningful with an image selected, so it stays disabled
                    otherwise rather than silently doing nothing. */}
                <button
                    type="button"
                    className={editor.isActive('image', { frame: true }) ? 'active' : undefined}
                    disabled={!editor.isActive('image')}
                    onClick={() =>
                        editor
                            .chain()
                            .focus()
                            .updateAttributes('image', { frame: !editor.getAttributes('image').frame })
                            .run()
                    }
                    title={
                        editor.isActive('image')
                            ? 'ครอบกรอบหน้าต่างเบราว์เซอร์ (macOS)'
                            : 'เลือกรูปภาพก่อน แล้วจึงครอบกรอบหน้าต่างได้'
                    }
                    aria-label="ครอบกรอบหน้าต่างเบราว์เซอร์"
                    aria-pressed={editor.isActive('image', { frame: true })}
                >
                    <AppWindowMac size={16} />
                </button>
                <span className="rte-toolbar-sep" />
                {/* Insert always available (opens a rows/cols picker); the
                    row/column/resize/delete controls only make sense (and
                    only render) while the cursor is inside an existing table. */}
                <button
                    type="button"
                    ref={tableMenuBtnRef}
                    className={editor.isActive('table') ? 'active' : undefined}
                    onClick={toggleTableMenu}
                    title="แทรกตาราง"
                    aria-label="แทรกตาราง"
                    aria-expanded={tableMenuOpen}
                >
                    <TableIcon size={16} />
                </button>
                {tableMenuOpen &&
                    tableMenuPos &&
                    createPortal(
                        <div
                            className="rte-table-menu"
                            ref={tableMenuRef}
                            style={{ position: 'fixed', top: tableMenuPos.top, left: tableMenuPos.left }}
                        >
                            <label>
                                จำนวนแถว
                                <input
                                    type="number"
                                    min={1}
                                    max={20}
                                    value={tableRows}
                                    onChange={(e) => setTableRows(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
                                />
                            </label>
                            <label>
                                จำนวนคอลัมน์
                                <input
                                    type="number"
                                    min={1}
                                    max={12}
                                    value={tableCols}
                                    onChange={(e) => setTableCols(Math.min(12, Math.max(1, Number(e.target.value) || 1)))}
                                />
                            </label>
                            <button type="button" onClick={insertTableWithSize}>
                                แทรกตาราง
                            </button>
                        </div>,
                        document.body
                    )}
                {editor.isActive('table') && (
                    <>
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().addRowAfter().run()}
                            title="เพิ่มแถว"
                            aria-label="เพิ่มแถว"
                        >
                            <Rows3 size={16} />
                        </button>
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().addColumnAfter().run()}
                            title="เพิ่มคอลัมน์"
                            aria-label="เพิ่มคอลัมน์"
                        >
                            <Columns3 size={16} />
                        </button>
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().deleteRow().run()}
                            title="ลบแถว"
                            aria-label="ลบแถว"
                        >
                            <ArrowLeftToLine size={16} style={{ transform: 'rotate(90deg)' }} />
                        </button>
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().deleteColumn().run()}
                            title="ลบคอลัมน์"
                            aria-label="ลบคอลัมน์"
                        >
                            <ArrowRightToLine size={16} style={{ transform: 'rotate(90deg)' }} />
                        </button>
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().mergeOrSplit().run()}
                            title="รวม/แยกเซลล์"
                            aria-label="รวม/แยกเซลล์"
                        >
                            <TableCellsSplit size={16} />
                        </button>
                        <span className="rte-toolbar-sep" />
                        {/* Column width is already drag-resizable (Table's
                            `resizable: true`, handles on the column borders).
                            These cover the table's overall width and each
                            row's height, which aren't drag-resizable. */}
                        <select
                            className="rte-heading-select"
                            aria-label="ขนาดตาราง"
                            value={editor.getAttributes('table').width || ''}
                            onChange={(e) => {
                                const width = e.target.value;
                                if (!width) editor.chain().focus().updateAttributes('table', { width: null }).run();
                                else editor.chain().focus().updateAttributes('table', { width }).run();
                            }}
                        >
                            <option value="">ขนาดตาราง</option>
                            {TABLE_WIDTHS.map((w) => (
                                <option key={w.value} value={w.value}>
                                    ตาราง {w.label}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={() => adjustRowHeight(-ROW_HEIGHT_STEP)}
                            title="ลดความสูงแถว"
                            aria-label="ลดความสูงแถว"
                        >
                            <Minus size={14} />
                        </button>
                        <button
                            type="button"
                            onClick={() => adjustRowHeight(ROW_HEIGHT_STEP)}
                            title="เพิ่มความสูงแถว"
                            aria-label="เพิ่มความสูงแถว"
                        >
                            <Plus size={14} />
                        </button>
                        <button
                            type="button"
                            className="danger"
                            onClick={() => {
                                if (window.confirm('ต้องการลบตารางนี้ทั้งหมดใช่หรือไม่?')) {
                                    editor.chain().focus().deleteTable().run();
                                }
                            }}
                            title="ลบตาราง"
                            aria-label="ลบตาราง"
                        >
                            <Trash2 size={16} />
                        </button>
                    </>
                )}
                <span className="rte-toolbar-sep" />
                <button type="button" onClick={() => editor.chain().focus().undo().run()} aria-label="ย้อนกลับ">
                    <Undo size={16} />
                </button>
                <button type="button" onClick={() => editor.chain().focus().redo().run()} aria-label="ทำซ้ำ">
                    <Redo size={16} />
                </button>
            </div>
            <EditorContent editor={editor} className="rte-content" />
            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handlePickImage} />
            {!onUploadImage && <p className="rte-hint">{disabledImageHint}</p>}
        </div>
    );
}
