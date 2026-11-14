import type { Author, Post } from '../types';
import { T } from '../strings';
import { authorUrl, B, bn, categoryUrl, esc, href, img } from '../utils';

const FALLBACK = "this.onerror=null;this.closest('.media')?.classList.add('media--empty');this.remove()";

/** Image with a fixed-ratio box so nothing jumps while it loads. */
export function media(src: string, alt: string, width: number, eager = false): string {
  if (!src) return '<span class="media media--empty" aria-hidden="true"></span>';
  return `<span class="media"><img src="${esc(img(src, width))}" alt="${esc(alt)}" ${
    eager ? 'fetchpriority="high"' : 'loading="lazy"'
  } decoding="async" onerror="${FALLBACK}"></span>`;
}

export function chip(category: string): string {
  return `<a class="chip" href="${categoryUrl(category)}">${esc(category)}</a>`;
}

function meta(post: Post): string {
  return `<div class="meta">
    <a href="${authorUrl(post.author)}"><i class="fa-solid fa-pen-nib" aria-hidden="true"></i> ${esc(post.author)}</a>
    <span><i class="fa-regular fa-calendar" aria-hidden="true"></i> ${esc(post.date)}</span>
    <span><i class="fa-regular fa-clock" aria-hidden="true"></i> ${bn(post.minutes)} ${T.minutes}</span>
  </div>`;
}

/** Standard article card used in grids and carousels. */
export function postCard(post: Post, opts: { excerpt?: boolean } = {}): string {
  const url = href(post.path);
  return `<article class="card">
    <a class="card__media" href="${url}" tabindex="-1" aria-hidden="true">${media(post.image, '', 640)}</a>
    <div class="card__body">
      ${chip(post.category)}
      <h3 class="card__title"><a href="${url}">${esc(post.title)}</a></h3>
      ${opts.excerpt === false ? '' : `<p class="card__excerpt">${esc(post.excerpt)}</p>`}
      ${meta(post)}
    </div>
  </article>`;
}

/** Compact row for sidebars. */
export function postRow(post: Post, index?: number): string {
  const url = href(post.path);
  return `<li class="row">
    ${
      index === undefined
        ? `<a class="row__media" href="${url}" tabindex="-1" aria-hidden="true">${media(post.image, '', 200)}</a>`
        : `<span class="row__num" aria-hidden="true">${bn(index)}</span>`
    }
    <div class="row__body">
      <a class="row__title" href="${url}">${esc(post.title)}</a>
      <span class="row__meta">${esc(post.author)} · ${esc(post.date)}</span>
    </div>
  </li>`;
}

export function authorCard(author: Author): string {
  const url = authorUrl(author.name);
  return `<article class="author-card">
    <a class="author-card__avatar" href="${url}" tabindex="-1" aria-hidden="true">${media(author.image, '', 240)}</a>
    <h3 class="author-card__name"><a href="${url}">${esc(author.name)}</a></h3>
    <p class="author-card__role">${esc(author.role)}</p>
    <a class="author-card__link" href="${url}">${T.viewProfile} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>
  </article>`;
}

export function sectionHead(title: string, opts: { id?: string; more?: { href: string; label: string }; nav?: string } = {}): string {
  return `<div class="section-head">
    <h2 class="section-title"${opts.id ? ` id="${opts.id}"` : ''}>${esc(title)}</h2>
    <div class="section-head__tools">
      ${opts.more ? `<a class="link-more" href="${opts.more.href}">${esc(opts.more.label)} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>` : ''}
      ${
        opts.nav
          ? `<div class="slider-nav">
              <button type="button" class="icon-btn" data-prev="${opts.nav}" aria-label="${T.prev}"><i class="fa-solid fa-chevron-left" aria-hidden="true"></i></button>
              <button type="button" class="icon-btn" data-next="${opts.nav}" aria-label="${T.next}"><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button>
            </div>`
          : ''
      }
    </div>
  </div>`;
}

export function pagination(page: number, pages: number, query: URLSearchParams): string {
  if (pages <= 1) return '';
  const link = (n: number) => {
    const q = new URLSearchParams(query);
    if (n <= 1) q.delete('page');
    else q.set('page', String(n));
    const s = q.toString();
    return s ? `?${s}` : location.pathname;
  };
  const nums: (number | '…')[] = [];
  for (let n = 1; n <= pages; n++) {
    if (n === 1 || n === pages || Math.abs(n - page) <= 1) nums.push(n);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  const edge = (n: number, label: string, icon: string, disabled: boolean, rel: string) =>
    disabled
      ? `<span class="page page--edge is-disabled">${icon === 'left' ? `<i class="fa-solid fa-chevron-left" aria-hidden="true"></i> ` : ''}${label}${icon === 'right' ? ` <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>` : ''}</span>`
      : `<a class="page page--edge" rel="${rel}" href="${link(n)}">${icon === 'left' ? `<i class="fa-solid fa-chevron-left" aria-hidden="true"></i> ` : ''}${label}${icon === 'right' ? ` <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>` : ''}</a>`;
  return `<nav class="pagination" aria-label="Pagination">
    ${edge(page - 1, T.prev, 'left', page <= 1, 'prev')}
    ${nums
      .map((n) =>
        n === '…'
          ? '<span class="page page--gap">…</span>'
          : n === page
            ? `<span class="page is-current" aria-current="page">${bn(n)}</span>`
            : `<a class="page" href="${link(n)}">${bn(n)}</a>`,
      )
      .join('')}
    ${edge(page + 1, T.next, 'right', page >= pages, 'next')}
  </nav>`;
}

/** Slice a list for the page requested in ?page=. */
export function paginate<T>(items: T[], query: URLSearchParams, perPage: number): { items: T[]; page: number; pages: number } {
  const pages = Math.max(1, Math.ceil(items.length / perPage));
  const raw = Number.parseInt(query.get('page') ?? '1', 10);
  const page = Math.min(pages, Math.max(1, Number.isFinite(raw) ? raw : 1));
  return { items: items.slice((page - 1) * perPage, page * perPage), page, pages };
}

export function emptyState(text: string): string {
  return `<div class="empty"><i class="fa-regular fa-folder-open" aria-hidden="true"></i><p>${esc(text)}</p><a class="btn btn--ghost" href="${B}/">${T.backHome}</a></div>`;
}

export function shareButtons(url: string, title: string): string {
  const u = encodeURIComponent(url);
  return `<div class="share" aria-label="${T.share}">
    <a class="icon-btn" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${u}" aria-label="Facebook"><i class="fa-brands fa-facebook-f" aria-hidden="true"></i></a>
    <a class="icon-btn" target="_blank" rel="noopener" href="https://api.whatsapp.com/send?text=${encodeURIComponent(`${title}\n${url}`)}" aria-label="WhatsApp"><i class="fa-brands fa-whatsapp" aria-hidden="true"></i></a>
    <button type="button" class="icon-btn" data-copy="${esc(url)}" aria-label="${T.copyLink}"><i class="fa-solid fa-link" aria-hidden="true"></i></button>
  </div>`;
}
