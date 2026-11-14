import { BackendMissingError, getAuthor, getCategories, getPostByPath, getPosts, submitComment } from '../api';
import { chip, media, postCard, shareButtons } from '../components/cards';
import { categoryWidget, postsWidget } from '../components/sidebar';
import { SITE, T } from '../strings';
import type { RouteContext, View } from '../types';
import { authorUrl, bn, esc, href, img, tagUrl, toast } from '../utils';
import { notFoundPage } from './static';

const SIZES = ['s', 'm', 'l'] as const;

export async function articlePage(ctx: RouteContext): Promise<View> {
  const post = await getPostByPath(ctx.path);
  if (!post) return notFoundPage();

  const [posts, categories, author] = await Promise.all([getPosts(), getCategories(), getAuthor(post.author)]);
  const index = posts.findIndex((p) => p.id === post.id);
  const newer = posts[index - 1];
  const older = posts[index + 1];
  const related = posts.filter((p) => p.category === post.category && p.id !== post.id).slice(0, 3);
  const latest = posts.filter((p) => p.id !== post.id).slice(0, 5);
  const popular = posts.filter((p) => p.featured && p.id !== post.id).slice(0, 5);
  const url = location.origin + href(post.path);

  const html = `
  <article class="article">
    <header class="article__head container container--narrow">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="/">${T.home}</a><i class="fa-solid fa-chevron-right" aria-hidden="true"></i><a href="${href(`/category/${post.category}`)}">${esc(post.category)}</a></nav>
      ${chip(post.category)}
      <h1 class="article__title">${esc(post.title)}</h1>
      <div class="article__meta">
        <a class="byline" href="${authorUrl(post.author)}">
          <span class="byline__avatar">${media(author?.image ?? '', '', 120)}</span>
          <span><strong>${esc(post.author)}</strong><small>${esc(author?.role ?? '')}</small></span>
        </a>
        <ul class="article__facts">
          <li><i class="fa-regular fa-calendar" aria-hidden="true"></i> ${T.published}: ${esc(post.date)}</li>
          <li><i class="fa-regular fa-clock" aria-hidden="true"></i> ${bn(post.minutes)} ${T.minutes}</li>
        </ul>
      </div>
      <div class="article__tools">
        ${shareButtons(url, post.title)}
        <div class="tools__right">
          <div class="font-size" role="group" aria-label="${T.fontSize}">
            ${SIZES.map((s) => `<button type="button" data-size="${s}" aria-pressed="false" aria-label="${T.fontSize} ${s.toUpperCase()}"><span class="fs-${s}">অ</span></button>`).join('')}
          </div>
          <button type="button" class="icon-btn" data-print aria-label="${T.print}" title="${T.print}"><i class="fa-solid fa-print" aria-hidden="true"></i></button>
        </div>
      </div>
    </header>

    ${post.image ? `<figure class="article__cover container">${media(post.image, post.title, 1400, true)}</figure>` : ''}

    <div class="container layout layout--article">
      <div class="article__main">
        <div class="prose" data-prose>${post.content}</div>

        ${
          post.tags.length
            ? `<div class="tags"><span><i class="fa-solid fa-tags" aria-hidden="true"></i> ${T.tags}:</span>${post.tags.map((t) => `<a class="tag" href="${tagUrl(t)}">${esc(t)}</a>`).join('')}</div>`
            : ''
        }

        <div class="share-bar"><strong>${T.share}:</strong>${shareButtons(url, post.title)}</div>

        ${
          author
            ? `<aside class="author-box">
                <a class="author-box__avatar" href="${authorUrl(author.name)}" tabindex="-1" aria-hidden="true">${media(author.image, '', 240)}</a>
                <div>
                  <p class="author-box__label">${T.writer}</p>
                  <h2 class="author-box__name"><a href="${authorUrl(author.name)}">${esc(author.name)}</a></h2>
                  <p class="author-box__role">${esc(author.role)}</p>
                  ${author.bio ? `<p class="author-box__bio">${esc(author.bio)}</p>` : ''}
                  <a class="link-more" href="${authorUrl(author.name)}">${T.authorPosts} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>
                </div>
              </aside>`
            : ''
        }

        <nav class="post-nav" aria-label="${T.prev} / ${T.next}">
          ${older ? `<a class="post-nav__item" href="${href(older.path)}" rel="prev"><small><i class="fa-solid fa-arrow-left" aria-hidden="true"></i> ${T.prev}</small><strong>${esc(older.title)}</strong></a>` : '<span></span>'}
          ${newer ? `<a class="post-nav__item post-nav__item--next" href="${href(newer.path)}" rel="next"><small>${T.next} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></small><strong>${esc(newer.title)}</strong></a>` : '<span></span>'}
        </nav>

        <section class="comments" aria-labelledby="comments-title">
          <h2 class="section-title" id="comments-title">${T.allComments}</h2>
          <p class="comments__empty">${T.noComments}</p>
          <h3 class="comments__form-title">${T.addComment}</h3>
          <form class="form" data-comment-form novalidate>
            <div class="form__row">
              <label class="field"><span>নাঙহান <b>*</b></span><input name="name" type="text" required autocomplete="name" placeholder="নিজর নাঙহান লিখিক"></label>
              <label class="field"><span>ঠিকানাহান <b>*</b></span><input name="address" type="text" required autocomplete="address-level2" placeholder="ঠিকানাহান লিখিক"></label>
            </div>
            <div class="form__row">
              <label class="field"><span>ইমেইল <b>*</b></span><input name="email" type="email" required autocomplete="email" placeholder="নিজর ইমেইলগো বহিক"></label>
              <label class="field"><span>ফোন নম্বর <b>*</b></span><input name="phone" type="tel" required autocomplete="tel" placeholder="নিজর ফোন নম্বরগো বহিক"></label>
            </div>
            <label class="field"><span>মন্তব্য <b>*</b></span><textarea name="comment" rows="5" required placeholder="মন্তব্যহান লেখিক ..."></textarea></label>
            <p class="form__note" data-form-note hidden></p>
            <button class="btn btn--primary" type="submit"><i class="fa-solid fa-paper-plane" aria-hidden="true"></i> ${T.addComment}</button>
          </form>
        </section>
      </div>

      <aside class="sidebar sidebar--sticky">
        ${postsWidget(T.newPosts, latest)}
        ${popular.length ? postsWidget(T.popular, popular, true) : ''}
        ${categoryWidget(categories, post.category)}
      </aside>
    </div>

    ${
      related.length
        ? `<section class="band section"><div class="container">
            <div class="section-head"><h2 class="section-title">${T.related}</h2></div>
            <div class="grid grid--3">${related.map((p) => postCard(p, { excerpt: false })).join('')}</div>
          </div></section>`
        : ''
    }
  </article>`;

  return {
    title: `${post.title} | ${SITE.name}`,
    description: post.excerpt,
    html,
    mount(root) {
      const prose = root.querySelector<HTMLElement>('[data-prose]')!;

      // Wide tables scroll inside their own box instead of breaking the page.
      prose.querySelectorAll('table').forEach((table) => {
        const wrap = document.createElement('div');
        wrap.className = 'table-wrap';
        wrap.tabIndex = 0;
        table.replaceWith(wrap);
        wrap.appendChild(table);
      });
      // Serve right-sized inline images.
      prose.querySelectorAll('img').forEach((image) => {
        image.decoding = 'async';
        const src = image.getAttribute('src') ?? '';
        const sized = img(src, 1000);
        if (sized !== src) image.src = sized;
      });

      // Reading progress
      const bar = document.getElementById('progress')!;
      let ticking = false;
      const paint = () => {
        ticking = false;
        const rect = prose.getBoundingClientRect();
        const total = rect.height - window.innerHeight * 0.6;
        const done = Math.min(1, Math.max(0, -rect.top / Math.max(1, total)));
        bar.style.transform = `scaleX(${done})`;
      };
      const onScroll = () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(paint);
        }
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      paint();

      // Text size (remembered)
      const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-size]')];
      const setSize = (size: string) => {
        prose.dataset.size = size;
        buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.size === size)));
        try {
          localStorage.setItem('nc-font', size);
        } catch {
          /* ignore */
        }
      };
      let saved = 'm';
      try {
        saved = localStorage.getItem('nc-font') ?? 'm';
      } catch {
        /* ignore */
      }
      setSize(saved);
      buttons.forEach((b) => b.addEventListener('click', () => setSize(b.dataset.size ?? 'm')));

      root.querySelector('[data-print]')?.addEventListener('click', () => window.print());

      // Comment form
      const form = root.querySelector<HTMLFormElement>('[data-comment-form]')!;
      const note = form.querySelector<HTMLElement>('[data-form-note]')!;
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!form.checkValidity()) {
          form.classList.add('was-validated');
          form.querySelector<HTMLElement>(':invalid')?.focus();
          return;
        }
        try {
          await submitComment(post.path, new FormData(form));
          form.reset();
          form.classList.remove('was-validated');
          toast('মন্তব্য পাঠানো হয়েছে');
        } catch (err) {
          note.hidden = false;
          note.textContent =
            err instanceof BackendMissingError
              ? 'ডেমো সংস্করণ: মন্তব্য সার্ভারে পাঠানো হয়নি। src/api.ts ফাইলে submitComment() ফাংশনে API যুক্ত করুন।'
              : 'মন্তব্য পাঠানো যায়নি। আবার চেষ্টা করুন।';
        }
      });

      return () => {
        window.removeEventListener('scroll', onScroll);
        bar.style.transform = 'scaleX(0)';
      };
    },
  };
}
