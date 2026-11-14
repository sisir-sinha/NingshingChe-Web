// Writes public/sitemap.xml and public/robots.txt from the article data.
// Runs automatically before every build. Site address: SITE_URL (default https://ningshingche.com).
import { readFileSync, writeFileSync } from 'node:fs';

const origin = (process.env.SITE_URL || 'https://ningshingche.com').replace(/\/+$/, '');
const posts = JSON.parse(readFileSync('public/data/posts.json', 'utf8'));
const authors = JSON.parse(readFileSync('public/data/authors.json', 'utf8'));

const loc = (path) => origin + encodeURI(path).replace(/&/g, '&amp;');
const entry = (path, lastmod) => `  <url><loc>${loc(path)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`;

const pages = ['/', '/recent', '/featured', '/lekhok', '/pdf', '/forum', '/music', '/about-us', '/social-activities', '/blog_submission', '/privacy-policy'];
const categories = [...new Set(posts.map((p) => p.category).filter(Boolean))];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[
  ...pages.map((p) => entry(p)),
  ...categories.map((c) => entry(`/category/${c}`)),
  ...authors.map((a) => entry(`/author/${a.name}`)),
  ...posts.map((p) => entry(p.path, p.iso)),
].join('\n')}
</urlset>
`;
writeFileSync('public/sitemap.xml', xml);
writeFileSync('public/robots.txt', `User-agent: *\nAllow: /\nDisallow: /login\nDisallow: /register\nDisallow: /profile\n\nSitemap: ${origin}/sitemap.xml\n`);
console.log(`sitemap: ${pages.length + categories.length + authors.length + posts.length} URLs for ${origin}`);
