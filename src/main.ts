import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/pages.css';

import { renderFooter } from './components/footer';
import { renderHeader, syncHeader } from './components/header';
import { initLogoutButtons, loginPage, profilePage, registerPage } from './pages/account';
import { articlePage } from './pages/article';
import { authorPage, authorsPage } from './pages/authors';
import { homePage } from './pages/home';
import { categoryPage, featuredPage, recentPage, searchPage, tagPage } from './pages/listing';
import { pdfListPage, pdfPage } from './pages/pdf';
import { aboutPage, errorPage, loadingHtml, notFoundPage, socialPage, submitPage } from './pages/static';
import { route, setNotFound, startRouter } from './router';
import { T } from './strings';
import { toast } from './utils';

renderHeader(document.getElementById('site-header')!);
renderFooter(document.getElementById('site-footer')!);

/* Routes — matched against the decoded pathname, first match wins. */
route(/^\/$/, homePage);
route(/^\/recent$/, recentPage);
route(/^\/(?:featured|ফিচার্ড)$/, featuredPage);
route(/^\/category\/(.+)$/, categoryPage);
route(/^\/tag\/(.+)$/, tagPage);
route(/^\/author\/(.+)$/, authorPage);
route(/^\/lekhok$/, authorsPage);
route(/^\/pdf$/, pdfListPage);
route(/^\/read_pdf\/(\d+)$/, pdfPage);
route(/^\/search$/, searchPage);
route(/^\/about-us$/, aboutPage);
route(/^\/social-activities$/, socialPage);
route(/^\/blog_submission$/, submitPage);
route(/^\/login$/, loginPage);
route(/^\/register$/, registerPage);
route(/^\/profile$/, profilePage);
route(/^\/\d{4}\/\d{2}\/.+$/, articlePage); // /2025/06/slug.kehem
setNotFound(notFoundPage);

initLogoutButtons();

/* "Copy link" buttons anywhere on the site */
document.addEventListener('click', async (e) => {
  const btn = (e.target as Element).closest<HTMLElement>('[data-copy]');
  if (!btn) return;
  try {
    await navigator.clipboard.writeText(btn.dataset.copy ?? location.href);
    toast(T.copied);
  } catch {
    window.prompt(T.copyLink, btn.dataset.copy ?? location.href);
  }
});

startRouter(document.getElementById('main')!, {
  loading: loadingHtml,
  error: errorPage,
  afterRender: syncHeader,
});
