import Image from '@tiptap/extension-image';

const MIN_WIDTH = 60;
const ALIGN_CLASS = { left: 'rte-img-left', center: 'rte-img-center', right: 'rte-img-right' };
const ALIGNMENTS = ['left', 'center', 'right'];

// Preset widths, as a share of the editor's content width. Guides look tidier
// when every screenshot in them is one of a few sizes rather than whatever
// width each was dragged to.
const SIZE_PRESETS = [
    { key: 'S', ratio: 0.25, title: 'ขนาดเล็ก (25%)' },
    { key: 'M', ratio: 0.5, title: 'ขนาดกลาง (50%)' },
    { key: 'L', ratio: 1, title: 'ขนาดเต็มความกว้าง (100%)' },
];

// Corner handles only: an image keeps its aspect ratio, so the edge midpoints a
// text box would have serve no purpose here.
const CORNERS = [
    { key: 'nw', signX: -1, cursor: 'nwse-resize' },
    { key: 'ne', signX: 1, cursor: 'nesw-resize' },
    { key: 'sw', signX: -1, cursor: 'nesw-resize' },
    { key: 'se', signX: 1, cursor: 'nwse-resize' },
];

// Both the live node view and the serialized HTML need the same window chrome,
// so the markup is described once here and built for each target.
const WINDOW_DOTS = ['r', 'y', 'g'];

/** The <img> inside a serialized frame, or the element itself when it is one. */
function imageIn(element) {
    return element.tagName === 'IMG' ? element : element.querySelector('img');
}

function parseWidth(element) {
    const img = imageIn(element);
    const raw = img?.style.width || img?.getAttribute('width') || element.style?.width;
    return raw ? parseInt(raw, 10) : null;
}

/**
 * Image node used by RichTextEditor — extends Tiptap's base Image with:
 *  - a `width` attribute (px), set by dragging any corner handle or by the
 *    S/M/L presets in the image's own toolbar
 *  - an `align` attribute (left/center/right), so the image can sit inline with
 *    text wrapping around it instead of always alone on its own line
 *  - a `frame` attribute: wraps the image in a macOS-style browser window
 *    (title bar + red/yellow/green dots), which is how the setup guides present
 *    screenshots of a router's web UI
 *  - `draggable: true` at the node-schema level, so grabbing the image (not a
 *    handle) and dropping it elsewhere moves it — ProseMirror's built-in node
 *    dragging does the repositioning.
 *
 * A framed image serializes as `<figure data-frame="true">` containing the bar
 * and the `<img>`; an unframed one stays a bare `<img>`. Both are re-parsed by
 * the rules below, and `richTextEditor.css` styles them identically in the
 * editor and in the read-only render on OnuSetupPage.
 */
export const ResizableImage = Image.extend({
    draggable: true,

    addAttributes() {
        return {
            ...this.parent?.(),
            // src/alt are re-declared because a framed image is matched on the
            // wrapping <figure>, where the parent's `element.getAttribute` would
            // find nothing.
            src: {
                default: null,
                parseHTML: (element) => imageIn(element)?.getAttribute('src') || null,
                renderHTML: (attributes) => (attributes.src ? { src: attributes.src } : {}),
            },
            alt: {
                default: null,
                parseHTML: (element) => imageIn(element)?.getAttribute('alt') || null,
                renderHTML: (attributes) => (attributes.alt ? { alt: attributes.alt } : {}),
            },
            width: {
                default: null,
                parseHTML: parseWidth,
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
            frame: {
                default: false,
                parseHTML: (element) => element.getAttribute('data-frame') === 'true',
                // Rendered by renderHTML() below rather than as an attribute on
                // the <img>, because the frame is extra elements, not a style.
                renderHTML: () => ({}),
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'figure[data-frame="true"]',
                // Without an <img> inside there is no image to represent, so let
                // other rules have the element.
                getAttrs: (element) => (imageIn(element) ? {} : false),
            },
            ...(this.parent?.() || []),
        ];
    },

    renderHTML({ HTMLAttributes, node }) {
        const align = ALIGN_CLASS[node.attrs.align] ? node.attrs.align : 'center';

        if (!node.attrs.frame) return ['img', HTMLAttributes];

        // The width belongs to the frame when there is one — the image fills it —
        // so it is moved off the <img> to avoid setting it twice.
        const { style, class: imgClass, ...imgAttrs } = HTMLAttributes;
        return [
            'figure',
            {
                'data-frame': 'true',
                'data-align': align,
                class: `rte-frame ${ALIGN_CLASS[align]}`,
                ...(style ? { style } : {}),
            },
            [
                'div',
                { class: 'rte-frame-bar', 'aria-hidden': 'true' },
                ...WINDOW_DOTS.map((c) => ['span', { class: `rte-frame-dot rte-frame-dot-${c}` }]),
            ],
            ['img', { ...imgAttrs, class: imgClass || 'rte-image' }],
        ];
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

            // The frame is always in the DOM and toggled with a class, so
            // switching it on and off never rebuilds the node view.
            const frame = document.createElement('div');
            frame.className = 'rte-frame';
            const bar = document.createElement('div');
            bar.className = 'rte-frame-bar';
            bar.setAttribute('aria-hidden', 'true');
            WINDOW_DOTS.forEach((c) => {
                const dot = document.createElement('span');
                dot.className = `rte-frame-dot rte-frame-dot-${c}`;
                bar.appendChild(dot);
            });
            frame.appendChild(bar);

            const img = document.createElement('img');
            frame.appendChild(img);
            wrapper.appendChild(frame);

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

            function toolButton(className, label, title, onClick) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = className;
                btn.textContent = label;
                btn.title = title;
                // mousedown default would move the selection out of the node and
                // close the toolbar before the click lands.
                btn.addEventListener('mousedown', (e) => e.preventDefault());
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    onClick();
                });
                toolbar.appendChild(btn);
                return btn;
            }

            const alignButtons = ALIGNMENTS.map((dir) =>
                toolButton(
                    'rte-image-align-btn',
                    dir === 'left' ? '⇤' : dir === 'right' ? '⇥' : '⇔',
                    dir === 'left'
                        ? 'ชิดซ้าย (ตัวอักษรล้อมด้านขวา)'
                        : dir === 'right'
                          ? 'ชิดขวา (ตัวอักษรล้อมด้านซ้าย)'
                          : 'กึ่งกลาง',
                    () => setAttrs({ align: dir })
                )
            );

            const sep1 = document.createElement('span');
            sep1.className = 'rte-image-toolbar-sep';
            toolbar.appendChild(sep1);

            /** Width of the area the image can occupy, used by the presets. */
            function contentWidth() {
                const editable = editor.view.dom;
                const style = window.getComputedStyle(editable);
                const inner =
                    editable.clientWidth - parseFloat(style.paddingLeft || 0) - parseFloat(style.paddingRight || 0);
                return Math.max(MIN_WIDTH, Math.round(inner));
            }

            const sizeButtons = SIZE_PRESETS.map((preset) =>
                toolButton('rte-image-size-btn', preset.key, preset.title, () =>
                    setAttrs({ width: Math.max(MIN_WIDTH, Math.round(contentWidth() * preset.ratio)) })
                )
            );

            const sep2 = document.createElement('span');
            sep2.className = 'rte-image-toolbar-sep';
            toolbar.appendChild(sep2);

            const frameButton = toolButton('rte-image-frame-btn', '❐', 'ครอบกรอบหน้าต่างเบราว์เซอร์ (macOS)', () =>
                setAttrs({ frame: !currentNode.attrs.frame })
            );

            // --- corner resize handles ---
            let startX = 0;
            let startWidth = 0;
            let activeSignX = 1;

            function onMouseMove(e) {
                // Dragging a left-hand corner outward means a *smaller* clientX,
                // so the delta is flipped for those.
                const delta = (e.clientX - startX) * activeSignX;
                img.style.width = `${Math.max(MIN_WIDTH, Math.round(startWidth + delta))}px`;
                frame.style.width = '';
            }

            function onMouseUp() {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                const width = parseInt(img.style.width, 10);
                if (width) setAttrs({ width });
            }

            const handles = CORNERS.map((corner) => {
                const handle = document.createElement('div');
                handle.className = `rte-image-handle rte-image-handle-${corner.key}`;
                handle.style.cursor = corner.cursor;
                handle.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    startX = e.clientX;
                    startWidth = img.getBoundingClientRect().width;
                    activeSignX = corner.signX;
                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                });
                wrapper.appendChild(handle);
                return handle;
            });

            function render() {
                const attrs = currentNode.attrs;
                const align = ALIGN_CLASS[attrs.align] ? attrs.align : 'center';
                const width = attrs.width ? `${attrs.width}px` : '';

                img.src = attrs.src;
                img.alt = attrs.alt || '';
                img.className = 'rte-image';

                // Whichever element is the outer box carries the width; the other
                // one must not, or the two fight over the layout.
                frame.classList.toggle('is-framed', Boolean(attrs.frame));
                frame.style.width = attrs.frame ? width : '';
                img.style.width = attrs.frame ? '' : width;

                wrapper.className = `rte-image-wrap ${ALIGN_CLASS[align]}`;

                alignButtons.forEach((btn, i) => btn.classList.toggle('active', ALIGNMENTS[i] === align));
                frameButton.classList.toggle('active', Boolean(attrs.frame));
                // No preset is "current" unless the width matches one, which is
                // the common case right after clicking it.
                const target = contentWidth();
                sizeButtons.forEach((btn, i) => {
                    const expected = Math.round(target * SIZE_PRESETS[i].ratio);
                    btn.classList.toggle('active', Boolean(attrs.width) && Math.abs(attrs.width - expected) <= 2);
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
                selectNode() {
                    wrapper.classList.add('is-selected');
                },
                deselectNode() {
                    wrapper.classList.remove('is-selected');
                },
                stopEvent(event) {
                    return handles.includes(event.target) || toolbar.contains(event.target);
                },
            };
        };
    },
});
