import * as pdfjs from 'pdfjs-dist';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PageFlip } from '../vendor/page-flip.js';
import { bn } from '../utils';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

/** Render only the current spread and its neighbours, keeping large books usable on phones. */
export function mountFlipBook(root: HTMLElement, url: string): () => void {
  const $ = <E extends HTMLElement>(s: string) => root.querySelector<E>(s)!;
  const bookEl = $<HTMLElement>('[data-book]');
  const stage = $<HTMLElement>('[data-book-stage]');
  const status = $<HTMLElement>('[data-book-status]');
  const previous = $<HTMLButtonElement>('[data-book-prev]');
  const next = $<HTMLButtonElement>('[data-book-next]');
  const input = $<HTMLInputElement>('#book-page');
  const jump = $<HTMLFormElement>('[data-book-jump]');
  const go = jump.querySelector<HTMLButtonElement>('button')!;
  const loading = pdfjs.getDocument({ url });
  let pdf: PDFDocumentProxy | undefined;
  let flip: PageFlip | undefined;
  let closed = false;
  let pages: HTMLElement[] = [];
  const tasks = new Map<number, RenderTask>();
  const rendering = new Set<number>();
  const rendered = new Set<number>();
  const failed = new Set<number>();
  let currentPage = 0;
  let wanted = new Set<number>();

  function renderWindow(current: number): void {
    if (!pdf || closed) return;
    // Retain enough adjacent pages for page-flip's landscape spread and a turn in either direction.
    currentPage = current;
    wanted = new Set(Array.from({ length: 9 }, (_, i) => current + i - 4).filter((i) => i >= 0 && i < pages.length));
    for (const [i, task] of tasks) if (!wanted.has(i)) task.cancel();
    for (const i of rendered) if (!wanted.has(i)) {
      pages[i].querySelector('img')?.removeAttribute('src'); rendered.delete(i);
    }
    pump();
  }
  function pump(): void {
    const pending = [...wanted].filter((i) => !rendered.has(i) && !rendering.has(i) && !failed.has(i)).sort((a, b) => Math.abs(a - currentPage) - Math.abs(b - currentPage));
    while (!closed && rendering.size < 2 && pending.length) void renderPage(pending.shift()!);
  }
  async function renderPage(i: number): Promise<void> {
    if (!pdf || closed) return;
    rendering.add(i);
    try {
      const page = await pdf.getPage(i + 1);
      if (closed || !wanted.has(i)) return;
      const natural = page.getViewport({ scale: 1 });
      const scale = Math.min(2, 1100 / natural.width);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas unavailable');
      const task = page.render({ canvasContext: context, viewport });
      tasks.set(i, task);
      await task.promise;
      if (!closed && wanted.has(i)) {
        const image = pages[i].querySelector<HTMLImageElement>('img')!;
        image.src = canvas.toDataURL('image/jpeg', 0.9);
        rendered.add(i);
      }
      canvas.width = 0; canvas.height = 0;
    } catch (err) {
      if (!closed && (err as Error).name !== 'RenderingCancelledException') {
        failed.add(i);
        console.warn('Could not render PDF page', i + 1, err);
      }
    } finally {
      tasks.delete(i); rendering.delete(i);
      if (!closed) pump();
    }
  }
  function update(pageIndex: number): void {
    if (!pdf || closed) return;
    const i = Math.max(0, Math.min(pdf.numPages - 1, pageIndex));
    input.value = String(i + 1);
    previous.disabled = i === 0;
    next.disabled = i >= pdf.numPages - 1;
    status.textContent = `পৃষ্ঠা ${bn(i + 1)} / ${bn(pdf.numPages)}`;
    renderWindow(i);
  }
  previous.addEventListener('click', () => flip?.flipPrev());
  next.addEventListener('click', () => flip?.flipNext());
  jump.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!pdf || !flip) return;
    const number = Math.max(1, Math.min(pdf.numPages, Number(input.value) || 1));
    flip.turnToPage(number - 1);
    update(flip.getCurrentPageIndex());
  });
  loading.onProgress = ({ loaded, total }: { loaded: number; total: number }) => {
    if (!closed && total > 0) status.textContent = `বই লোড হচ্ছে… ${bn(Math.min(100, Math.round(loaded / total * 100)))}%`;
  };
  void (async () => {
    try {
      pdf = await loading.promise;
      if (closed) return;
      const first = await pdf.getPage(1);
      if (closed) return;
      const viewport = first.getViewport({ scale: 1 });
      const height = Math.round(480 * viewport.height / viewport.width);
      pages = Array.from({ length: pdf.numPages }, (_, i) => {
        const page = document.createElement('div');
        page.className = 'flip-page';
        if (i === 0 || i === pdf!.numPages - 1) page.dataset.density = 'hard';
        const image = document.createElement('img');
        image.alt = `পৃষ্ঠা ${bn(i + 1)}`;
        image.draggable = false;
        page.append(image);
        return page;
      });
      flip = new PageFlip(bookEl, {
        width: 480, height, size: 'stretch', minWidth: 160, maxWidth: 540,
        minHeight: Math.round(height / 3), maxHeight: Math.round(height * 1.125),
        showCover: true, usePortrait: true, maxShadowOpacity: 0.35,
        mobileScrollSupport: false, flippingTime: matchMedia('(prefers-reduced-motion: reduce)').matches ? 50 : 700,
        showPageCorners: true,
      });
      flip.on('flip', (e) => update(Number(e.data)));
      flip.loadFromHTML(pages);
      input.max = String(pdf.numPages); input.disabled = false; go.disabled = false;
      $('[data-book-total]').textContent = `/ ${bn(pdf.numPages)}`;
      stage.classList.add('is-ready');
      update(0);
    } catch (error) {
      if (!closed) {
        console.warn('PDF reader unavailable', error);
        status.textContent = '৩ডি রিডারে বই লোড করা যায়নি। সাধারণ PDF রিডার বা উপরের বোতাম ব্যবহার করুন।';
        stage.hidden = true;
      }
    }
  })();
  return () => {
    closed = true;
    for (const task of tasks.values()) task.cancel();
    flip?.destroy();
    void loading.destroy().catch(() => undefined);
  };
}
