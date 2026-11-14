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

## User accounts (login / register / profile)

Routes: `/login`, `/register` (name, e-mail, password, confirm password, profile picture), `/profile`.

- **Demo storage.** `src/auth.ts` keeps accounts in the visitor's browser (`localStorage`, passwords as salted PBKDF2 hashes). There is no server, so an account exists only on the device where it was created. To go live, keep the exported functions (`register`, `login`, `loginWithGoogle`, `updateProfile`, `logout`, `currentUser`) and replace their bodies with calls to your backend, Firebase Auth or Supabase. Then remove the "demo" line on the register page (`T.demoAccounts`).
- **Google login.** Create an OAuth 2.0 *Web application* client ID at <https://console.cloud.google.com/apis/credentials>, add each site address (e.g. `https://sisir-sinha.github.io`, `https://ningshingche.com`) under *Authorised JavaScript origins*, then paste the ID into `src/config.ts` (or build with `VITE_GOOGLE_CLIENT_ID=...`). Until then the Google button only shows a "not set up" message. A real backend must verify the Google ID token itself.

## Forum (`/forum`, `/forum/<id>`)

Signed-in users can start topics, reply, and delete their own posts. `src/forum.ts` stores everything in the visitor's browser (`localStorage`) — a demo, like the accounts. Replace the bodies of `listTopics`, `getTopic`, `createTopic`, `addReply`, `deleteTopic`, `deleteReply` with API calls to make it shared. Forum sections are listed in `FORUM_CATEGORIES`.

## Music (`/music`)

The playlist is `public/data/music.json`:

```json
[{ "id": "song-1", "title": "…", "artist": "…", "src": "/data/music/song-1.mp3", "cover": "/data/music/song-1.jpg", "duration": 215 }]
```

Put the audio files (MP3 recommended) in `public/data/music/`, or use full URLs in `src`/`cover`. `cover` and `duration` (seconds) are optional. The three `sample-*.wav` files are generated placeholder tones — delete them when real songs are added. Playback continues across pages with a mini player (`src/player.ts`).

## Navigation

Main menu items are in `NAV` (shown as a row under the logo) and the categories listed under "আরাকউ" in `CATEGORIES`, both at the top of `src/components/header.ts`.

## Privacy policy (`/privacy-policy`)

The text is in `src/content/privacy.md` (headings, bullets, numbered lists, **bold** and links are supported). Linked from the footer and the register page.

## Custom domain

The site is served from **https://ningshingche.com** (GitHub Pages custom domain, set in *Settings → Pages*; `public/CNAME` records it). The workflow reads the base path from GitHub on every run, so the same build works on the domain root and on `github.io/<repo>/` — but a new run is needed after the domain is added or removed (push a commit or use *Run workflow*). `npm run build` also writes `sitemap.xml` and `robots.txt` (`scripts/sitemap.mjs`, address from `SITE_URL`).
