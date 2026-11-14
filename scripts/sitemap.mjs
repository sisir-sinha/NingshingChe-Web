// Writes public/sitemap.xml and public/robots.txt from what is published in Supabase.
// Runs automatically before every build (and the site is rebuilt once a day, so new
// articles reach the sitemap without anyone pushing code).
// Site address: SITE_URL (default https://ningshingche.com).
import { existsSync, writeFileSync } from 'node:fs';

const origin = (process.env.SITE_URL || 'https://ningshingche.com').replace(/\/+$/, '');
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://slcpvmpsynkqdozvlsii.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY || 'sb_publishable_jqJACnQHmCMcGjt0kG6Sug_ddknIbAA';

async function table(query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, { headers: { apikey: SUPABASE_KEY } });
  if (!res.ok) throw new Error(`${res.status} ${query}`);
  return res.json();
}

const loc = (path) => origin + encodeURI(path).replace(/&/g, '&amp;');
const entry = (path, lastmod) => `  <url><loc>${loc(path)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`;
const pages = ['/', '/recent', '/featured', '/lekhok', '/pdf', '/forum', '/music', '/about-us', '/social-activities', '/blog_submission', '/privacy-policy', '/delete-account'];

try {
  const [blogs, authors, books, threads] = await Promise.all([
    table('blogs?select=slug,published_date,created_at,updated_at,category_title&status=eq.Publish&order=published_date.desc'),
    table('authors?select=title'),
    table('pdf_books?select=id'),
    table('forum_discussions?select=id,updated_at&status=eq.Publish'),
  ]);
  const categories = [...new Set(blogs.map((b) => b.category_title).filter(Boolean))];
  const urls = [
    ...pages.map((p) => entry(p)),
    ...categories.map((c) => entry(`/category/${c}`)),
    ...authors.map((a) => entry(`/author/${a.title}`)),
    ...books.map((b) => entry(`/read_pdf/${b.id}`)),
    ...threads.map((t) => entry(`/forum/${t.id}`, (t.updated_at || '').slice(0, 10))),
    ...blogs.map((b) => {
      const day = (b.published_date || b.created_at || '').slice(0, 10);
      return entry(`/${day.slice(0, 4)}/${day.slice(5, 7)}/${b.slug}.kehem`, (b.updated_at || day).slice(0, 10));
    }),
  ];
  writeFileSync('public/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
  console.log(`sitemap: ${urls.length} URLs for ${origin}`);
} catch (err) {
  // The database could not be reached: keep the sitemap from the last build rather than fail the deploy.
  console.warn(`sitemap: not refreshed (${err.message})`);
  if (!existsSync('public/sitemap.xml')) {
    writeFileSync('public/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => entry(p)).join('\n')}\n</urlset>\n`);
  }
}
writeFileSync('public/robots.txt', `User-agent: *\nAllow: /\nDisallow: /login\nDisallow: /register\nDisallow: /profile\n\nSitemap: ${origin}/sitemap.xml\n`);
