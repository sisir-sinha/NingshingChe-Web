/**
 * Legal pages: privacy policy and account deletion.
 * The text lives in src/content/privacy.md and src/content/delete-account.md — edit it there.
 * Supported there: "## Heading", "### Sub-heading", "- bullet", "1. numbered",
 * **bold**, [link text](url) and blank lines between paragraphs.
 */
import deleteSource from '../content/delete-account.md?raw';
import contactSource from '../content/contact.md?raw';
import privacySource from '../content/privacy.md?raw';
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
    .replace(/\[([^\]]+)\]\(((?:https?:|mailto:|\/)[^)\s]+)\)/g, (_m, label: string, url: string) => {
      if (url.startsWith('/')) return `<a href="${B}${url}">${label}</a>`; // page on this site
      return `<a href="${url}"${url.startsWith('http') ? ' target="_blank" rel="noopener"' : ' data-external'}>${label}</a>`;
    });
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

interface LegalPage {
  source: string;
  title: string;
  icon: string;
  description: string;
  sign?: string;
  /** Optional call-to-action shown above the text. */
  lead?: string;
}

function legalPage(page: LegalPage): View {
  const doc = parse(page.source);
  return {
    title: `${page.title} | ${SITE.name}`,
    description: page.description,
    html: `<div lang="en">
    <header class="page-head">
      <div class="container">
        <nav class="crumbs" aria-label="Breadcrumb"><a href="${B}/" lang="bn">${T.home}</a><i class="fa-solid fa-chevron-right" aria-hidden="true"></i><span>${page.title}</span></nav>
        <h1 class="page-head__title"><i class="${page.icon}" aria-hidden="true"></i> ${page.title}</h1>
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
        ${page.lead ?? ''}
        ${doc.sections.map((s) => `<section id="${s.id}"><h2>${esc(s.title)}</h2>${s.html}</section>`).join('')}
        ${page.sign ? `<footer class="legal__sign"><strong>Ningshing Che Organization</strong><p>${page.sign}</p></footer>` : ''}
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

export function contactPage(): View {
  return legalPage({
    source: contactSource,
    title: 'Contact Us',
    icon: 'fa-solid fa-envelope',
    description: 'Contact Ningshing Che with questions, feedback, contributions, or privacy and account requests.',
  });
}

export function privacyPage(): View {
  return legalPage({
    source: privacySource,
    title: 'Privacy Policy',
    icon: 'fa-solid fa-shield-halved',
    description: 'How Ningshing Che Organization collects, uses, stores and protects personal information.',
    sign: 'Committed to respecting user privacy, protecting personal information, and providing a trustworthy digital experience.',
  });
}

const DELETE_MAIL =
  'mailto:ningshingche@gmail.com?subject=' +
  encodeURIComponent('Ningshing Che Account Deletion Request') +
  '&body=' +
  encodeURIComponent('Please delete my Ningshing Che account.\n\nEmail address of the account: \nName on the account: \n');

export function deleteAccountPage(): View {
  return legalPage({
    source: deleteSource,
    title: 'Delete Your Ningshing Che Account',
    icon: 'fa-solid fa-user-slash',
    description: 'How to request permanent deletion of your Ningshing Che account and the personal data associated with it.',
    sign: 'Respecting your privacy and giving you control over your data.',
    lead: `<aside class="legal__cta">
      <div>
        <strong>Request deletion by email</strong>
        <p>Opens your mail app with the subject line already filled in. Send it from the email address of your account.</p>
      </div>
      <a class="btn btn--primary" href="${DELETE_MAIL}" data-external><i class="fa-solid fa-envelope" aria-hidden="true"></i> Send deletion request</a>
    </aside>`,
  });
}
