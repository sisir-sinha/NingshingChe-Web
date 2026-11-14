import { SITE, T } from '../strings';
import { bn } from '../utils';

export function renderFooter(el: HTMLElement): void {
  el.innerHTML = `
  <div class="phee phee--footer" aria-hidden="true"></div>
  <div class="container footer__grid">
    <div class="footer__about">
      <a class="brand brand--footer" href="/">
        <img class="brand__logo" src="${SITE.logo}" alt="" width="56" height="56" loading="lazy">
        <span class="brand__text">
          <span class="brand__name">${SITE.name}</span>
          <span class="brand__tag">${SITE.tagline}</span>
        </span>
      </a>
      <p>${SITE.description}</p>
      <ul class="footer__contact">
        <li><i class="fa-solid fa-location-dot" aria-hidden="true"></i><a href="${SITE.map}" target="_blank" rel="noopener">${SITE.address}</a></li>
        <li><i class="fa-solid fa-phone" aria-hidden="true"></i><a href="tel:${SITE.phone.replace(/[^+\d]/g, '')}" data-external>${SITE.phone}</a></li>
        <li><i class="fa-solid fa-envelope" aria-hidden="true"></i><a href="mailto:${SITE.email}" data-external>${SITE.email}</a></li>
      </ul>
    </div>
    <nav aria-label="${T.quickLinks}">
      <h2 class="footer__title">${T.quickLinks}</h2>
      <ul class="footer__links">
        <li><a href="/about-us">${T.about}</a></li>
        <li><a href="/blog_submission">${T.submitArticle}</a></li>
        <li><a href="/lekhok">${T.authors}</a></li>
        <li><a href="/featured">${T.featured}</a></li>
        <li><a href="/pdf">${T.pdfBooks}</a></li>
      </ul>
    </nav>
    <div>
      <h2 class="footer__title">${T.followUs}</h2>
      <div class="footer__social">
        <a class="icon-btn" href="${SITE.facebook}" target="_blank" rel="noopener" aria-label="Facebook"><i class="fa-brands fa-facebook-f" aria-hidden="true"></i></a>
        <a class="icon-btn" href="${SITE.whatsapp}" target="_blank" rel="noopener" aria-label="WhatsApp"><i class="fa-brands fa-whatsapp" aria-hidden="true"></i></a>
        <a class="icon-btn" href="${SITE.youtube}" target="_blank" rel="noopener" aria-label="YouTube"><i class="fa-brands fa-youtube" aria-hidden="true"></i></a>
      </div>
      <p class="footer__app">${T.appCta}:</p>
      <a class="btn btn--store" href="${SITE.playStore}" target="_blank" rel="noopener"><i class="fa-brands fa-google-play" aria-hidden="true"></i> Play Store</a>
    </div>
  </div>
  <div class="footer__bar">
    <div class="container">© ${bn(new Date().getFullYear())} ${SITE.name} | সাইট উন্নয়ন <a href="${SITE.developer.href}" target="_blank" rel="noopener">${SITE.developer.name}</a></div>
  </div>`;
}
