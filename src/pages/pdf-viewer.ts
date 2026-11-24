/** Integrates the packaged pdflip reader; PDF rendering and page turns are provided by the library. */
import { Flipbook } from '@wapplersystems/pdflip';
import '@wapplersystems/pdflip/pdflip.css';
import * as pdfjs from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

export function mountPdfViewer(element: HTMLElement, url: string): () => void {
  const reader = new Flipbook(element, {
    source: url,
    pdfjs: { lib: pdfjs, workerSrc, cMapUrl: `${import.meta.env.BASE_URL}pdfjs/cmaps/`, standardFontDataUrl: `${import.meta.env.BASE_URL}pdfjs/standard_fonts/`, wasmUrl: `${import.meta.env.BASE_URL}pdfjs/wasm/` },
    flipStyle: 'cover',
    pageMode: 'auto',
    deepLink: false,
    lazy: false,
    controls: ['first', 'prev', 'pageNumber', 'next', 'last', 'zoomOut', 'zoomIn', 'thumbnails', 'search', 'pageMode', 'download', 'fullscreen'],
    labels: {
      book: 'পিডিএফ বই', first: 'প্রথম পৃষ্ঠা', prev: 'আগের পৃষ্ঠা', next: 'পরের পৃষ্ঠা', last: 'শেষ পৃষ্ঠা',
      pageOf: 'এর মধ্যে', goToPage: 'পৃষ্ঠা নম্বর', zoomIn: 'বড় করুন', zoomOut: 'ছোট করুন',
      thumbnails: 'পৃষ্ঠা তালিকা', search: 'খুঁজুন', searchPlaceholder: 'খুঁজুন…', searchNoResults: 'কিছু পাওয়া যায়নি',
      singlePage: 'এক পৃষ্ঠা', doublePage: 'দুই পৃষ্ঠা', download: 'ডাউনলোড', fullscreen: 'পূর্ণ পর্দা',
      exitFullscreen: 'পূর্ণ পর্দা বন্ধ করুন', loading: 'বই লোড হচ্ছে…', error: 'বই লোড করা যায়নি।', page: 'পৃষ্ঠা',
    },
  });
  // The package renders its own loading and error states; keep failures from becoming unhandled rejections.
  void reader.ready.catch(() => undefined);
  return () => reader.destroy();
}
