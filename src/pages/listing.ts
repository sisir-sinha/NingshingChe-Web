import { getCategories, getPosts, getSite } from '../api';
import { emptyState, pagination, paginate, postCard } from '../components/cards';
import { searchPosts } from '../components/header';
import { navigate } from '../router';
import { categoryWidget, postsWidget } from '../components/sidebar';
import { SITE, T } from '../strings';
import type { Post, RouteContext, View } from '../types';
import { bn, esc } from '../utils';

const PER_PAGE = 10;

interface ListingOptions {
  kicker: string;
  icon: string;
  heading: string;
  posts: Post[];
  ctx: RouteContext;
  activeCategory?: string;
  /** Extra HTML under the heading (e.g. a search box) */
  extra?: string;
  empty?: string;
}

export function pageHead(kicker: string, icon: string, heading: string, sub = '', extra = ''): string {
  return `<header class="page-head">
    <div class="container">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="/">${T.home}</a><i class="fa-solid fa-chevron-right" aria-hidden="true"></i><span>${esc(kicker)}</span></nav>
      <h1 class="page-head__title"><i class="${icon}" aria-hidden="true"></i> ${esc(heading)}</h1>
      ${sub ? `<p class="page-head__sub">${esc(sub)}</p>` : ''}
      ${extra}
    </div>
    <div class="phee phee--soft" aria-hidden="true"></div>
  </header>`;
}

async function listing(o: ListingOptions): Promise<View> {
  const [all, categories] = await Promise.all([getPosts(), getCategories()]);
  const { items, page, pages } = paginate(o.posts, o.ctx.query, PER_PAGE);
  const shown = new Set(o.posts.map((p) => p.path));
  const latest = all.filter((p) => !shown.has(p.path)).slice(0, 5);

  return {
    title: `${o.heading} | ${SITE.name}`,
    description: `${o.heading} — ${SITE.description}`,
    html: `
    ${pageHead(o.kicker, o.icon, o.heading, `${bn(o.posts.length)} ${T.articles}`, o.extra)}
    <div class="container layout section" data-scroll-anchor>
      <section aria-label="${esc(o.heading)}">
        ${
          items.length
            ? `<div class="grid grid--posts">${items.map((p) => postCard(p)).join('')}</div>${pagination(page, pages, o.ctx.query)}`
            : emptyState(o.empty ?? T.noResults)
        }
      </section>
      <aside class="sidebar">
        ${categoryWidget(categories, o.activeCategory)}
        ${latest.length ? postsWidget(T.newPosts, latest) : ''}
      </aside>
    </div>`,
  };
}

export async function categoryPage(ctx: RouteContext): Promise<View> {
  const name = ctx.params[0];
  const posts = (await getPosts()).filter((p) => p.category.normalize('NFC') === name);
  return listing({ kicker: T.categories, icon: 'fa-solid fa-layer-group', heading: name, posts, ctx, activeCategory: name });
}

export async function tagPage(ctx: RouteContext): Promise<View> {
  const name = ctx.params[0].replace(/_/g, ' ');
  const posts = (await getPosts()).filter((p) => p.tags.some((t) => t.normalize('NFC') === name));
  const site = await getSite();
  const issues = site.issues.filter((i) => site.issueCounts[i] > 0);
  const extra = issues.includes(name)
    ? `<div class="pill-row">${issues
        .map((i) => `<a class="topic${i === name ? ' is-active' : ''}" href="/tag/${encodeURIComponent(i.replace(/ /g, '_'))}">${esc(i)} <span>${bn(site.issueCounts[i])}</span></a>`)
        .join('')}</div>`
    : '';
  return listing({ kicker: T.tags, icon: 'fa-solid fa-hashtag', heading: name, posts, ctx, extra });
}

export async function featuredPage(ctx: RouteContext): Promise<View> {
  const posts = (await getPosts()).filter((p) => p.featured);
  return listing({ kicker: T.featured, icon: 'fa-solid fa-star', heading: T.featuredArticles, posts, ctx });
}

export async function recentPage(ctx: RouteContext): Promise<View> {
  return listing({ kicker: T.recent, icon: 'fa-solid fa-bolt', heading: T.recent, posts: await getPosts(), ctx });
}

export async function searchPage(ctx: RouteContext): Promise<View> {
  const q = (ctx.query.get('q') ?? '').trim();
  const posts = q ? searchPosts(await getPosts(), q) : [];
  const extra = `<form class="inline-search" action="/search" role="search" data-search-form>
    <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
    <input type="search" name="q" value="${esc(q)}" placeholder="${T.searchPlaceholder}" aria-label="${T.search}">
    <button class="btn btn--primary" type="submit">${T.search}</button>
  </form>`;
  const view = await listing({ kicker: T.search, icon: 'fa-solid fa-magnifying-glass', heading: q ? `“${q}”` : T.search, posts, ctx, extra, empty: q ? T.noResults : T.searchHint });
  view.mount = (root) => {
    root.querySelector<HTMLFormElement>('[data-search-form]')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = new FormData(e.currentTarget as HTMLFormElement).get('q');
      navigate(`/search?q=${encodeURIComponent(String(value ?? '').trim())}`);
    });
  };
  return view;
}
