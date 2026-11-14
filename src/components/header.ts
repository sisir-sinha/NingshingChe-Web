import { getPosts } from '../api';
import { currentUser, onAuthChange } from '../auth';
import { avatar } from '../pages/account';
import { navigate } from '../router';
import { SITE, T } from '../strings';
import type { Post } from '../types';
import { B, stripBase, bn, categoryUrl, debounce, esc, fold, href, img, tagUrl, todayBn } from '../utils';

interface NavChild {
  label: string;
  href: string;
  icon?: string;
}
interface NavItem {
  label: string;
  icon: string;
  href?: string;
  /** Drawn as a highlighted button */
  special?: 'forum' | 'music';
  /** Dropdown layout: a grid of issues, or a row of page tiles */
  menu?: 'issues' | 'more';
  children?: NavChild[];
}

const YEARS = Array.from({ length: 12 }, (_, i) => 2014 + i);
const CATEGORIES = ['ইমার ঠারর এলা', 'পৌ', 'ভুমিকা', 'সম্পাদকীয়', 'ইতিহাস', 'সাহিত্য', 'সমাজ ও সংস্কৃতি', 'পর্যালোচনা', 'জীবনী', 'স্মৃতিচারণ', 'পৌরাণিক কাহিনী', 'বিজ্ঞান ও প্রযুক্তি'];

const NAV: NavItem[] = [
  { label: T.home, icon: 'fa-house', href: `${B}/` },
  { label: T.recent, icon: 'fa-bolt', href: `${B}/recent` },
  {
    label: T.onlineChe,
    icon: 'fa-book-open',
    menu: 'issues',
    children: YEARS.map((y) => ({ label: bn(y), href: tagUrl(`${SITE.name} - ${bn(y)}`) })),
  },
  { label: T.featured, icon: 'fa-star', href: `${B}/featured` },
  { label: T.forum, icon: 'fa-comments', href: `${B}/forum`, special: 'forum' },
  { label: T.music, icon: 'fa-headphones', href: `${B}/music`, special: 'music' },
  { label: T.about, icon: 'fa-circle-info', href: `${B}/about-us` },
  {
    label: T.more,
    icon: 'fa-ellipsis',
    menu: 'more',
    children: [
      { label: T.authors, href: `${B}/lekhok`, icon: 'fa-feather-pointed' },
      { label: T.pdfBooks, href: `${B}/pdf`, icon: 'fa-file-pdf' },
      { label: T.social, href: `${B}/social-activities`, icon: 'fa-people-group' },
    ],
  },
];

function submenu(item: NavItem, id: string): string {
  const kids = item.children ?? [];
  const link = (c: NavChild) =>
    `<li><a href="${c.href}">${c.icon ? `<i class="fa-solid ${c.icon}" aria-hidden="true"></i>` : ''}<span>${esc(c.label)}</span></a></li>`;
  if (item.menu === 'issues') {
    return `<div class="submenu submenu--issues" id="${id}">
      <p class="submenu__label">${SITE.name} — ${esc(item.label)}</p>
      <ul class="submenu__grid">${kids.map(link).join('')}</ul>
    </div>`;
  }
  return `<div class="submenu submenu--more" id="${id}">
    <ul class="submenu__pages">${kids.map(link).join('')}</ul>
  </div>`;
}

function navHtml(): string {
  return NAV.map((item, i) => {
    const icon = `<i class="nav__icon fa-solid ${item.icon}" aria-hidden="true"></i>`;
    if (!item.children) return `<li><a class="nav__link${item.special ? ` nav__link--special nav__link--${item.special}` : ''}" href="${item.href}">${icon}<span>${esc(item.label)}</span></a></li>`;
    return `<li class="nav__group">
      <button type="button" class="nav__link nav__toggle" aria-expanded="false" aria-controls="submenu-${i}">
        ${icon}<span>${esc(item.label)}</span><i class="nav__caret fa-solid fa-chevron-down" aria-hidden="true"></i>
      </button>
      ${submenu(item, `submenu-${i}`)}
    </li>`;
  }).join('');
}

export function renderHeader(el: HTMLElement): void {
  el.innerHTML = `
  <div class="topbar">
    <div class="container topbar__inner">
      <span class="topbar__date"><i class="fa-regular fa-calendar-days" aria-hidden="true"></i> ${esc(todayBn())}</span>
      <div class="topbar__links">
        <a href="${B}/blog_submission"><i class="fa-solid fa-feather-pointed" aria-hidden="true"></i> ${T.submitArticle}</a>
        <a href="${SITE.facebook}" target="_blank" rel="noopener" aria-label="Facebook"><i class="fa-brands fa-facebook-f" aria-hidden="true"></i></a>
        <a href="${SITE.youtube}" target="_blank" rel="noopener" aria-label="YouTube"><i class="fa-brands fa-youtube" aria-hidden="true"></i></a>
        <a href="${SITE.whatsapp}" target="_blank" rel="noopener" aria-label="WhatsApp"><i class="fa-brands fa-whatsapp" aria-hidden="true"></i></a>
      </div>
    </div>
  </div>
  <div class="bar" id="bar">
    <div class="container bar__inner">
      <button type="button" class="icon-btn icon-btn--plain bar__burger" id="nav-open" aria-label="${T.menu}" aria-controls="nav" aria-expanded="false">
        <i class="fa-solid fa-bars-staggered" aria-hidden="true"></i>
      </button>
      <a class="brand" href="${B}/" aria-label="${SITE.name} — ${T.home}">
        <img class="brand__logo" src="${SITE.logo}" alt="" width="46" height="46">
        <span class="brand__text">
          <span class="brand__name">${SITE.name}</span>
          <span class="brand__tag">${SITE.tagline}</span>
        </span>
      </a>
      <div class="scrim" id="nav-scrim" hidden></div>
      <nav class="nav" id="nav" aria-label="${T.menu}">
        <div class="nav__head">
          <span class="brand">
            <img class="brand__logo" src="${SITE.logo}" alt="" width="40" height="40">
            <span class="brand__name">${SITE.name}</span>
          </span>
          <button type="button" class="icon-btn icon-btn--plain" id="nav-close" aria-label="${T.close}"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
        </div>
        <ul class="nav__list">${navHtml()}</ul>
        <div class="nav__account" id="nav-account"></div>
        <div class="nav__foot">
          <a class="btn btn--primary" href="${B}/blog_submission"><i class="fa-solid fa-feather-pointed" aria-hidden="true"></i> ${T.submitArticle}</a>
          <div class="nav__social">
            <a class="icon-btn" href="${SITE.facebook}" target="_blank" rel="noopener" aria-label="Facebook"><i class="fa-brands fa-facebook-f" aria-hidden="true"></i></a>
            <a class="icon-btn" href="${SITE.youtube}" target="_blank" rel="noopener" aria-label="YouTube"><i class="fa-brands fa-youtube" aria-hidden="true"></i></a>
            <a class="icon-btn" href="${SITE.whatsapp}" target="_blank" rel="noopener" aria-label="WhatsApp"><i class="fa-brands fa-whatsapp" aria-hidden="true"></i></a>
          </div>
        </div>
      </nav>
      <div class="bar__tools">
        <button type="button" class="search-trigger" id="search-open" aria-label="${T.search}">
          <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
          <span>${T.search}</span>
          <kbd>/</kbd>
        </button>
        <button type="button" class="icon-btn icon-btn--plain" id="theme-toggle" aria-label="${T.theme}">
          <i class="fa-solid fa-moon" aria-hidden="true"></i>
        </button>
        <div class="account" id="account"></div>
      </div>
    </div>
  </div>
  <nav class="catbar" aria-label="${T.categories}">
    <div class="container catbar__inner">
      <span class="catbar__label"><i class="fa-solid fa-layer-group" aria-hidden="true"></i> ${T.categories}</span>
      <ul class="catbar__list">${CATEGORIES.map((c) => `<li><a href="${categoryUrl(c)}">${esc(c)}</a></li>`).join('')}</ul>
    </div>
    <div class="phee" aria-hidden="true"></div>
  </nav>`;

  document.getElementById('overlays')!.innerHTML = `
  <div class="search" id="search" role="dialog" aria-modal="true" aria-label="${T.search}" hidden>
    <div class="search__panel">
      <form class="search__form" id="search-form" role="search">
        <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
        <input id="search-input" type="search" autocomplete="off" enterkeyhint="search" placeholder="${T.searchPlaceholder}" aria-label="${T.search}">
        <button type="button" class="icon-btn icon-btn--plain" id="search-close" aria-label="${T.close}"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
      </form>
      <div class="search__results" id="search-results"><p class="search__hint">${T.searchHint}</p></div>
    </div>
  </div>
  <button type="button" class="to-top" id="to-top" aria-label="${T.toTop}" hidden><i class="fa-solid fa-arrow-up" aria-hidden="true"></i></button>`;

  initTheme();
  initAccount();
  initDrawer(el);
  initSearch();
  initToTop();
}

/* ---------- theme ---------- */
function initTheme(): void {
  const btn = document.getElementById('theme-toggle')!;
  const paint = () => {
    const dark = document.documentElement.dataset.theme === 'dark';
    btn.innerHTML = `<i class="fa-solid ${dark ? 'fa-sun' : 'fa-moon'}" aria-hidden="true"></i>`;
    btn.setAttribute('aria-pressed', String(dark));
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#1a0c0e' : '#6d1322');
  };
  btn.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('nc-theme', next);
    } catch {
      /* private mode: the choice just won't persist */
    }
    paint();
  });
  paint();
}

/* ---------- account button (header) + account row (mobile drawer) ---------- */
let closeAccount: () => void = () => {};

function initAccount(): void {
  const slot = document.getElementById('account')!;
  const drawer = document.getElementById('nav-account')!;

  const paint = () => {
    const user = currentUser();
    if (!user) {
      slot.innerHTML = `<a class="account__login" href="${B}/login" aria-label="${T.login}"><i class="fa-regular fa-user" aria-hidden="true"></i><span>${T.login}</span></a>`;
      drawer.innerHTML = `<a class="nav__user" href="${B}/login">
          <span class="avatar avatar--initial" aria-hidden="true"><i class="fa-regular fa-user"></i></span>
          <span class="nav__user-text"><strong>${T.login} / ${T.register}</strong><small>${T.account}</small></span>
          <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
        </a>`;
      return;
    }
    slot.innerHTML = `<button type="button" class="account__btn" id="account-btn" aria-haspopup="true" aria-expanded="false" aria-controls="account-menu" aria-label="${T.account}: ${esc(user.name)}">${avatar(user)}</button>
      <div class="account__menu" id="account-menu" hidden>
        <div class="account__who">${avatar(user)}<span><strong>${esc(user.name)}</strong><small>${esc(user.email)}</small></span></div>
        <a href="${B}/profile"><i class="fa-regular fa-user" aria-hidden="true"></i> ${T.profile}</a>
        <a href="${B}/blog_submission"><i class="fa-solid fa-feather-pointed" aria-hidden="true"></i> ${T.submitArticle}</a>
        <button type="button" data-logout><i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i> ${T.logout}</button>
      </div>`;
    drawer.innerHTML = `<a class="nav__user" href="${B}/profile">
        ${avatar(user)}
        <span class="nav__user-text"><strong>${esc(user.name)}</strong><small>${esc(user.email)}</small></span>
        <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
      </a>
      <button type="button" class="icon-btn" data-logout aria-label="${T.logout}"><i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i></button>`;
  };

  const setMenu = (on: boolean) => {
    const menu = document.getElementById('account-menu');
    if (!menu) return;
    menu.hidden = !on;
    document.getElementById('account-btn')?.setAttribute('aria-expanded', String(on));
  };
  closeAccount = () => setMenu(false);

  slot.addEventListener('click', (e) => {
    const target = e.target as Element;
    if (target.closest('#account-btn')) setMenu(Boolean(document.getElementById('account-menu')!.hidden));
    else if (target.closest('.account__menu a, .account__menu button')) setMenu(false);
  });
  document.addEventListener('click', (e) => {
    if (!(e.target as Element).closest('#account')) setMenu(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setMenu(false);
  });
  // Another tab signed in or out
  window.addEventListener('storage', (e) => {
    if (e.key === 'nc-session' || e.key === 'nc-users') paint();
  });
  onAuthChange(paint);
  paint();
}

/* ---------- navigation drawer + dropdowns ---------- */
let closeDrawer: () => void = () => {};

function initDrawer(header: HTMLElement): void {
  const nav = header.querySelector<HTMLElement>('#nav')!;
  const open = header.querySelector<HTMLElement>('#nav-open')!;
  const scrim = header.querySelector<HTMLElement>('#nav-scrim')!;
  const groups = [...nav.querySelectorAll<HTMLElement>('.nav__group')];

  const setGroup = (g: HTMLElement, on: boolean) => {
    g.classList.toggle('is-open', on);
    g.querySelector('.nav__toggle')?.setAttribute('aria-expanded', String(on));
  };
  const closeGroups = (except?: HTMLElement) => groups.forEach((g) => g !== except && setGroup(g, false));

  const setDrawer = (on: boolean) => {
    nav.classList.toggle('is-open', on);
    scrim.hidden = !on;
    open.setAttribute('aria-expanded', String(on));
    document.documentElement.classList.toggle('no-scroll', on);
    if (on) nav.querySelector<HTMLElement>('#nav-close')?.focus();
  };
  closeDrawer = () => {
    setDrawer(false);
    closeGroups();
  };

  open.addEventListener('click', () => setDrawer(true));
  nav.querySelector('#nav-close')!.addEventListener('click', () => {
    setDrawer(false);
    open.focus();
  });
  scrim.addEventListener('click', () => setDrawer(false));

  groups.forEach((g) => {
    g.querySelector('.nav__toggle')!.addEventListener('click', () => {
      const on = !g.classList.contains('is-open');
      closeGroups(g);
      setGroup(g, on);
    });
  });
  document.addEventListener('click', (e) => {
    if (!(e.target as Element).closest('.nav__group')) closeGroups();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawer();
  });
}

/** Called by the router after each navigation. */
export function syncHeader(path: string): void {
  closeDrawer();
  closeSearch();
  closeAccount();
  document.querySelectorAll<HTMLAnchorElement>('#nav a, .catbar a').forEach((a) => {
    let target = stripBase(a.pathname);
    try {
      target = decodeURIComponent(target);
    } catch {
      /* keep raw */
    }
    const current = target.normalize('NFC') === path;
    // Forum topics keep the Forum button lit.
    const within = a.classList.contains('nav__link--forum') && path.startsWith(`${target}/`);
    if (current || within) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  document.querySelector<HTMLElement>('.catbar [aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  document.querySelectorAll<HTMLElement>('.nav__group').forEach((g) => {
    g.classList.toggle('has-current', Boolean(g.querySelector('[aria-current="page"]')));
  });
}

/* ---------- search ---------- */
let closeSearch: () => void = () => {};

export function searchPosts(posts: Post[], query: string): Post[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return posts
    .map((p) => {
      const title = fold(p.title);
      const rest = fold(`${p.author} ${p.category} ${p.tags.join(' ')}`);
      const body = fold(p.excerpt);
      let score = 0;
      for (const w of words) {
        if (title.includes(w)) score += 5;
        else if (rest.includes(w)) score += 3;
        else if (body.includes(w)) score += 1;
        else return { p, score: 0 };
      }
      return { p, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.p);
}

function initSearch(): void {
  const dialog = document.getElementById('search')!;
  const input = document.getElementById('search-input') as HTMLInputElement;
  const results = document.getElementById('search-results')!;
  const trigger = document.getElementById('search-open')!;
  const hint = `<p class="search__hint">${T.searchHint}</p>`;

  const open = () => {
    dialog.hidden = false;
    document.documentElement.classList.add('no-scroll');
    input.value = '';
    results.innerHTML = hint;
    input.focus();
    void getPosts(); // warm the cache
  };
  closeSearch = () => {
    if (dialog.hidden) return;
    dialog.hidden = true;
    document.documentElement.classList.remove('no-scroll');
  };

  const update = debounce(async () => {
    const q = input.value.trim();
    if (!q) {
      results.innerHTML = hint;
      return;
    }
    const found = searchPosts(await getPosts(), q);
    if (input.value.trim() !== q) return;
    results.innerHTML = found.length
      ? `<ul class="search__list">${found
          .slice(0, 6)
          .map(
            (p) => `<li><a href="${href(p.path)}">
              <span class="media">${p.image ? `<img src="${esc(img(p.image, 160))}" alt="" loading="lazy">` : ''}</span>
              <span><strong>${esc(p.title)}</strong><small>${esc(p.category)} · ${esc(p.author)}</small></span>
            </a></li>`,
          )
          .join('')}</ul>
          ${found.length > 6 ? `<a class="search__all" href="${B}/search?q=${encodeURIComponent(q)}">${T.seeAll} (${bn(found.length)}) <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>` : ''}`
      : `<p class="search__hint">${T.noResults}</p>`;
  }, 120);

  trigger.addEventListener('click', open);
  document.getElementById('search-close')!.addEventListener('click', () => {
    closeSearch();
    trigger.focus();
  });
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) closeSearch();
  });
  input.addEventListener('input', update);
  document.getElementById('search-form')!.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (q) navigate(`${B}/search?q=${encodeURIComponent(q)}`);
  });
  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as Element).tagName);
    if (e.key === 'Escape') closeSearch();
    else if ((e.key === '/' && !typing) || (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey))) {
      e.preventDefault();
      open();
    }
  });
}

/* ---------- back to top + sticky shadow ---------- */
function initToTop(): void {
  const btn = document.getElementById('to-top')!;
  const bar = document.getElementById('bar')!;
  const topbar = document.querySelector<HTMLElement>('.topbar')!;
  let ticking = false;
  const update = () => {
    ticking = false;
    btn.hidden = window.scrollY < 700;
    bar.classList.toggle('is-stuck', window.scrollY > topbar.offsetHeight);
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}
