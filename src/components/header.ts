import { getPosts } from '../api';
import { navigate } from '../router';
import { SITE, T } from '../strings';
import type { Post } from '../types';
import { B, stripBase, bn, categoryUrl, debounce, esc, fold, href, img, tagUrl, todayBn } from '../utils';

interface NavItem {
  label: string;
  href?: string;
  children?: { label: string; href: string }[];
}

const YEARS = Array.from({ length: 12 }, (_, i) => 2014 + i);
const MORE_CATEGORIES = ['ভুমিকা', 'সম্পাদকীয়', 'ইতিহাস', 'সাহিত্য', 'সমাজ ও সংস্কৃতি', 'পর্যালোচনা', 'জীবনী', 'স্মৃতিচারণ', 'পৌরাণিক কাহিনী', 'বিজ্ঞান ও প্রযুক্তি'];

const NAV: NavItem[] = [
  { label: T.home, href: `${B}/` },
  { label: T.recent, href: `${B}/recent` },
  {
    label: T.onlineChe,
    children: YEARS.map((y) => ({ label: `${SITE.name}-${bn(y)}`, href: tagUrl(`${SITE.name} - ${bn(y)}`) })),
  },
  { label: T.featured, href: `${B}/featured` },
  { label: 'ইমার ঠারর এলা', href: categoryUrl('ইমার ঠারর এলা') },
  { label: 'পৌ', href: categoryUrl('পৌ') },
  { label: T.about, href: `${B}/about-us` },
  {
    label: T.more,
    children: [
      { label: T.authors, href: `${B}/lekhok` },
      { label: T.pdfBooks, href: `${B}/pdf` },
      { label: T.social, href: `${B}/social-activities` },
      ...MORE_CATEGORIES.map((c) => ({ label: c, href: categoryUrl(c) })),
    ],
  },
];

function navHtml(): string {
  return NAV.map((item, i) => {
    if (!item.children) return `<li><a class="nav__link" href="${item.href}">${esc(item.label)}</a></li>`;
    return `<li class="nav__group">
      <button type="button" class="nav__link nav__toggle" aria-expanded="false" aria-controls="submenu-${i}">
        ${esc(item.label)} <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
      </button>
      <ul class="submenu${item.children.length > 8 ? ' submenu--cols' : ''}" id="submenu-${i}">
        ${item.children.map((c) => `<li><a href="${c.href}">${esc(c.label)}</a></li>`).join('')}
      </ul>
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
  <div class="masthead">
    <div class="container masthead__inner">
      <button type="button" class="icon-btn icon-btn--plain masthead__burger" id="nav-open" aria-label="${T.menu}" aria-controls="nav" aria-expanded="false">
        <i class="fa-solid fa-bars" aria-hidden="true"></i>
      </button>
      <a class="brand" href="${B}/" aria-label="${SITE.name} — ${T.home}">
        <img class="brand__logo" src="${SITE.logo}" alt="" width="52" height="52">
        <span class="brand__text">
          <span class="brand__name">${SITE.name}</span>
          <span class="brand__tag">${SITE.tagline}</span>
        </span>
      </a>
      <div class="masthead__tools">
        <button type="button" class="search-trigger" id="search-open" aria-label="${T.search}">
          <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
          <span>${T.search}</span>
          <kbd>/</kbd>
        </button>
        <button type="button" class="icon-btn icon-btn--plain" id="theme-toggle" aria-label="${T.theme}">
          <i class="fa-solid fa-moon" aria-hidden="true"></i>
        </button>
      </div>
    </div>
    <div class="phee" aria-hidden="true"></div>
  </div>
  <nav class="nav" id="nav" aria-label="${T.menu}">
    <div class="nav__head">
      <span>${T.menu}</span>
      <button type="button" class="icon-btn icon-btn--plain" id="nav-close" aria-label="${T.close}"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
    </div>
    <ul class="container nav__list">${navHtml()}</ul>
  </nav>
  <div class="scrim" id="nav-scrim" hidden></div>`;

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
  document.querySelectorAll<HTMLAnchorElement>('#nav a').forEach((a) => {
    let target = stripBase(a.pathname);
    try {
      target = decodeURIComponent(target);
    } catch {
      /* keep raw */
    }
    const current = target.normalize('NFC') === path;
    if (current) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
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
  const nav = document.getElementById('nav')!;
  const masthead = document.querySelector<HTMLElement>('.masthead')!;
  let ticking = false;
  const update = () => {
    ticking = false;
    btn.hidden = window.scrollY < 700;
    nav.classList.toggle('is-stuck', window.scrollY > masthead.offsetTop + masthead.offsetHeight);
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
