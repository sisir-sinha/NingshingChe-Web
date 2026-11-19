/**
 * HTML written in the dashboard, the app or the forum is shown on the site.
 * Everything not on the lists below is removed first, so a post can never run
 * a script or load an unexpected frame in a reader's browser.
 */
const TAGS = new Set([
  'a', 'b', 'blockquote', 'br', 'caption', 'code', 'col', 'colgroup', 'dd', 'del', 'div', 'dl', 'dt', 'em', 'figcaption', 'figure',
  'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'iframe', 'img', 'ins', 'li', 'mark', 'ol', 'p', 'pre', 's', 'small', 'span', 'strike',
  'strong', 'sub', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'u', 'ul',
]);
const DROP_WITH_CONTENT = new Set(['script', 'style', 'noscript', 'template', 'object', 'embed', 'form', 'svg', 'math', 'link', 'meta', 'title', 'head']);
const ATTRS: Record<string, string[]> = {
  a: ['href', 'title'],
  img: ['src', 'alt', 'title', 'width', 'height'],
  iframe: ['src', 'title'],
  td: ['colspan', 'rowspan'],
  th: ['colspan', 'rowspan', 'scope'],
  ol: ['start'],
};
const SAFE_LINK = /^(https?:|mailto:|tel:|\/(?!\/)|#)/i;
const SAFE_IMAGE = /^(https?:|data:image\/(png|jpe?g|gif|webp);)/i;
const SAFE_FRAME = /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com)\/embed\/[\w-]+/i;
const ALIGN = /^(left|right|center|justify)$/;

function clean(node: Element, doc: Document): void {
  for (const child of [...node.childNodes]) {
    if (child.nodeType === Node.COMMENT_NODE) {
      child.remove();
      continue;
    }
    if (!(child instanceof Element)) continue;
    let el = child;
    let tag = el.tagName.toLowerCase();
    if (DROP_WITH_CONTENT.has(tag)) {
      el.remove();
      continue;
    }
    if (tag === 'h1') {
      // The page already has its own main heading.
      const h2 = doc.createElement('h2');
      h2.append(...el.childNodes);
      el.replaceWith(h2);
      el = h2;
      tag = 'h2';
    }
    clean(el, doc);
    if (!TAGS.has(tag)) {
      el.replaceWith(...el.childNodes); // keep the text, drop the wrapper
      continue;
    }
    const align = (el as HTMLElement).style?.textAlign ?? '';
    const allowed = ATTRS[tag] ?? [];
    for (const attr of [...el.attributes]) if (!allowed.includes(attr.name)) el.removeAttribute(attr.name);
    if (ALIGN.test(align)) el.setAttribute('style', `text-align:${align}`);

    if (tag === 'a') {
      const link = el.getAttribute('href') ?? '';
      if (!SAFE_LINK.test(link.trim())) el.removeAttribute('href');
      else if (/^https?:/i.test(link)) {
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener nofollow');
      }
    } else if (tag === 'img') {
      if (!SAFE_IMAGE.test((el.getAttribute('src') ?? '').trim())) el.remove();
      else {
        el.setAttribute('loading', 'lazy');
        el.setAttribute('decoding', 'async');
        el.setAttribute('referrerpolicy', 'no-referrer');
      }
    } else if (tag === 'iframe') {
      if (!SAFE_FRAME.test((el.getAttribute('src') ?? '').trim())) el.remove();
      else {
        el.setAttribute('loading', 'lazy');
        el.setAttribute('allowfullscreen', '');
        el.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      }
    }
  }
}

export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(`<body>${html ?? ''}</body>`, 'text/html');
  clean(doc.body, doc);
  return doc.body.innerHTML;
}

/** Plain text typed in a form → safe HTML paragraphs. */
export function textToHtml(text: string): string {
  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return text
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p>${escape(p.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/** HTML → its text, for descriptions and excerpts. */
export function htmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(`<body>${html ?? ''}</body>`, 'text/html');
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/** Biographies may contain dashboard HTML or plain text from older records. */
export function biographyHtml(value: string): string {
  return /<\/?[a-z][^>]*>/i.test(value) ? sanitizeHtml(value) : textToHtml(value);
}
