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
      <div class="reader">
        <iframe src="${esc(book.file)}#view=FitH" title="${esc(book.title)}" loading="lazy"></iframe>
      </div>
      <p class="reader__hint"><i class="fa-solid fa-circle-info" aria-hidden="true"></i> মোবাইলে PDF না খুললে উপরের “${T.openNew}” বোতামটি ব্যবহার করুন।</p>
    </section>
    <section class="band section"><div class="container">
      <div class="section-head"><h2 class="section-title">${T.pdfBooks}</h2></div>
      <div class="grid grid--books">${others.map(pdfCard).join('')}</div>
    </div></section>`,
  };
}
