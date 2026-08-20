import Image from '@tiptap/extension-image';

const MIN_WIDTH = 60;
const ALIGN_CLASS = { left: 'rte-img-left', center: 'rte-img-center', right: 'rte-img-right' };

/**
 * Image node used by RichTextEditor — extends Tiptap's base Image with:
 *  - a `width` attribute (px), adjustable by dragging a handle on the
 *    rendered image's corner
 *  - an `align` attribute (left/center/right), so the image can sit inline
 *    with text wrapping around it instead of always alone on its own line
 *  - `draggable: true` at the node-schema level, so grabbing the image (not
 *    the resize handle) and dropping it elsewhere in the content moves it —
 *    ProseMirror's built-in node dragging handles the actual repositioning.
 *
 * The stored HTML keeps `width`/`align` as inline style + a class so the
 * read-only render on OnuSetupPage (see richTextEditor.css's
 * `.rich-text-content` rules) reproduces the same layout.
 */
export const ResizableImage = Image.extend({
    draggable: true,

    addAttributes() {
        return {
            ...this.parent?.(),
            width: {
                default: null,
                parseHTML: (element) => {
                    const width = element.style.width || element.getAttribute('width');
                    return width ? parseInt(width, 10) : null;
                },
                renderHTML: (attributes) => (attributes.width ? { style: `width: ${attributes.width}px` } : {}),
            },
            align: {
                default: 'center',
                parseHTML: (element) => element.getAttribute('data-align') || 'center',
                renderHTML: (attributes) => ({
                    'data-align': attributes.align,
                    class: `rte-image ${ALIGN_CLASS[attributes.align] || ALIGN_CLASS.center}`,
                }),
            },
        };
    },

    addNodeView() {
        return ({ node, editor, getPos }) => {
            // Mutated by update() on every doc change so setAttrs()/render()
            // always merge onto the node's current attrs, not the ones it was
            // created with — otherwise a resize after an alignment change (or
            // vice versa) would silently discard the earlier change.
            let currentNode = node;

            const wrapper = document.createElement('div');
            wrapper.classList.add('rte-image-wrap');
            wrapper.setAttribute('draggable', 'true');
            wrapper.dataset.dragHandle = '';

            const img = document.createElement('img');
            wrapper.appendChild(img);

            const toolbar = document.createElement('div');
            toolbar.classList.add('rte-image-toolbar');
            wrapper.appendChild(toolbar);

            function setAttrs(attrs) {
                const pos = typeof getPos === 'function' ? getPos() : null;
                if (pos == null) return;
                editor.view.dispatch(
                    editor.view.state.tr.setNodeMarkup(pos, undefined, { ...currentNode.attrs, ...attrs })
                );
            }

            ['left', 'center', 'right'].forEach((dir) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'rte-image-align-btn';
                btn.textContent = dir === 'left' ? '⇤' : dir === 'right' ? '⇥' : '⇔';
                btn.title =
                    dir === 'left' ? 'ชิดซ้าย (ตัวอักษรล้อมด้านขวา)' : dir === 'right' ? 'ชิดขวา (ตัวอักษรล้อมด้านซ้าย)' : 'กึ่งกลาง';
                btn.addEventListener('mousedown', (e) => e.preventDefault());
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    setAttrs({ align: dir });
                });
                toolbar.appendChild(btn);
            });

            const handle = document.createElement('div');
            handle.classList.add('rte-image-resize-handle');
            wrapper.appendChild(handle);

            let startX = 0;
            let startWidth = 0;

            function onMouseMove(e) {
                const delta = e.clientX - startX;
                const nextWidth = Math.max(MIN_WIDTH, Math.round(startWidth + delta));
                img.style.width = `${nextWidth}px`;
            }

            function onMouseUp() {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                const width = parseInt(img.style.width, 10);
                if (width) setAttrs({ width });
            }

            handle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                startX = e.clientX;
                startWidth = img.getBoundingClientRect().width;
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });

            function render() {
                img.src = currentNode.attrs.src;
                img.alt = currentNode.attrs.alt || '';
                img.style.width = currentNode.attrs.width ? `${currentNode.attrs.width}px` : '';
                const currentAlign = ALIGN_CLASS[currentNode.attrs.align] ? currentNode.attrs.align : 'center';
                img.className = `rte-image ${ALIGN_CLASS[currentAlign]}`;
                Array.from(toolbar.children).forEach((btn, i) => {
                    const dir = ['left', 'center', 'right'][i];
                    btn.classList.toggle('active', dir === currentAlign);
                });
            }

            render();

            return {
                dom: wrapper,
                update(updatedNode) {
                    if (updatedNode.type.name !== currentNode.type.name) return false;
                    currentNode = updatedNode;
                    render();
                    return true;
                },
                stopEvent(event) {
                    return event.target === handle || toolbar.contains(event.target);
                },
            };
        };
    },
});
