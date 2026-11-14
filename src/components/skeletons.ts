/**
 * Skeleton placeholders shown while a page's data is on its way.
 * Each one mirrors the layout of the real page so nothing jumps when the content arrives.
 */
import { T } from '../strings';

const line = (width = '100%', cls = '') => `<span class="sk sk--line ${cls}" style="width:${width}"></span>`;
const title = (width = '70%') => `<span class="sk sk--title" style="width:${width}"></span>`;
const lines = (...widths: string[]) => widths.map((w) => line(w)).join('');
const times = (n: number, html: string | ((i: number) => string)) =>
  Array.from({ length: n }, (_, i) => (typeof html === 'string' ? html : html(i))).join('');

const card = `<div class="card sk-card">
  <span class="sk sk--media"></span>
  <div class="card__body">${line('5rem', 'sk--chip')}${title('85%')}${lines('100%', '92%', '60%')}</div>
</div>`;

const row = `<div class="sk-row"><span class="sk sk--thumb"></span><div>${lines('95%', '55%')}</div></div>`;
const widget = (rows = 4) => `<div class="widget sk-widget">${title('45%')}${times(rows, row)}</div>`;
const sidebar = `<aside class="sidebar">${widget(5)}${widget(4)}</aside>`;

const pageHead = `<header class="page-head"><div class="container sk-stack">${line('9rem')}${title('min(60%, 22rem)')}${line('min(80%, 28rem)')}</div></header>`;

const tile = `<div class="sk-tile"><span class="sk sk--circle"></span>${line('70%')}${line('40%')}</div>`;

function wrap(html: string): string {
  return `<div class="sk-page" aria-busy="true" aria-label="${T.loading}">${html}</div>`;
}

const home = () =>
  wrap(`<section class="container hero">
    <span class="sk sk--hero"></span>
    <div class="widget sk-widget">${title('40%')}${times(4, `<div class="sk-stack">${lines('4rem', '95%', '55%')}</div>`)}</div>
  </section>
  <section class="container section">
    <div class="section-head">${title('10rem')}</div>
    <div class="sk-tiles">${times(8, tile)}</div>
  </section>
  <section class="container section">
    <div class="section-head">${title('14rem')}</div>
    <div class="grid grid--3">${times(3, card)}</div>
  </section>`);

const listing = () =>
  wrap(`${pageHead}
  <div class="container layout section">
    <div class="grid grid--posts">${times(6, card)}</div>
    ${sidebar}
  </div>`);

const article = () =>
  wrap(`<div class="container container--narrow sk-stack sk-article-head">
    ${line('8rem')}${line('5rem', 'sk--chip')}${title('90%')}${title('55%')}
    <div class="sk-row"><span class="sk sk--circle sk--avatar"></span><div>${lines('10rem', '7rem')}</div></div>
  </div>
  <div class="container"><span class="sk sk--cover"></span></div>
  <div class="container layout section">
    <div class="sk-stack sk-prose">${times(3, lines('100%', '97%', '99%', '94%', '70%') + '<span class="sk-gap"></span>')}</div>
    ${sidebar}
  </div>`);

const people = () =>
  wrap(`${pageHead}
  <section class="container section">
    <div class="grid grid--authors">${times(10, `<div class="sk-tile sk-tile--tall"><span class="sk sk--circle sk--portrait"></span>${line('75%')}${line('50%')}</div>`)}</div>
  </section>`);

const books = () =>
  wrap(`${pageHead}
  <section class="container section">
    <div class="grid grid--books">${times(6, `<div class="sk-stack"><span class="sk sk--book"></span>${lines('85%', '50%')}</div>`)}</div>
  </section>`);

const music = () =>
  wrap(`${pageHead}
  <section class="container section music">
    <div class="music__layout">
      <span class="sk sk--deck"></span>
      <div class="sk-stack">${title('9rem')}${times(5, row)}</div>
    </div>
  </section>`);

const forum = () =>
  wrap(`${pageHead}
  <section class="container container--narrow section sk-stack">
    <div class="sk-pills">${times(5, line('6.5rem', 'sk--pill'))}</div>
    <div class="widget sk-widget">${times(5, `<div class="sk-row"><span class="sk sk--circle sk--avatar"></span><div>${lines('80%', '45%')}</div></div>`)}</div>
  </section>`);

const topic = () =>
  wrap(`<section class="container container--narrow section sk-stack">
    ${line('8rem')}${title('80%')}
    ${times(3, `<div class="widget sk-widget"><div class="sk-row"><span class="sk sk--circle sk--avatar"></span><div>${lines('30%', '100%', '92%', '60%')}</div></div></div>`)}
  </section>`);

const page = () =>
  wrap(`${pageHead}
  <section class="container container--narrow section sk-stack sk-prose">
    ${times(3, title('40%') + lines('100%', '96%', '98%', '65%') + '<span class="sk-gap"></span>')}
  </section>`);

const form = () =>
  wrap(`<section class="container section">
    <div class="sk-form widget">${title('60%')}${times(4, line('7rem') + '<span class="sk sk--input"></span>')}<span class="sk sk--input sk--button"></span></div>
  </section>`);

/** Picks the skeleton that matches the page being opened. */
export function skeletonFor(path: string): string {
  if (path === '/') return home();
  if (/^\/\d{4}\/\d{2}\//.test(path)) return article();
  if (/^\/(recent|featured|ফিচার্ড|search|category\/|tag\/|author\/)/.test(path)) return listing();
  if (path === '/lekhok') return people();
  if (path === '/pdf') return books();
  if (path === '/music') return music();
  if (path === '/forum') return forum();
  if (path.startsWith('/forum/')) return topic();
  if (/^\/(login|register|profile|blog_submission)$/.test(path)) return form();
  return page();
}

/**
 * Image placeholders: every `.media` box shimmers until its picture has loaded,
 * then the picture fades in. Call once at start-up.
 */
export function initImageSkeletons(): void {
  const done = (e: Event) => {
    const target = e.target;
    if (target instanceof HTMLImageElement) target.closest('.media')?.classList.add('is-loaded');
    else if (target instanceof HTMLIFrameElement) target.parentElement?.classList.add('is-loaded');
  };
  // load/error do not bubble, so listen in the capture phase.
  document.addEventListener('load', done, true);
  document.addEventListener('error', done, true);
}
