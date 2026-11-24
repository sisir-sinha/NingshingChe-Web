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
    html: `
    ${pageHead(
      'PDF',
      'fa-solid fa-book-open',
      book.title,
      `${T.published}: ${book.published}`,
      `<div class="pill-row">
        <a class="btn btn--primary" href="${esc(book.file)}" target="_blank" rel="noopener"><i class="fa-solid fa-up-right-from-square" aria-hidden="true"></i> ${T.openNew}</a>
        <a class="btn btn--ghost" href="${esc(book.file)}" download target="_blank" rel="noopener"><i class="fa-solid fa-download" aria-hidden="true"></i> ${T.download}</a>
      </div>`,
    )}
    <section class="container section">
      <div class="flip-reader" data-flip-reader role="region" aria-label="${esc(book.title)} বইয়ের পাঠক">
        <div class="flip-reader__toolbar">
          <button type="button" class="btn btn--ghost" data-book-prev disabled><i class="fa-solid fa-chevron-left" aria-hidden="true"></i> আগের পৃষ্ঠা</button>
          <form class="flip-reader__jump" data-book-jump><label for="book-page">পৃষ্ঠা</label><input id="book-page" type="number" min="1" value="1" inputmode="numeric" disabled><span data-book-total></span><button type="submit" class="btn btn--ghost" disabled>যান</button></form>
          <button type="button" class="btn btn--ghost" data-book-next disabled>পরের পৃষ্ঠা <i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button>
        </div>
        <p class="flip-reader__status" data-book-status role="status" aria-live="polite">বই লোড হচ্ছে…</p>
        <div class="flip-reader__stage" data-book-stage><div class="flip-reader__book" data-book></div></div>
        <p class="flip-reader__help">পাতার কোণ টেনে বা আগের–পরের বোতাম দিয়ে পাতা উল্টান। মোবাইলে সোয়াইপ করুন।</p>
        <button type="button" class="flip-reader__fallback" data-book-fallback>সাধারণ PDF রিডারে দেখুন</button>
        <div class="reader" data-book-native hidden><iframe title="${esc(book.title)}" loading="lazy" data-pdf-url="${esc(book.file)}"></iframe></div>
      </div>
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
        fallback.textContent = native.hidden ? 'সাধারণ PDF রিডারে দেখুন' : 'সাধারণ রিডার বন্ধ করুন';
      });
      void import('./flipbook').then(({ mountFlipBook }) => {
        if (!cancelled) dispose = mountFlipBook(root, book.file);
      }).catch(() => {
        const status = root.querySelector<HTMLElement>('[data-book-status]');
        if (status && !cancelled) status.textContent = 'বই লোড করা যায়নি। সাধারণ PDF রিডার বা উপরের বোতাম ব্যবহার করুন।';
      });
      return () => { cancelled = true; dispose?.(); };
    },
  };
}
