import { getAuthor, getAuthors, getPosts } from '../api';
import { authorCard, emptyState, media, pagination, paginate, postCard, shareButtons } from '../components/cards';
import { SITE, T } from '../strings';
import type { RouteContext, View } from '../types';
import { authorUrl, bn, esc, fold } from '../utils';
import { pageHead } from './listing';
import { notFoundPage } from './static';

export async function authorsPage(): Promise<View> {
  const authors = await getAuthors();
  return {
    title: `${T.ourAuthors} | ${SITE.name}`,
    description: `${T.ourAuthors} — ${SITE.description}`,
    html: `
    ${pageHead(
      T.authors,
      'fa-solid fa-feather-pointed',
      T.ourAuthors,
      `${bn(authors.length)} ${T.authors}`,
      `<label class="inline-search"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
        <input type="search" data-filter placeholder="${T.authors} ${T.search}…" aria-label="${T.authors} ${T.search}"></label>`,
    )}
    <section class="container section">
      <div class="grid grid--authors" data-grid>
        ${authors.map((a) => `<div data-name="${esc(fold(`${a.name} ${a.role}`))}">${authorCard(a)}</div>`).join('')}
      </div>
      <p class="empty" data-none hidden>${T.noResults}</p>
    </section>`,
    mount(root) {
      const input = root.querySelector<HTMLInputElement>('[data-filter]')!;
      const cells = [...root.querySelectorAll<HTMLElement>('[data-name]')];
      const none = root.querySelector<HTMLElement>('[data-none]')!;
      input.addEventListener('input', () => {
        const q = fold(input.value.trim());
        let visible = 0;
        for (const cell of cells) {
          const show = !q || (cell.dataset.name ?? '').includes(q);
          cell.hidden = !show;
          if (show) visible++;
        }
        none.hidden = visible > 0;
      });
    },
  };
}

export async function authorPage(ctx: RouteContext): Promise<View> {
  const author = await getAuthor(ctx.params[0]);
  if (!author) return notFoundPage();
  const posts = (await getPosts()).filter((p) => p.author === author.name);
  const { items, page, pages } = paginate(posts, ctx.query, 9);
  const long = author.bio.length > 420;

  return {
    title: `${author.name} | ${SITE.name}`,
    description: author.bio.slice(0, 160) || `${author.name} — ${author.role}`,
    html: `
    <header class="profile">
      <div class="container profile__inner">
        <div class="profile__avatar">${media(author.image, author.name, 480, true)}</div>
        <div class="profile__body">
          <nav class="crumbs" aria-label="Breadcrumb"><a href="/">${T.home}</a><i class="fa-solid fa-chevron-right" aria-hidden="true"></i><a href="/lekhok">${T.authors}</a></nav>
          <h1 class="profile__name">${esc(author.name)}</h1>
          <p class="profile__role">${esc(author.role)}</p>
          ${
            author.bio
              ? `<div class="profile__bio${long ? ' is-clamped' : ''}" data-bio>${author.bio
                  .split('\n')
                  .map((p) => `<p>${esc(p)}</p>`)
                  .join('')}</div>
                 ${long ? `<button type="button" class="link-more" data-bio-toggle aria-expanded="false">${T.more} <i class="fa-solid fa-chevron-down" aria-hidden="true"></i></button>` : ''}`
              : ''
          }
          <div class="profile__foot">
            <span class="stat"><strong>${bn(posts.length)}</strong> ${T.articles}</span>
            ${shareButtons(location.origin + authorUrl(author.name), author.name)}
          </div>
        </div>
      </div>
      <div class="phee phee--soft" aria-hidden="true"></div>
    </header>
    <section class="container section" data-scroll-anchor>
      <div class="section-head"><h2 class="section-title">${T.authorPosts}</h2></div>
      ${items.length ? `<div class="grid grid--3">${items.map((p) => postCard(p)).join('')}</div>${pagination(page, pages, ctx.query)}` : emptyState(T.noResults)}
    </section>`,
    mount(root) {
      const toggle = root.querySelector<HTMLButtonElement>('[data-bio-toggle]');
      const bio = root.querySelector<HTMLElement>('[data-bio]');
      toggle?.addEventListener('click', () => {
        const open = bio?.classList.toggle('is-clamped') === false;
        toggle.setAttribute('aria-expanded', String(open));
        toggle.querySelector('i')?.classList.toggle('fa-rotate-180', open);
      });
    },
  };
}
