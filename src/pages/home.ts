import { getAuthors, getCategories, getPosts, getSite, pick } from '../api';
import { authorCard, chip, media, pagination, paginate, postCard, sectionHead } from '../components/cards';
import { categoryWidget, postsWidget, widget } from '../components/sidebar';
import { destroyAll, slider } from '../sliders';
import { SITE, T } from '../strings';
import type { Author, PdfBook, Post, RouteContext, View } from '../types';
import { B, bn, categoryUrl, esc, href, img } from '../utils';

const PER_PAGE = 10;

function heroSlide(post: Post, first: boolean): string {
  const url = href(post.path);
  return `<div class="swiper-slide hero-slide">
    ${media(post.image, post.title, 1200, first)}
    <div class="hero-slide__body">
      ${chip(post.category)}
      <h2 class="hero-slide__title"><a href="${url}">${esc(post.title)}</a></h2>
      <p class="hero-slide__excerpt">${esc(post.excerpt)}</p>
      <div class="hero-slide__foot">
        <a class="btn btn--primary" href="${url}">${T.read} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>
        <span class="hero-slide__by">${esc(post.author)} · ${esc(post.date)}</span>
      </div>
    </div>
  </div>`;
}

export function videoSlide(id: string): string {
  return `<div class="swiper-slide">
    <button type="button" class="video" data-video="${esc(id)}" aria-label="${T.video}">
      <img src="https://i.ytimg.com/vi/${esc(id)}/hqdefault.jpg" alt="" loading="lazy">
      <span class="video__play"><i class="fa-solid fa-play" aria-hidden="true"></i></span>
    </button>
  </div>`;
}

export function pdfCard(book: PdfBook): string {
  return `<article class="book">
    <a class="book__cover" href="${B}/read_pdf/${book.id}" tabindex="-1" aria-hidden="true">${media(book.cover, '', 420)}</a>
    <h3 class="book__title"><a href="${B}/read_pdf/${book.id}">${esc(book.title)}</a></h3>
    <p class="book__date">${T.published}: ${esc(book.published)}</p>
    <a class="btn btn--ghost btn--sm" href="${B}/read_pdf/${book.id}"><i class="fa-solid fa-book-open" aria-hidden="true"></i> ${T.readPdf}</a>
  </article>`;
}

function authorSlides(authors: Author[]): string {
  return authors.map((a) => `<div class="swiper-slide">${authorCard(a)}</div>`).join('');
}

/** Click-to-load YouTube: no third-party iframe until the visitor asks for it. */
export function bindVideos(root: HTMLElement): void {
  root.querySelectorAll<HTMLButtonElement>('[data-video]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const frame = document.createElement('iframe');
      frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(btn.dataset.video ?? '')}?autoplay=1&rel=0`;
      frame.title = T.video;
      frame.allow = 'accelerometer; autoplay; encrypted-media; picture-in-picture';
      frame.allowFullscreen = true;
      frame.className = 'video video--frame';
      btn.replaceWith(frame);
    });
  });
}

export async function homePage(ctx: RouteContext): Promise<View> {
  const [posts, site, categories, authors] = await Promise.all([getPosts(), getSite(), getCategories(), getAuthors()]);

  const hero = pick(posts, site.hero);
  const heroSet = new Set(hero.map((p) => p.path));
  const latest = posts.filter((p) => !heroSet.has(p.path)).slice(0, 4);
  const featured = posts.filter((p) => p.featured);
  const { items, page, pages } = paginate(posts, ctx.query, PER_PAGE);

  const html = `
  <h1 class="sr-only">${SITE.name} — ${SITE.tagline}</h1>

  <section class="container hero" aria-label="${T.special}">
    <div class="hero__main">
      <div class="swiper hero__slider" data-slider="hero">
        <div class="swiper-wrapper">${hero.map((p, i) => heroSlide(p, i === 0)).join('')}</div>
        <div class="hero__controls">
          <button type="button" class="icon-btn icon-btn--glass" data-prev="hero" aria-label="${T.prev}"><i class="fa-solid fa-chevron-left" aria-hidden="true"></i></button>
          <div class="hero__dots" data-dots="hero"></div>
          <button type="button" class="icon-btn icon-btn--glass" data-next="hero" aria-label="${T.next}"><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button>
        </div>
      </div>
    </div>
    <aside class="hero__side">
      <h2 class="eyebrow"><span>${T.newPosts}</span><a href="${B}/recent">${T.seeAll} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a></h2>
      <ol class="headline-list">
        ${latest
          .map(
            (p, i) => `<li>
              <span class="headline-list__num" aria-hidden="true">${bn(i + 1)}</span>
              <div>
                <a class="headline-list__cat" href="${categoryUrl(p.category)}">${esc(p.category)}</a>
                <a class="headline-list__title" href="${href(p.path)}">${esc(p.title)}</a>
                <span class="headline-list__meta">${esc(p.author)} · ${esc(p.date)}</span>
              </div>
            </li>`,
          )
          .join('')}
      </ol>
    </aside>
  </section>

  <section class="container topics" aria-label="${T.categories}">
    <div class="topics__scroll">
      ${categories.map((c) => `<a class="topic" href="${categoryUrl(c.name)}">${esc(c.name)} <span>${bn(c.count)}</span></a>`).join('')}
    </div>
  </section>

  <section class="container section" aria-labelledby="featured-title">
    ${sectionHead(T.featuredArticles, { id: 'featured-title', nav: 'featured', more: { href: `${B}/featured`, label: T.seeAll } })}
    <div class="swiper" data-slider="featured">
      <div class="swiper-wrapper">${featured.map((p) => `<div class="swiper-slide">${postCard(p)}</div>`).join('')}</div>
    </div>
  </section>

  <div class="container layout section" data-scroll-anchor>
    <section aria-labelledby="selected-title">
      ${sectionHead(T.selectedArticles, { id: 'selected-title' })}
      <div class="grid grid--posts">${items.map((p) => postCard(p)).join('')}</div>
      ${pagination(page, pages, ctx.query)}
    </section>
    <aside class="sidebar">
      ${categoryWidget(categories)}
      ${postsWidget(T.special, pick(posts, site.special))}
      ${postsWidget(T.literature, pick(posts, site.literature))}
      ${widget(
        T.video,
        `<div class="swiper" data-slider="videos"><div class="swiper-wrapper">${site.videos.map(videoSlide).join('')}</div></div>
         <div class="slider-nav slider-nav--center">
           <button type="button" class="icon-btn" data-prev="videos" aria-label="${T.prev}"><i class="fa-solid fa-chevron-left" aria-hidden="true"></i></button>
           <a class="link-more" href="${SITE.youtube}" target="_blank" rel="noopener"><i class="fa-brands fa-youtube" aria-hidden="true"></i> YouTube</a>
           <button type="button" class="icon-btn" data-next="videos" aria-label="${T.next}"><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button>
         </div>`,
      )}
      ${widget(T.ad, `<a class="ad" href="${esc(site.ad.href)}" target="_blank" rel="noopener sponsored"><img src="${esc(site.ad.image)}" alt="${T.ad}" loading="lazy"></a>`, 'widget--ad')}
    </aside>
  </div>

  <section class="band section" aria-labelledby="authors-title">
    <div class="container">
      ${sectionHead(T.ourAuthors, { id: 'authors-title', nav: 'authors', more: { href: `${B}/lekhok`, label: T.seeAll } })}
      <div class="swiper" data-slider="authors"><div class="swiper-wrapper">${authorSlides(authors)}</div></div>
    </div>
  </section>

  <section class="container section" aria-labelledby="pdf-title">
    ${sectionHead(T.pdfBooks, { id: 'pdf-title', nav: 'pdfs', more: { href: `${B}/pdf`, label: T.seeAll } })}
    <div class="swiper" data-slider="pdfs">
      <div class="swiper-wrapper">${site.pdfs.map((b) => `<div class="swiper-slide">${pdfCard(b)}</div>`).join('')}</div>
    </div>
  </section>

  <section class="container section">
    <div class="app-cta">
      <div>
        <h2>${T.appCta}</h2>
        <p>${SITE.description}</p>
      </div>
      <a class="btn btn--store" href="${SITE.playStore}" target="_blank" rel="noopener"><i class="fa-brands fa-google-play" aria-hidden="true"></i> Play Store</a>
    </div>
  </section>`;

  return {
    title: `${SITE.name} - ${SITE.tagline}`,
    description: SITE.description,
    html,
    mount(root) {
      const sliders = [
        slider(root, 'hero', {
          effect: 'fade',
          fadeEffect: { crossFade: true },
          loop: hero.length > 1,
          autoplay: { delay: 6000, pauseOnMouseEnter: true, disableOnInteraction: false },
          pagination: { el: root.querySelector<HTMLElement>('[data-dots="hero"]'), clickable: true },
        }),
        slider(root, 'featured', {
          slidesPerView: 1.12,
          spaceBetween: 16,
          breakpoints: { 600: { slidesPerView: 2, spaceBetween: 20 }, 1000: { slidesPerView: 3, spaceBetween: 24 } },
        }),
        slider(root, 'videos', { slidesPerView: 1, spaceBetween: 12 }),
        slider(root, 'authors', {
          slidesPerView: 1.6,
          spaceBetween: 14,
          breakpoints: { 520: { slidesPerView: 2.5 }, 800: { slidesPerView: 4, spaceBetween: 20 }, 1100: { slidesPerView: 5, spaceBetween: 20 } },
        }),
        slider(root, 'pdfs', {
          slidesPerView: 1.7,
          spaceBetween: 16,
          breakpoints: { 520: { slidesPerView: 2.6 }, 800: { slidesPerView: 4, spaceBetween: 24 }, 1100: { slidesPerView: 5, spaceBetween: 28 } },
        }),
      ];
      bindVideos(root);
      // Warm the image cache for the next hero slide.
      hero.slice(1).forEach((p) => {
        const pre = new Image();
        pre.src = img(p.image, 1200);
      });
      return () => destroyAll(sliders);
    },
  };
}
