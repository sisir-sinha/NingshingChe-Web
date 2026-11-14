const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

/** 2025 → ২০২৫ */
export function bn(value: number | string): string {
  return String(value).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escape text for safe use inside HTML text nodes and attributes. */
export function esc(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
}

/** Encode a path that may contain Bengali text, keeping the slashes. */
export function href(path: string): string {
  return path
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
}

export const categoryUrl = (name: string) => href(`/category/${name}`);
export const authorUrl = (name: string) => href(`/author/${name}`);
/** Tags use underscores instead of spaces, matching the existing site URLs. */
export const tagUrl = (name: string) => href(`/tag/${name.replace(/ /g, '_')}`);

/**
 * Blogger-hosted images accept a size segment (/s1536/). Ask for a width
 * that fits the slot instead of downloading the original every time.
 */
export function img(url: string, width: number): string {
  if (!url) return '';
  if (url.includes('blogger.googleusercontent.com') || url.includes('bp.blogspot.com')) {
    return url.replace(/\/s\d+(-[a-z0-9-]+)?\//i, `/w${width}/`);
  }
  return url;
}

export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number): (...args: A) => void {
  let timer: number | undefined;
  return (...args: A) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), ms);
  };
}

/** Normalise for search: lower-case and strip zero-width joiners. */
export function fold(text: string): string {
  return text.toLowerCase().replace(/[\u200b-\u200d]/g, '').normalize('NFC');
}

let toastTimer: number | undefined;
export function toast(message: string): void {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el?.classList.remove('show'), 2600);
}

export function todayBn(): string {
  try {
    return new Intl.DateTimeFormat('bn-BD', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  } catch {
    return '';
  }
}
