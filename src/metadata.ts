import { SITE } from './strings';
import type { View } from './types';
import { B } from './utils';

/** Keep metadata accurate after History API navigation (static HTML serves crawlers). */
export function updateMetadata(view: View, path: string): void {
  const title = view.title || SITE.name;
  const description = (view.description || SITE.description).replace(/\s+/g, ' ').trim().slice(0, 300);
  const cleanPath = path === '/' ? '/' : `${path.replace(/\/+$/, '')}/`;
  const url = new URL(`${B}${cleanPath.split('/').map(encodeURIComponent).join('/')}`, location.origin).href;
  let image = SITE.logo as string;
  if (view.image) {
    try { const parsed = new URL(view.image, location.origin); if (['https:', 'http:'].includes(parsed.protocol)) image = parsed.href; } catch { /* use site logo */ }
  }
  const meta = (selector: string, value: string) => document.querySelector<HTMLMetaElement>(selector)?.setAttribute('content', value);
  document.title = title;
  meta('meta[name="description"]', description);
  meta('meta[property="og:title"]', title);
  meta('meta[property="og:description"]', description);
  meta('meta[property="og:url"]', url);
  meta('meta[property="og:image"]', image);
  meta('meta[property="og:image:alt"]', title);
  meta('meta[property="og:type"]', view.socialType || 'website');
  const published = document.querySelector<HTMLMetaElement>('meta[property="article:published_time"]');
  if (view.socialType === 'article' && view.publishedTime) {
    const tag = published ?? document.head.appendChild(document.createElement('meta'));
    tag.setAttribute('property', 'article:published_time'); tag.content = view.publishedTime;
  } else published?.remove();
  meta('meta[name="twitter:title"]', title);
  meta('meta[name="twitter:description"]', description);
  meta('meta[name="twitter:image"]', image);
  meta('meta[name="twitter:image:alt"]', title);
  document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute('href', url);
  const robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
  const privatePage = /^\/(?:login|register|profile|search)(?:\/|$)/.test(path);
  if (privatePage) {
    const tag = robots ?? document.head.appendChild(document.createElement('meta'));
    tag.name = 'robots'; tag.content = 'noindex, nofollow';
  } else robots?.remove();
}
