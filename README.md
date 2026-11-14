# নিংশিং চে — redesign

Vanilla TypeScript single-page app (no framework) for ningshingche.com.

- **Routing:** History API (`pushState` / `popstate`) — clean URLs, no `#`. See `src/router.ts`.
- **Sliders:** Swiper (hero, featured, videos, authors, PDF shelf).
- **Icons:** Font Awesome via CDN (`index.html`).
- **Typeface:** Mekholi, loaded from the Mekholi-Fonts GitHub Pages site (`@font-face` rules in `src/styles/base.css`).
- **Build tool:** Vite. Light/dark theme, mobile-first layout.

## Run

```bash
npm install
npm run dev        # development server  → http://localhost:5173
npm run build      # type-check + production build into dist/
npm start          # serve dist/ with SPA fallback → http://localhost:4173
```

## Routes

| URL | Page |
| --- | --- |
| `/` (`?page=2`) | Home |
| `/2025/06/slug.kehem` | Article (same URLs as the current site) |
| `/category/:name`, `/tag/:name` | Listings |
| `/featured` (also `/ফিচার্ড`), `/recent` | Listings |
| `/author/:name`, `/lekhok` | Author profile, all authors |
| `/pdf`, `/read_pdf/:id` | PDF shelf, reader |
| `/search?q=` | Search |
| `/about-us`, `/blog_submission`, `/social-activities` | Static pages |
| anything else | 404 page |

## Deploying (important for History API routing)

The server must return `index.html` for every path that is not a real file,
otherwise refreshing a deep link gives a 404.

- **GitHub Pages:** `.github/workflows/deploy-pages.yml` builds and publishes on every push to `main`.
  It sets `BASE_PATH` automatically (`/NingshingChe-Web/` on github.io, `/` with a custom domain)
  and copies `index.html` to `404.html` so deep links load. Note that GitHub Pages answers those
  deep links with HTTP status 404, which search engines and link previews may not like.
- **Sub-folder hosting elsewhere:** `BASE_PATH=/folder/ npm run build`.
- **Node:** `npm start` (`server.mjs`, no dependencies).
- **Apache:** `public/.htaccess` is copied into `dist/` automatically.
- **Netlify / Cloudflare Pages:** `public/_redirects` is included.
- **Nginx:** `location / { try_files $uri /index.html; }`
- **Django (current backend):** add a catch-all URL pattern that renders `dist/index.html`.

## Project layout

```
index.html              shell, fonts, Font Awesome CDN
server.mjs              production static server with SPA fallback
public/data/            content snapshot (JSON) taken from the live site
src/main.ts             route table + bootstrap
src/router.ts           History API router
src/api.ts              data layer — the only file to change for a real API
src/strings.ts          all interface text in one place
src/sliders.ts          Swiper setup
src/components/         header, footer, cards, sidebar widgets
src/pages/              one module per page
src/styles/             base / layout / components / pages CSS
```

## Connecting the backend

`public/data` is a static snapshot (50 articles, 27 authors, 6 PDFs).
Swap the functions in `src/api.ts` for real endpoints and keep the shapes in `src/types.ts`.

The comment form and the article-submission form validate input but do **not**
send anything yet: `submitComment()` and `submitArticle()` in `src/api.ts`
are stubs that need your POST endpoints (and CSRF token).

## Accounts, forum, music

All three use Supabase — see “Supabase (live data)” at the end of this file. Code: `src/auth.ts`, `src/forum.ts`, `src/player.ts`.

## Navigation

Main menu items are in `NAV` (shown as a row under the logo) and the categories listed under "আরাকউ" in `CATEGORIES`, both at the top of `src/components/header.ts`.

## Account deletion (`/delete-account`)

The text is in `src/content/delete-account.md` (same format as the privacy policy). Linked from the footer and the privacy policy. Use `https://ningshingche.com/delete-account` as the account deletion URL in Google Play.

## Privacy policy (`/privacy-policy`)

The text is in `src/content/privacy.md` (headings, bullets, numbered lists, **bold** and links are supported). Linked from the footer and the register page.

## Custom domain

The site is served from **https://ningshingche.com** (GitHub Pages custom domain, set in *Settings → Pages*; `public/CNAME` records it). The workflow reads the base path from GitHub on every run, so the same build works on the domain root and on `github.io/<repo>/` — but a new run is needed after the domain is added or removed (push a commit or use *Run workflow*). `npm run build` also writes `sitemap.xml` and `robots.txt` (`scripts/sitemap.mjs`, address from `SITE_URL`).

## Supabase (live data)

The site reads and writes everything through Supabase; there are no content files in this repository any more.

| What | Where in Supabase |
|---|---|
| Articles, categories, authors | `blogs` (status `Publish`), `categories`, `authors` |
| Home slider / featured / special picks | `blogs.is_slider`, `is_feature`, `is_special_article` |
| PDF books, videos, sidebar banner | `pdf_books`, `videos`, `settings.ad_image_url` / `ad_link_url` |
| Music | `music_tracks` |
| Comments | `comments` (sent as `Unpublish`, shown once published in the dashboard) |
| Article submissions | `submitted_blogs` (sent as `Pending`) |
| Forum | `forum_*` tables through the `forum_*` database functions |
| Accounts | Supabase Auth (e-mail + password, Google) and `profiles`; pictures are uploaded to ImgBB (`IMGBB_KEY` in `src/config.ts`) |
| View counts | `content_view_record()` |

- Connection settings: `src/config.ts` (project URL and **publishable** key — both public by design). Never add the database password or a secret key to this project.
- Access rules live in the database (row-level security). `src/sanitize.ts` cleans all HTML that comes from the database before it is shown.
- Changes made in the dashboard appear on the site on the next page load. The sitemap is rebuilt from the database on every deploy and once a day by the scheduled workflow.
- SQL that was applied for the website is kept in `supabase/`.
- In Supabase → Authentication → URL Configuration, set **Site URL** to `https://ningshingche.com` and add `https://ningshingche.com/**` to **Redirect URLs**.
