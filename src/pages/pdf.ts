import { getSite } from '../api';
import { SITE, T } from '../strings';
import type { RouteContext, View } from '../types';
import { esc } from '../utils';
import { pdfCard } from './home';
import { pageHead } from './listing';
import { notFoundPage } from './static';

export async function pdfListPage(): Promise<View> {
  const site = await getSite();
  return {
    title: `${T.pdfBooks} | ${SITE.name}`,
    description: `${T.pdfBooks} — ${SITE.description}`,
    html: `
    ${pageHead('PDF', 'fa-solid fa-book-open', T.pdfBooks)}
    <section class="container section"><div class="grid grid--books">${site.pdfs.map(pdfCard).join('')}</div></section>`,
  };
}

export async function pdfPage(ctx: RouteContext): Promise<View> {
  const site = await getSite();
  // Old links used a running number (/read_pdf/1 = the newest book); keep them working.
  const book = site.pdfs.find((b) => b.id === ctx.params[0]) ?? (/^\d+$/.test(ctx.params[0]) ? site.pdfs.filter((b) => b.id !== 'ningshingche-2026')[Number(ctx.params[0]) - 1] : undefined);
  if (!book) return notFoundPage();
  const others = site.pdfs.filter((b) => b.id !== book.id);

  return {
    title: `${book.title} | ${SITE.name}`,
    description: `${book.title} — ${T.published}: ${book.published}`,
    image: book.cover,
    html: `
    ${pageHead(
      'PDF',
      'fa-solid fa-book-open',
      book.title,
      `${T.published}: ${book.published}`,
      `<div class="pill-row">
        <a class="icon-btn pdf-action" href="${esc(book.file)}" target="_blank" rel="noopener" aria-label="${T.openNew}" title="${T.openNew}"><i class="fa-solid fa-up-right-from-square" aria-hidden="true"></i></a>
        <a class="icon-btn pdf-action" href="${esc(book.file)}" download target="_blank" rel="noopener" aria-label="${T.download}" title="${T.download}"><i class="fa-solid fa-download" aria-hidden="true"></i></a>
      </div>`,
    )}
    <section class="container section">
      <div class="pdf-viewer" data-pdf-viewer role="region" aria-label="${esc(book.title)} বইয়ের পাঠক">
        <p data-pdf-status role="status"><span class="pdf-spinner" aria-hidden="true"></span><span class="sr-only">বই লোড হচ্ছে…</span></p>
        <div data-pdf-book></div>
      </div>
      <button type="button" class="icon-btn pdf-action flip-reader__fallback" data-book-fallback aria-expanded="false" aria-label="সাধারণ PDF রিডারে দেখুন" title="সাধারণ PDF রিডারে দেখুন"><i class="fa-solid fa-file-pdf" aria-hidden="true"></i></button>
      <div class="reader" data-book-native hidden><iframe title="${esc(book.title)}" loading="lazy"></iframe></div>
      <p class="reader__hint"><i class="fa-solid fa-circle-info" aria-hidden="true"></i> PDF খুলতে সমস্যা হলে উপরের “${T.openNew}” বোতামটি ব্যবহার করুন।</p>
    </section>
    <section class="band section"><div class="container">
      <div class="section-head"><h2 class="section-title">${T.pdfBooks}</h2></div>
      <div class="grid grid--books">${others.map(pdfCard).join('')}</div>
    </div></section>`,
    mount(root) {
      let dispose: (() => void) | undefined;
      let cancelled = false;
      const fallback = root.querySelector<HTMLButtonElement>('[data-book-fallback]')!;
      const native = root.querySelector<HTMLElement>('[data-book-native]')!;
      fallback.addEventListener('click', () => {
        native.hidden = !native.hidden;
        if (!native.hidden) {
          const iframe = native.querySelector<HTMLIFrameElement>('iframe')!;
          if (!iframe.getAttribute('src')) iframe.src = `${book.file}#view=FitH`;
        }
        const label = native.hidden ? 'সাধারণ PDF রিডারে দেখুন' : 'সাধারণ রিডার বন্ধ করুন';
        fallback.setAttribute('aria-label', label); fallback.title = label;
        fallback.setAttribute('aria-expanded', String(!native.hidden));
      });
      void import('./pdf-viewer').then(({ mountPdfViewer }) => {
        if (!cancelled) {
          const status = root.querySelector<HTMLElement>('[data-pdf-status]')!;
          dispose = mountPdfViewer(root.querySelector<HTMLElement>('[data-pdf-book]')!, book.file);
          status.hidden = true;
        }
      }).catch(() => {
        const status = root.querySelector<HTMLElement>('[data-pdf-status]');
        if (status && !cancelled) { status.hidden = false; status.textContent = 'বই লোড করা যায়নি। সাধারণ PDF রিডার বা উপরের বোতাম ব্যবহার করুন।'; }
      });
      return () => { cancelled = true; dispose?.(); };
    },
  };
}
