import { currentUser } from '../auth';
import { createPlaylist, deletePlaylist, changePlaylistTrack, loadLoves, loadPlaylists, setLove } from '../music-library';
import type { MusicPlaylist } from '../music-library';
import { artHtml, clock, loadTracks, next, play, prev, seek, setMiniHidden, setQueue, setVolume, state, subscribe, toggle, volume } from '../player';
import type { PlayerState, Track } from '../player';
import { SITE, T } from '../strings';
import type { View } from '../types';
import { B, bn, debounce, esc, fold, toast } from '../utils';
import { pageHead } from './listing';

export async function musicPage(): Promise<View> {
  const tracks = await loadTracks();
  const user = currentUser();
  let loves = new Set<string>();
  let playlists: MusicPlaylist[] = [];
  let libraryFailed = false;
  try { loves = await loadLoves(user?.id); } catch { libraryFailed = true; }
  if (user) try { playlists = await loadPlaylists(user.id); } catch { libraryFailed = true; }

  const options = (values: string[]) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'bn')).map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
  return {
    title: `${T.music} | ${SITE.name}`,
    description: T.musicSub,
    html: `${pageHead(T.music, 'fa-solid fa-headphones', T.music, T.musicSub)}
    <section class="container music section">
      ${tracks.length ? `<div class="music__layout">
        <div class="deck" data-deck>
          <div class="deck__art" data-art>${artHtml(tracks[0], 'art--xl')}</div>
          <p class="deck__kicker">${T.nowPlaying}</p>
          <h2 class="deck__title" data-title>${esc(tracks[0].title)}</h2>
          <p class="deck__artist" data-artist>${esc(tracks[0].artist)}</p>
          <p class="deck__album" data-album>${esc(tracks[0].album)}</p>
          <button type="button" class="music-love music-love--deck" data-deck-love aria-label="গানটি পছন্দ করুন"><i class="fa-regular fa-heart" aria-hidden="true"></i> <span></span></button>
          <div class="deck__seek"><span data-time>${clock(0)}</span><input type="range" min="0" max="1000" value="0" step="1" data-seek aria-label="${T.seek}"><span data-duration>${clock(0)}</span></div>
          <div class="deck__controls">
            <button type="button" class="deck__btn" data-prev aria-label="${T.prevTrack}"><i class="fa-solid fa-backward-step"></i></button>
            <button type="button" class="deck__btn deck__btn--main" data-toggle aria-label="${T.play}"><i class="fa-solid fa-play"></i></button>
            <button type="button" class="deck__btn" data-next aria-label="${T.nextTrack}"><i class="fa-solid fa-forward-step"></i></button>
          </div>
          <label class="deck__volume"><i class="fa-solid fa-volume-low"></i><input type="range" min="0" max="100" value="${Math.round(volume() * 100)}" data-volume aria-label="${T.volume}"><i class="fa-solid fa-volume-high"></i></label>
        </div>
        <div class="music-library">
          <div class="music-library__heading"><div><p class="music-library__eyebrow">আপনার গানের সংগ্রহ</p><h2 class="section-title">সব গান <small data-count></small></h2></div></div>
          <label class="playlist__search"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><input type="search" data-search placeholder="গান, শিল্পী, অ্যালবাম খুঁজুন" aria-label="গান খুঁজুন"></label>
          <div class="music-filters">
            <label>শিল্পী<select data-artist-filter><option value="">সব শিল্পী</option>${options(tracks.map((t) => t.artist))}</select></label>
            <label>অ্যালবাম<select data-album-filter><option value="">সব অ্যালবাম</option>${options(tracks.map((t) => t.album))}</select></label>
            <label>ক্যাটাগরি<select data-category-filter><option value="">সব ক্যাটাগরি</option>${options(tracks.map((t) => t.genre))}</select></label>
            <label>সাজান<select data-sort><option value="default">সাধারণ ক্রম</option><option value="newest">নতুন আগে</option><option value="title">গানের নাম</option><option value="artist">শিল্পীর নাম</option><option value="loves">সর্বাধিক পছন্দ</option></select></label>
          </div>
          <div class="music-library__tools">
            <label>সংগ্রহ <select data-collection><option value="all">সব গান</option><option value="loved">পছন্দের গান</option></select></label>
            ${user ? `<button class="btn btn--ghost" type="button" data-create-playlist><i class="fa-solid fa-plus"></i> নতুন প্লেলিস্ট</button><button class="btn btn--ghost" type="button" data-delete-playlist hidden><i class="fa-regular fa-trash-can"></i> প্লেলিস্ট মুছুন</button>` : `<a href="${B}/login?next=${encodeURIComponent('/music')}">প্লেলিস্টের জন্য লগইন করুন</a>`}
          </div>
          ${libraryFailed ? '<p class="music-notice" role="status">সংগ্রহ লোড করা যায়নি। আবার চেষ্টা করতে পেজ রিফ্রেশ করুন।</p>' : ''}
          <p class="forum__empty" data-none hidden>${T.noSongsFound}</p>
          <ol class="music-tracks" data-list></ol>
          <section class="music-related" data-related hidden><h2 class="section-title">সম্পর্কিত গান</h2><div data-related-list></div></section>
        </div>
      </div>` : `<p class="forum__empty">${T.noTracks}</p>`}
    </section>`,
    mount(root) {
      if (!tracks.length) return;
      const $ = <E extends HTMLElement>(selector: string) => root.querySelector<E>(selector)!;
      const list = $('[data-list]');
      const collection = $<HTMLSelectElement>('[data-collection]');
      const select = (name: string) => $<HTMLSelectElement>(`[data-${name}]`);
      const seekEl = $<HTMLInputElement>('[data-seek]');
      let dragging = false;
      let shown = -2;
      let alive = true;
      let visible: number[] = [];
      const locked = new Set<string>();
      const selectedPlaylist = () => playlists.find((p) => p.id === collection.value);
      function updateCollections(): void {
        const selected = collection.value;
        collection.innerHTML = `<option value="all">সব গান</option><option value="loved">পছন্দের গান</option>${playlists.map((p) => `<option value="${esc(p.id)}">${esc(p.title)}</option>`).join('')}`;
        collection.value = [...collection.options].some((o) => o.value === selected) ? selected : 'all';
        const del = root.querySelector<HTMLElement>('[data-delete-playlist]');
        if (del) del.hidden = !selectedPlaylist();
      }
      const loveIcon = (t: Track) => `<i class="fa-${loves.has(t.id) ? 'solid' : 'regular'} fa-heart" aria-hidden="true"></i> <span>${bn(t.loves)}</span>`;
      function row(t: Track, i: number, related = false): string {
        const current = state().index === i;
        const playlist = selectedPlaylist();
        return `<li class="music-track${current ? ' is-current' : ''}">
          <button type="button" class="music-track__play" data-play="${i}" aria-label="${esc(t.title)} — ${T.play}">${artHtml(t, '', true)}<span class="music-track__name"><strong>${esc(t.title)}</strong><small>${esc(t.artist || 'অজানা শিল্পী')}${t.album ? ` · ${esc(t.album)}` : ''}</small></span></button>
          <span class="music-track__duration">${t.duration ? clock(t.duration) : ''}</span>
          <button type="button" class="music-love${loves.has(t.id) ? ' is-loved' : ''}" data-love="${i}" aria-label="${loves.has(t.id) ? 'পছন্দ সরান' : 'পছন্দ করুন'}" aria-pressed="${loves.has(t.id)}">${loveIcon(t)}</button>
          ${user && !related ? playlist?.tracks.has(t.id) ? `<button class="music-track__remove" type="button" data-remove="${i}" title="প্লেলিস্ট থেকে সরান" aria-label="প্লেলিস্ট থেকে সরান"><i class="fa-solid fa-minus"></i></button>` : playlists.length ? `<label class="music-track__add"><span class="sr-only">প্লেলিস্টে যোগ করুন</span><select data-add="${i}" aria-label="${esc(t.title)} প্লেলিস্টে যোগ করুন"><option value="">＋ প্লেলিস্ট</option>${playlists.filter((p) => !p.tracks.has(t.id)).map((p) => `<option value="${esc(p.id)}">${esc(p.title)}</option>`).join('')}</select></label>` : '' : ''}
        </li>`;
      }
      function render(): void {
        const q = fold($<HTMLInputElement>('[data-search]').value.trim());
        const artist = select('artist-filter').value, album = select('album-filter').value, category = select('category-filter').value;
        const playlist = selectedPlaylist();
        visible = tracks.map((_, i) => i).filter((i) => {
          const t = tracks[i];
          return (!q || fold(t.searchText).includes(q)) && (!artist || t.artist === artist) && (!album || t.album === album) && (!category || t.genre === category) && (collection.value !== 'loved' || loves.has(t.id)) && (!playlist || playlist.tracks.has(t.id));
        });
        const sort = select('sort').value;
        if (sort === 'newest') visible.sort((a, b) => tracks[b].createdAt.localeCompare(tracks[a].createdAt));
        if (sort === 'title') visible.sort((a, b) => tracks[a].title.localeCompare(tracks[b].title, 'bn'));
        if (sort === 'artist') visible.sort((a, b) => tracks[a].artist.localeCompare(tracks[b].artist, 'bn') || tracks[a].title.localeCompare(tracks[b].title, 'bn'));
        if (sort === 'loves') visible.sort((a, b) => tracks[b].loves - tracks[a].loves);
        setQueue(visible);
        $('[data-count]').textContent = `(${bn(visible.length)})`;
        $('[data-none]').hidden = visible.length > 0;
        list.innerHTML = visible.map((i) => row(tracks[i], i)).join('');
        renderRelated();
      }
      function renderRelated(): void {
        const idx = state().index;
        const related = $('[data-related]');
        if (idx < 0) { related.hidden = true; return; }
        const current = tracks[idx];
        const picks = tracks.map((t, i) => ({ i, score: (t.artist && t.artist === current.artist ? 3 : 0) + (t.album && t.album === current.album ? 4 : 0) + (t.genre && t.genre === current.genre ? 2 : 0) })).filter((x) => x.i !== idx && x.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);
        related.hidden = picks.length === 0;
        $('[data-related-list]').innerHTML = `<ol class="music-tracks">${picks.map(({ i }) => row(tracks[i], i, true)).join('')}</ol>`;
      }
      function paint(s: PlayerState): void {
        const i = Math.max(0, s.index), t = tracks[i];
        if (!t) return;
        if (s.index !== shown) {
          shown = s.index;
          $('[data-title]').textContent = t.title;
          $('[data-artist]').textContent = t.artist;
          $('[data-album]').textContent = t.album;
          $('[data-art]').innerHTML = artHtml(t, 'art--xl');
          root.querySelectorAll<HTMLElement>('.music-track').forEach((el) => el.classList.toggle('is-current', Number(el.querySelector<HTMLElement>('[data-play]')?.dataset.play) === s.index));
          renderRelated();
        }
        const heart = $('[data-deck-love]');
        heart.innerHTML = loveIcon(t); heart.classList.toggle('is-loved', loves.has(t.id)); heart.setAttribute('aria-pressed', String(loves.has(t.id)));
        const button = $('[data-toggle]');
        button.innerHTML = `<i class="fa-solid ${s.playing ? 'fa-pause' : 'fa-play'}" aria-hidden="true"></i>`;
        button.setAttribute('aria-label', s.playing ? T.pause : T.play);
        const duration = s.duration || t.duration || 0;
        $('[data-duration]').textContent = clock(duration);
        if (!dragging) { $('[data-time]').textContent = clock(s.time); seekEl.value = String(duration ? Math.round(s.time / duration * 1000) : 0); seekEl.style.setProperty('--fill', `${duration ? s.time / duration * 100 : 0}%`); }
      }
      async function react(i: number): Promise<void> {
        const t = tracks[i]; if (!t || locked.has(t.id)) return;
        locked.add(t.id);
        try { const loved = !loves.has(t.id); t.loves = await setLove(t.id, loved); if (loved) loves.add(t.id); else loves.delete(t.id); if (alive) { render(); paint(state()); } }
        catch { toast('পছন্দ সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।'); }
        finally { locked.delete(t.id); }
      }
      root.addEventListener('click', async (event) => {
        const el = event.target as Element;
        const playButton = el.closest<HTMLElement>('[data-play]');
        if (playButton) { const i = Number(playButton.dataset.play); if (state().index === i) toggle(); else play(i); return; }
        const loveButton = el.closest<HTMLElement>('[data-love]');
        if (loveButton) { await react(Number(loveButton.dataset.love)); return; }
        if (el.closest('[data-deck-love]')) { await react(Math.max(0, state().index)); return; }
        const remove = el.closest<HTMLElement>('[data-remove]');
        if (remove) {
          const p = selectedPlaylist(), t = tracks[Number(remove.dataset.remove)]; if (!p || !t) return;
          try { await changePlaylistTrack(p.id, t.id, false); p.tracks.delete(t.id); if (alive) render(); toast('প্লেলিস্ট থেকে সরানো হয়েছে।'); } catch { toast('পরিবর্তন সংরক্ষণ করা যায়নি।'); }
        }
      });
      root.addEventListener('change', async (event) => {
        const target = event.target as HTMLSelectElement;
        if (target.matches('[data-add]') && target.value) {
          const p = playlists.find((x) => x.id === target.value), t = tracks[Number(target.dataset.add)];
          if (!p || !t) return;
          target.disabled = true;
          try { await changePlaylistTrack(p.id, t.id, true); p.tracks.add(t.id); if (alive) render(); toast('প্লেলিস্টে যোগ হয়েছে।'); } catch { target.disabled = false; target.value = ''; toast('প্লেলিস্টে যোগ করা যায়নি।'); }
        }
      });
      root.querySelector('[data-create-playlist]')?.addEventListener('click', async () => {
        const title = window.prompt('নতুন প্লেলিস্টের নাম লিখুন:')?.trim();
        if (!title || !user) return;
        if (title.length > 100) { toast('নাম সর্বোচ্চ ১০০ অক্ষরের হতে পারে।'); return; }
        try { await createPlaylist(user.id, title); playlists = await loadPlaylists(user.id); if (alive) { updateCollections(); render(); } toast('প্লেলিস্ট তৈরি হয়েছে।'); } catch { toast('প্লেলিস্ট তৈরি করা যায়নি।'); }
      });
      root.querySelector('[data-delete-playlist]')?.addEventListener('click', async () => {
        const p = selectedPlaylist(); if (!p || !window.confirm(`“${p.title}” প্লেলিস্টটি মুছবেন?`)) return;
        try { await deletePlaylist(p.id); playlists = playlists.filter((x) => x.id !== p.id); if (alive) { updateCollections(); render(); } toast('প্লেলিস্ট মুছে ফেলা হয়েছে।'); } catch { toast('প্লেলিস্ট মুছে ফেলা যায়নি।'); }
      });
      for (const name of ['artist-filter', 'album-filter', 'category-filter', 'sort', 'collection']) select(name).addEventListener('change', () => { updateCollections(); render(); });
      $<HTMLInputElement>('[data-search]').addEventListener('input', debounce(() => render(), 120));
      $('[data-toggle]').addEventListener('click', () => { if (state().index < 0) { if (visible.length) play(visible[0]); } else toggle(); });
      $('[data-next]').addEventListener('click', next);
      $('[data-prev]').addEventListener('click', prev);
      seekEl.addEventListener('input', () => { dragging = true; seekEl.style.setProperty('--fill', `${Number(seekEl.value) / 10}%`); });
      seekEl.addEventListener('change', () => { dragging = false; const s = state(); if (s.index >= 0) seek(Number(seekEl.value) / 1000 * s.duration); });
      $<HTMLInputElement>('[data-volume]').addEventListener('input', (e) => setVolume(Number((e.target as HTMLInputElement).value) / 100));
      updateCollections(); render(); setMiniHidden(true);
      const off = subscribe(paint); paint(state());
      return () => { alive = false; off(); setMiniHidden(false); };
    },
  };
}
