import { useCallback, useEffect, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle, FontSize } from '@tiptap/extension-text-style';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Image as ImageIcon, Italic, List, ListOrdered, Redo, Undo } from 'lucide-react';
import { ResizableImage } from './resizableImage';
import './richTextEditor.css';

const FONT_SIZES = [
    { label: 'ปกติ', value: '' },
    { label: 'เล็ก', value: '13px' },
    { label: 'กลาง', value: '16px' },
    { label: 'ใหญ่', value: '20px' },
    { label: 'ใหญ่มาก', value: '26px' },
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
export default function RichTextEditor({ value, onChange, onUploadImage, placeholder }) {
    const uploadingRef = useRef(false);
    const fileInputRef = useRef(null);

    const editor = useEditor({
        extensions: [
            StarterKit,
            ResizableImage.configure({ inline: false }),
            TextStyle,
            FontSize,
            Placeholder.configure({ placeholder: placeholder || 'พิมพ์รายละเอียดขั้นตอน...' }),
        ],
        content: value || '',
        onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
        editorProps: {
            handlePaste: (view, event) => {
                if (!onUploadImage) return false;
                const file = Array.from(event.clipboardData?.files || []).find((f) => f.type.startsWith('image/'));
                if (!file) return false;
                event.preventDefault();
                insertImage(file);
                return true;
            },
            handleDrop: (view, event) => {
                if (!onUploadImage) return false;
                const file = Array.from(event.dataTransfer?.files || []).find((f) => f.type.startsWith('image/'));
                if (!file) return false;
                event.preventDefault();
                insertImage(file);
                return true;
            },
        },
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
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!onUploadImage}
                    title={onUploadImage ? 'แทรกรูปภาพ' : 'บันทึกข้อมูลก่อน แล้วจึงแทรกรูปภาพได้'}
                    aria-label="แทรกรูปภาพ"
                >
                    <ImageIcon size={16} />
                </button>
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
            {!onUploadImage && <p className="rte-hint">บันทึกข้อมูลก่อน แล้วแก้ไขอีกครั้งเพื่อแทรกรูปภาพระหว่างข้อความได้</p>}
        </div>
    );
}
