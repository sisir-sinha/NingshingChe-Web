// Publish real, readable HTML at these URLs so non-JavaScript crawlers and
// GitHub Pages receive a 200 response instead of the SPA's 404 fallback.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const base = (process.env.BASE_PATH || '/').replace(/\/*$/, '/');
const template = readFileSync('dist/index.html', 'utf8');
const pages = [
  { path: 'contact', source: 'contact', title: 'Contact Us', description: 'Contact Ningshing Che with questions, feedback, contributions, or privacy and account requests.' },
  { path: 'privacy-policy', source: 'privacy', title: 'Privacy Policy', description: 'How Ningshing Che collects, uses, stores and protects personal information.' },
  { path: 'delete-account', source: 'delete-account', title: 'Delete Your Ningshing Che Account', description: 'How to request deletion of your Ningshing Che account and associated personal data.' },
];
const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function inline(s) {
  return escape(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(((?:https?:|mailto:|\/)[^)\s]+)\)/g, (_, label, url) => `<a href="${url.startsWith('/') ? base.replace(/\/$/, '') + url : url}">${label}</a>`);
}
function markdown(source) {
  let result = '', paragraph = [], list = null;
  const flush = () => {
    if (paragraph.length) result += `<p>${paragraph.map(inline).join('<br>')}</p>\n`;
    if (list) result += `<${list.tag}>${list.items.map(x => `<li>${inline(x)}</li>`).join('')}</${list.tag}>\n`;
    paragraph = []; list = null;
  };
  for (const raw of source.split('\n')) {
    const line = raw.trim(); let m;
    if (!line) flush();
    else if ((m = /^(#{2,3}) (.+)$/.exec(line))) { flush(); result += `<h${m[1].length}>${inline(m[2])}</h${m[1].length}>\n`; }
    else if ((m = /^(-|\d+\.) (.+)$/.exec(line))) {
      const tag = m[1] === '-' ? 'ul' : 'ol';
      if (paragraph.length || (list && list.tag !== tag)) flush();
      list ||= { tag, items: [] }; list.items.push(m[2]);
    } else { if (list) flush(); paragraph.push(line); }
  }
  flush(); return result;
}
for (const page of pages) {
  const content = markdown(readFileSync(`src/content/${page.source}.md`, 'utf8'));
  const html = template.replace('<html lang="bn">', '<html lang="en">')
    .replace(/<title>[^<]*<\/title>/, `<title>${escape(page.title)} | Ningshing Che</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${escape(page.description)}" />`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/>/, `<meta property="og:title" content="${escape(page.title)} | Ningshing Che" />`)
    .replace(/<meta property="og:description" content="[^"]*"\s*\/>/, `<meta property="og:description" content="${escape(page.description)}" />`)
    .replace(/<meta property="og:url" content="[^"]*"\s*\/>/, `<meta property="og:url" content="https://ningshingche.com/${page.path}/" />`)
    .replace(/<main id="main" tabindex="-1">[\s\S]*?<\/main>/, `<main id="main" tabindex="-1"><article class="container container--narrow section prose"><h1>${escape(page.title)}</h1>\n${content}</article></main>`)
    .replace(/<noscript>[\s\S]*?<\/noscript>/, '');
  mkdirSync(`dist/${page.path}`, { recursive: true });
  writeFileSync(`dist/${page.path}/index.html`, html);
  console.log(`static page: /${page.path}/`);
}
