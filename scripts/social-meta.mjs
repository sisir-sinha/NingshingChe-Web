// Generate crawler-readable pages for GitHub Pages. Social crawlers generally do
// not execute the SPA; metadata must be in the first HTML response, not just JS.
// Only published/public data is used. The daily Pages build refreshes snapshots.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import he from 'he';

const origin = (process.env.SITE_URL || 'https://ningshingche.com').replace(/\/+$/, '');
const base = (process.env.BASE_PATH || '/').replace(/^\/*|\/*$/g, '');
const root = resolve('dist');
const template = readFileSync(join(root, 'index.html'), 'utf8');
const api = process.env.VITE_SUPABASE_URL || 'https://slcpvmpsynkqdozvlsii.supabase.co';
const key = process.env.VITE_SUPABASE_KEY || 'sb_publishable_jqJACnQHmCMcGjt0kG6Sug_ddknIbAA';
const logo = 'https://surajit-singha-sisir.github.io/NingshingCheNew/NingshingChe-Logo.png';
const site = 'নিংশিং চে';
const siteDescription = 'ইমার ঠারে বিষ্ণুপ্রিয়া মণিপুরি সাহিত্য, সংস্কৃতি, ইতিহাস চর্চার অনলাইন প্লাটফর্ম নিংশিং চে';
const encode = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const plain = (s = '') => he.decode(String(s).replace(/<\s*(script|style)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, ' ').replace(/<[^>]*>/g, ' ')).replace(/\s+/gu, ' ').trim();
const short = (s, max = 200) => { const chars = Array.from(plain(s)); return chars.length > max ? chars.slice(0, max - 1).join('').trim() + '…' : chars.join(''); };
function imageUrl(value) {
  try {
    const url = new URL(value || logo, `${origin}/${base ? `${base}/` : ''}`);
    return url.protocol === 'https:' ? url.href : logo;
  } catch { return logo; }
}
function canonical(path) {
  const parts = [base, ...path.split('/')].filter(Boolean).map((p) => encodeURIComponent(p));
  return `${origin}/${parts.join('/')}${parts.length ? '/' : ''}`;
}
function validPath(path) {
  return path.split('/').filter(Boolean).every((part) => part !== '.' && part !== '..' && !/[\\\u0000-\u001f?#]/.test(part));
}
const metaTag = (html, attr, name, value) => {
  const tag = `<meta ${attr}="${name}" content="${encode(value)}" />`;
  const re = new RegExp(`<meta\\s+${attr}="${name}"[^>]*>`, 'i');
  return re.test(html) ? html.replace(re, () => tag) : html.replace('</head>', `  ${tag}\n  </head>`);
};
function markup(html, item) {
  const title = item.title || `${site} - বিষ্ণুপ্রিয়া মণিপুরি তথ্যকোষ`;
  const description = short(item.description) || siteDescription;
  const url = item.canonical || canonical(item.path);
  const image = imageUrl(item.image);
  html = html.replace(/<title>[\s\S]*?<\/title>/i, () => `<title>${encode(title)}</title>`);
  for (const [attribute, name, value] of [
    ['name', 'description', description], ['property', 'og:title', title], ['property', 'og:description', description],
    ['property', 'og:type', item.type || 'website'], ['property', 'og:url', url], ['property', 'og:image', image],
    ['property', 'og:image:alt', title], ['name', 'twitter:card', 'summary_large_image'], ['name', 'twitter:title', title],
    ['name', 'twitter:description', description], ['name', 'twitter:image', image], ['name', 'twitter:image:alt', title],
  ]) html = metaTag(html, attribute, name, value);
  html = html.replace(/<link\s+rel="canonical"[^>]*>/i, () => `<link rel="canonical" href="${encode(url)}" />`);
  if (item.private) html = metaTag(html, 'name', 'robots', 'noindex, nofollow');
  if (item.published && /^\d{4}-\d\d-\d\d/.test(item.published)) html = metaTag(html, 'property', 'article:published_time', item.published);
  return html;
}
async function rows(query) {
  let all = [], offset = 0;
  while (true) {
    const response = await fetch(`${api}/rest/v1/${query}`, { headers: { apikey: key, Range: `${offset}-${offset + 999}` }, signal: AbortSignal.timeout(30000) });
    if (response.status === 416 && offset > 0) return all;
    if (!response.ok) throw new Error(`Metadata fetch failed (${response.status}) for ${query.split('?')[0]}`);
    const batch = await response.json();
    if (!Array.isArray(batch)) throw new Error('Unexpected metadata response');
    all.push(...batch);
    if (batch.length < 1000) return all;
    offset += batch.length;
  }
}
function page(path, title, description, image, extras = {}) { return { path, title: `${title} | ${site}`, description, image, ...extras }; }
const fixed = [
  { path: '', title: `${site} - বিষ্ণুপ্রিয়া মণিপুরি তথ্যকোষ`, description: siteDescription },
  page('recent', 'সাম্প্রতিক', `সাম্প্রতিক লেখা — ${siteDescription}`),
  page('featured', 'ফিচার্ড', `নির্বাচিত লেখা — ${siteDescription}`),
  page('lekhok', 'লেখক', `আমাদের লেখক — ${siteDescription}`),
  page('pdf', 'পিডিএফ লেরিক', `পিডিএফ বই ও সাময়িকী — ${siteDescription}`),
  page('forum', 'ফোরাম', `আলোচনা ও মতবিনিময় — ${siteDescription}`),
  page('music', 'মিউজিক', `বিষ্ণুপ্রিয়া মণিপুরি গান শুনুন — ${siteDescription}`),
  page('about-us', 'আমার সম্পর্কে', siteDescription),
  page('social-activities', 'সামাজিক কার্যক্রম', siteDescription),
  page('blog_submission', 'লেখা জমাদান', `সম্পাদকের পর্যালোচনার জন্য লেখা জমা দিন — ${site}`),
  page('contact', 'Contact Us', 'Contact Ningshing Che with questions, feedback, contributions, or privacy and account requests.'),
  page('privacy-policy', 'Privacy Policy', 'How Ningshing Che collects, uses, stores and protects personal information.'),
  page('delete-account', 'Delete Your Ningshing Che Account', 'How to request deletion of your Ningshing Che account and associated personal data.'),
  page('login', 'লগইন', `নিংশিং চে অ্যাকাউন্টে লগইন করুন।`, '', { private: true }),
  page('register', 'নিবন্ধন', `নিংশিং চে অ্যাকাউন্ট তৈরি করুন।`, '', { private: true }),
  page('profile', 'প্রোফাইল', `নিংশিং চে অ্যাকাউন্ট।`, '', { private: true }),
  page('search', 'অনুসন্ধান', `নিংশিং চে-তে লেখা খুঁজুন।`, '', { private: true }),
];
try {
  const [blogs, authors, categories, books, discussions] = await Promise.all([
    rows('blogs?select=title,slug,image,seo_description,sub_title,content,published_date,created_at,author_name,category_title,tags&status=eq.Publish&order=published_date.desc'),
    rows('authors?select=title,description,image,designation'), rows('categories?select=title'),
    rows('pdf_books?select=id,title,image,book_published_date&order=book_published_date.desc'),
    rows('forum_discussions?select=id,title,body,cover_image_url&status=eq.Publish'),
  ]);
  const pages = [...fixed];
  for (const b of blogs) {
    const day = String(b.published_date || b.created_at || '').slice(0, 10);
    const slug = String(b.slug || '').normalize('NFC').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !slug || slug.includes('/')) continue;
    const path = `${day.slice(0, 4)}/${day.slice(5, 7)}/${slug}.kehem`;
    const desc = short(b.seo_description || b.sub_title || b.content) || `${b.title} — ${b.author_name || site}`;
    pages.push(page(path, b.title, desc, b.image, { type: 'article', published: b.published_date || b.created_at }));
  }
  for (const a of authors) {
    const name = String(a.title || '').normalize('NFC').trim(); if (!name || name.includes('/')) continue;
    pages.push(page(`author/${name}`, name, short(a.description) || `${name} — ${a.designation || site}`, a.image));
  }
  const names = new Set([...categories.map((c) => c.title), ...blogs.map((b) => b.category_title)].filter(Boolean).map((s) => String(s).normalize('NFC').trim()));
  for (const name of names) if (!name.includes('/')) pages.push(page(`category/${name}`, name, `${name} — ${siteDescription}`, blogs.find((b) => b.category_title?.normalize('NFC').trim() === name)?.image));
  const tags = new Set(blogs.flatMap((b) => Array.isArray(b.tags) ? b.tags : []).filter(Boolean).map((s) => String(s).normalize('NFC').trim()));
  for (const tag of tags) if (!tag.includes('/')) pages.push(page(`tag/${tag.replace(/ /g, '_')}`, tag, `${tag} — ${siteDescription}`, blogs.find((b) => b.tags?.includes(tag))?.image));
  const cover = readdirSync(join(root, 'assets')).find((name) => /^ningshingche-2026-cover-.*\.jpg$/i.test(name));
  pages.push(page('read_pdf/ningshingche-2026', 'নিংশিং চে - ২০২৬ সংখ্যা', 'নিংশিং চে ২০২৬ সংখ্যার পিডিএফ বই পড়ুন।', cover ? `/${base ? `${base}/` : ''}assets/${cover}` : ''));
  for (const b of books) pages.push(page(`read_pdf/${b.id}`, b.title, `${b.title} — নিংশিং চে পিডিএফ বই।`, b.image));
  for (const d of discussions) pages.push(page(`forum/${d.id}`, d.title, short(d.body) || `${d.title} — নিংশিং চে ফোরাম`, d.cover_image_url));
  const written = new Set();
  for (const item of pages) {
    if (!validPath(item.path)) { console.warn(`Skipping invalid metadata path: ${item.path}`); continue; }
    const directory = resolve(root, item.path);
    if (directory !== root && !directory.startsWith(root + sep)) throw new Error('Unsafe output path');
    if (written.has(directory)) { console.warn(`Skipping duplicate metadata path: ${item.path}`); continue; }
    written.add(directory);
    const dest = join(directory, 'index.html');
    const existing = existsSync(dest) ? readFileSync(dest, 'utf8') : template;
    let html = markup(existing, item);
    // Preserve the existing full legal pages and the root SPA shell.
    if (item.path && !existsSync(dest)) {
      const safeBody = `<main id="main" tabindex="-1"><section class="container section"><h1>${encode(item.title)}</h1><p>${encode(short(item.description) || siteDescription)}</p><p><a href="${encode(canonical(''))}">${site}</a></p></section></main>`;
      html = html.replace(/<main id="main" tabindex="-1">[\s\S]*?<\/main>/, () => safeBody);
    }
    mkdirSync(directory, { recursive: true }); writeFileSync(dest, html);
  }
  console.log(`social metadata: ${written.size} crawler-readable pages`);
} catch (error) {
  // Do not publish a new build that silently drops article share pages.
  console.error('social metadata: generation failed:', error.message);
  process.exitCode = 1;
}
