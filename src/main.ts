import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/pages.css';

import { initImageSkeletons, skeletonFor } from './components/skeletons';
import { renderFooter } from './components/footer';
import { renderHeader, syncHeader } from './components/header';
import { initLogoutButtons, loginPage, profilePage, registerPage } from './pages/account';
import { articlePage } from './pages/article';
import { authorPage, authorsPage } from './pages/authors';
import { forumPage, topicPage } from './pages/forum';
import { homePage } from './pages/home';
import { categoryPage, featuredPage, recentPage, searchPage, tagPage } from './pages/listing';
import { musicPage } from './pages/music';
import { pdfListPage, pdfPage } from './pages/pdf';
import { aboutPage, contactPage, errorPage, notFoundPage, socialPage, submitPage } from './pages/static';
import { deleteAccountPage, privacyPage } from './pages/privacy';
import { initAuth, takeNext } from './auth';
import { initMiniPlayer } from './player';
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
route(/^\/read_pdf\/([\w-]+)$/, pdfPage);
route(/^\/search$/, searchPage);
route(/^\/about-us$/, aboutPage);
route(/^\/contact$/, contactPage);
route(/^\/social-activities$/, socialPage);
route(/^\/blog_submission$/, submitPage);
route(/^\/forum$/, forumPage);
route(/^\/forum\/([\w-]+)$/, topicPage);
route(/^\/music$/, musicPage);
route(/^\/privacy-policy$/, privacyPage);
route(/^\/delete-account$/, deleteAccountPage);
route(/^\/login$/, loginPage);
route(/^\/register$/, registerPage);
route(/^\/profile$/, profilePage);
route(/^\/\d{4}\/\d{2}\/.+$/, articlePage); // /2025/06/slug.kehem
setNotFound(notFoundPage);

initImageSkeletons();
initLogoutButtons();
initMiniPlayer();

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

// Restore the reader's session first so the first page already knows who is signed in.
void initAuth().then(() => {
  // Back from Google sign-in: open the page the reader was heading to.
  const next = takeNext();
  if (next && next !== location.pathname) history.replaceState(null, '', next);
  startRouter(document.getElementById('main')!, {
    loading: skeletonFor,
    error: errorPage,
    afterRender: syncHeader,
  });
});
