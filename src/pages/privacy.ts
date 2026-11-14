/**
 * Privacy policy. The text lives in src/content/privacy.md — edit it there.
 * Supported there: "## Heading", "### Sub-heading", "- bullet", "1. numbered",
 * **bold**, [link text](url) and blank lines between paragraphs.
 */
import source from '../content/privacy.md?raw';
import { SITE, T } from '../strings';
import type { View } from '../types';
import { B, esc } from '../utils';

interface Section {
  id: string;
  title: string;
  html: string;
}

function inline(text: string): string {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(((?:https?:|mailto:)[^)\s]+)\)/g, (_m, label: string, url: string) =>
      `<a href="${url}"${url.startsWith('http') ? ' target="_blank" rel="noopener"' : ' data-external'}>${label}</a>`,
    );
}

function parse(md: string): { intro: string; sections: Section[] } {
  const sections: Section[] = [];
  let intro = '';
  let current: Section | null = null;
  let para: string[] = [];
  let list: { tag: 'ul' | 'ol'; items: string[] } | null = null;

  const out = (html: string) => {
    if (current) current.html += html;
    else intro += html;
  };
  const flush = () => {
    if (para.length) out(`<p>${para.map(inline).join('<br>')}</p>`);
    if (list) out(`<${list.tag}>${list.items.map((i) => `<li>${inline(i)}</li>`).join('')}</${list.tag}>`);
    para = [];
    list = null;
  };

  for (const raw of md.split('\n')) {
    const line = raw.trim();
    let m: RegExpExecArray | null;
    if (!line) flush();
    else if ((m = /^## (.+)$/.exec(line))) {
      flush();
      current = { id: `section-${sections.length + 1}`, title: m[1], html: '' };
      sections.push(current);
    } else if ((m = /^### (.+)$/.exec(line))) {
      flush();
      out(`<h3>${inline(m[1])}</h3>`);
    } else if ((m = /^(-|\d+\.) (.+)$/.exec(line))) {
      const tag = m[1] === '-' ? 'ul' : 'ol';
      if (para.length || (list && list.tag !== tag)) flush();
      list ??= { tag, items: [] };
      list.items.push(m[2]);
    } else {
      if (list) flush();
      para.push(line);
    }
  }
  flush();
  return { intro, sections };
}

const doc = parse(source);

export function privacyPage(): View {
  return {
    title: `Privacy Policy | ${SITE.name}`,
    description: 'How Ningshing Che Organization collects, uses, stores and protects personal information.',
    html: `<div lang="en">
    <header class="page-head">
      <div class="container">
        <nav class="crumbs" aria-label="Breadcrumb"><a href="${B}/" lang="bn">${T.home}</a><i class="fa-solid fa-chevron-right" aria-hidden="true"></i><span>Privacy Policy</span></nav>
        <h1 class="page-head__title"><i class="fa-solid fa-shield-halved" aria-hidden="true"></i> Privacy Policy</h1>
        <p class="page-head__sub">Ningshing Che Organization</p>
      </div>
      <div class="phee phee--soft" aria-hidden="true"></div>
    </header>
    <section class="container legal section">
      <nav class="legal__toc" aria-label="Contents">
        <h2>Contents</h2>
        <ol>${doc.sections.map((s) => `<li><a href="#${s.id}">${esc(s.title.replace(/^\d+\.\s*/, ''))}</a></li>`).join('')}</ol>
      </nav>
      <article class="legal__body prose">
        <div class="legal__dates">${doc.intro}</div>
        ${doc.sections.map((s) => `<section id="${s.id}"><h2>${esc(s.title)}</h2>${s.html}</section>`).join('')}
        <footer class="legal__sign">
          <strong>Ningshing Che Organization</strong>
          <p>Committed to respecting user privacy, protecting personal information, and providing a trustworthy digital experience.</p>
        </footer>
      </article>
    </section>
    </div>`,
    mount(root) {
      // In-page links: the router ignores "#…" hrefs, so scroll by hand.
      root.querySelector('.legal__toc')!.addEventListener('click', (e) => {
        const a = (e.target as Element).closest('a');
        if (!a) return;
        e.preventDefault();
        const target = root.querySelector<HTMLElement>(a.getAttribute('href')!);
        target?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
        target?.querySelector('h2')?.setAttribute('tabindex', '-1');
        target?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
      });
    },
  };
}
