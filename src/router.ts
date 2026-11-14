/**
 * A small History-API router: clean URLs, no "#".
 *
 *  - same-origin <a> clicks are intercepted and turned into pushState
 *  - back/forward (popstate) re-renders and restores the scroll position
 *  - the server must answer every unknown path with index.html
 */
import type { RouteContext, View } from './types';

type Handler = (ctx: RouteContext) => Promise<View> | View;
interface Route {
  pattern: RegExp;
  handler: Handler;
}

interface Hooks {
  loading: () => string;
  error: (err: unknown) => View;
  afterRender: (path: string) => void;
}

const routes: Route[] = [];
let notFound: Handler = () => ({ title: '404', html: '' });
let hooks: Hooks;
let outlet: HTMLElement;
let cleanup: void | (() => void);
let renderId = 0;
let lastPath = '';

export function route(pattern: RegExp, handler: Handler): void {
  routes.push({ pattern, handler });
}

export function setNotFound(handler: Handler): void {
  notFound = handler;
}

function decodedPath(): string {
  let path = location.pathname;
  try {
    path = decodeURIComponent(path);
  } catch {
    /* malformed escape sequence — match against the raw path */
  }
  if (path.length > 1) path = path.replace(/\/+$/, '');
  return path.normalize('NFC') || '/';
}

function match(path: string): { handler: Handler; params: string[] } {
  for (const r of routes) {
    const m = r.pattern.exec(path);
    if (m) return { handler: r.handler, params: m.slice(1).map((v) => v ?? '') };
  }
  return { handler: notFound, params: [] };
}

function saveScroll(): void {
  history.replaceState({ ...(history.state ?? {}), y: window.scrollY }, '');
}

async function render(restoreY: number | null): Promise<void> {
  const id = ++renderId;
  const path = decodedPath();
  const query = new URLSearchParams(location.search);
  const { handler, params } = match(path);
  const samePage = path === lastPath;

  // Show a skeleton only if the data takes a moment to arrive.
  const spinner = window.setTimeout(() => {
    if (id === renderId && !samePage) outlet.innerHTML = hooks.loading();
  }, 180);

  let view: View;
  try {
    view = await handler({ params, query, path });
  } catch (err) {
    console.error(err);
    view = hooks.error(err);
  }
  window.clearTimeout(spinner);
  if (id !== renderId) return; // a newer navigation won the race

  const swap = () => {
    if (typeof cleanup === 'function') cleanup();
    outlet.innerHTML = view.html;
    document.title = view.title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', view.description ?? '');
    cleanup = view.mount?.(outlet);
  };

  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => { updateCallbackDone: Promise<void> };
  };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (doc.startViewTransition && !reduced && !samePage) {
    // Cross-fade between pages where the browser supports it.
    try {
      await doc.startViewTransition(swap).updateCallbackDone;
    } catch {
      /* transition skipped — the DOM was still updated */
    }
  } else {
    swap();
  }

  lastPath = path;
  hooks.afterRender(path);

  if (restoreY !== null) {
    window.scrollTo(0, restoreY);
  } else if (samePage) {
    // Same page, new query (pagination): go back to the top of the list.
    const anchor = outlet.querySelector<HTMLElement>('[data-scroll-anchor]');
    if (anchor) anchor.scrollIntoView({ block: 'start' });
    else window.scrollTo(0, 0);
  } else {
    window.scrollTo(0, 0);
    outlet.focus({ preventScroll: true });
  }
}

export function navigate(to: string, opts: { replace?: boolean } = {}): void {
  const url = new URL(to, location.href);
  if (url.origin !== location.origin) {
    location.href = to;
    return;
  }
  if (url.href === location.href) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  saveScroll();
  if (opts.replace) history.replaceState({}, '', url);
  else history.pushState({}, '', url);
  void render(null);
}

function onClick(e: MouseEvent): void {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = (e.target as Element | null)?.closest?.('a');
  if (!a) return;
  const raw = a.getAttribute('href');
  if (!raw || raw.startsWith('#') || a.target === '_blank' || a.hasAttribute('download') || a.dataset.external !== undefined) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin) return;
  if (/^\/(data|assets)\//.test(url.pathname)) return; // real files
  e.preventDefault();
  navigate(url.href);
}

export function startRouter(el: HTMLElement, h: Hooks): void {
  outlet = el;
  hooks = h;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  document.addEventListener('click', onClick);
  window.addEventListener('popstate', (e) => {
    const y = (e.state as { y?: number } | null)?.y;
    void render(typeof y === 'number' ? y : 0);
  });
  window.addEventListener('pagehide', saveScroll);
  void render(null);
}

/** Re-run the current route (used by the "retry" button). */
export function reload(): void {
  lastPath = '';
  void render(null);
}
