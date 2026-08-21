import DOMPurify from 'dompurify';
import RichTextEditor from './RichTextEditor';
import { useHasRole } from '../../shared/auth/access';
import './richTextEditor.css';

/**
 * Standard wrapper for every "Details"/"Steps"-style rich text field in the
 * admin area: the formatting toolbar (bold/italic/lists/heading/font
 * size/image) only renders for admins. A non-admin who somehow reaches an
 * admin form — these routes are already gated server-side and by
 * `shared/auth/access`'s RoleGate, so this is defense in depth, not the only
 * check — sees a plain read-only rendering of the same HTML instead, with no
 * toolbar and no way to edit it.
 */
export default function RichTextField({ value, onChange, onUploadImage, placeholder, disabledImageHint }) {
    const isAdmin = useHasRole(['admin']);

    if (!isAdmin) {
        return (
            <div
                className="rich-text-content rte-readonly"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(value || '') }}
            />
        );
    }

    return (
        <RichTextEditor
            value={value}
            onChange={onChange}
            onUploadImage={onUploadImage}
            placeholder={placeholder}
            disabledImageHint={disabledImageHint}
        />
    );
}
