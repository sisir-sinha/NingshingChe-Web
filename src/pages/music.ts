import { getPosts } from '../api';
import { postCard } from '../components/cards';
import { artHtml, clock, loadTracks, next, play, prev, seek, setMiniHidden, setVolume, state, subscribe, toggle, volume } from '../player';
import type { PlayerState } from '../player';
import { SITE, T } from '../strings';
import type { View } from '../types';
import { bn, esc } from '../utils';
import { pageHead } from './listing';

const SONG_CATEGORY = 'ইমার ঠারর এলা';

export async function musicPage(): Promise<View> {
  const [tracks, posts] = await Promise.all([loadTracks(), getPosts()]);
  const songs = posts.filter((p) => p.category === SONG_CATEGORY).slice(0, 3);

  return {
    title: `${T.music} | ${SITE.name}`,
    description: T.musicSub,
    html: `${pageHead(T.music, 'fa-solid fa-headphones', T.music, T.musicSub)}
    <section class="container music section">
      ${
        tracks.length
          ? `<div class="music__layout">
          <div class="deck" data-deck>
            <div class="deck__art" data-art>${artHtml(tracks[0], 'art--xl')}</div>
            <p class="deck__kicker">${T.nowPlaying}</p>
            <h2 class="deck__title" data-title>${esc(tracks[0].title)}</h2>
            <p class="deck__artist" data-artist>${esc(tracks[0].artist)}</p>
            <div class="deck__seek">
              <span data-time>${clock(0)}</span>
              <input type="range" min="0" max="1000" value="0" step="1" data-seek aria-label="${T.seek}">
              <span data-duration>${clock(tracks[0].duration ?? 0)}</span>
            </div>
            <div class="deck__controls">
              <button type="button" class="deck__btn" data-prev aria-label="${T.prevTrack}"><i class="fa-solid fa-backward-step" aria-hidden="true"></i></button>
              <button type="button" class="deck__btn deck__btn--main" data-toggle aria-label="${T.play}"><i class="fa-solid fa-play" aria-hidden="true"></i></button>
              <button type="button" class="deck__btn" data-next aria-label="${T.nextTrack}"><i class="fa-solid fa-forward-step" aria-hidden="true"></i></button>
            </div>
            <label class="deck__volume"><i class="fa-solid fa-volume-low" aria-hidden="true"></i>
              <input type="range" min="0" max="100" value="${Math.round(volume() * 100)}" data-volume aria-label="${T.volume}">
              <i class="fa-solid fa-volume-high" aria-hidden="true"></i>
            </label>
          </div>
          <div class="playlist">
            <h2 class="section-title">${T.playlist} <small>(${bn(tracks.length)})</small></h2>
            <ol class="playlist__list">
              ${tracks
                .map(
                  (t, i) => `<li><button type="button" class="track" data-track="${i}">
                    <span class="track__num"><span>${bn(i + 1)}</span><i class="fa-solid fa-play" aria-hidden="true"></i></span>
                    ${artHtml(t)}
                    <span class="track__text"><strong>${esc(t.title)}</strong><small>${esc(t.artist)}</small></span>
                    <span class="track__time">${t.duration ? clock(t.duration) : ''}</span>
                  </button></li>`,
                )
                .join('')}
            </ol>
          </div>
        </div>`
          : `<p class="forum__empty">${T.noTracks}</p>`
      }
    </section>
    ${
      songs.length
        ? `<section class="band section"><div class="container">
            <div class="section-head"><h2 class="section-title">${T.songPosts}</h2></div>
            <div class="grid grid--3">${songs.map((p) => postCard(p, { excerpt: false })).join('')}</div>
          </div></section>`
        : ''
    }`,
    mount(root) {
      if (!tracks.length) return;
      const $ = <E extends HTMLElement>(sel: string) => root.querySelector<E>(sel)!;
      const seekEl = $<HTMLInputElement>('[data-seek]');
      const toggleBtn = $('[data-toggle]');
      const rows = [...root.querySelectorAll<HTMLElement>('[data-track]')];
      let dragging = false;
      let shown = -2;

      const paint = (s: PlayerState) => {
        const i = Math.max(0, s.index);
        if (i !== shown) {
          shown = i;
          $('[data-title]').textContent = s.tracks[i].title;
          $('[data-artist]').textContent = s.tracks[i].artist;
          $('[data-art]').innerHTML = artHtml(s.tracks[i], 'art--xl');
        }
        rows.forEach((row, n) => {
          row.classList.toggle('is-current', n === s.index);
          row.classList.toggle('is-playing', n === s.index && s.playing);
          if (n === s.index) row.setAttribute('aria-current', 'true');
          else row.removeAttribute('aria-current');
        });
        root.querySelector('[data-deck]')!.classList.toggle('is-playing', s.playing);
        toggleBtn.innerHTML = `<i class="fa-solid ${s.playing ? 'fa-pause' : 'fa-play'}" aria-hidden="true"></i>`;
        toggleBtn.setAttribute('aria-label', s.playing ? T.pause : T.play);
        const duration = s.duration || s.tracks[i].duration || 0;
        $('[data-duration]').textContent = clock(duration);
        if (!dragging) {
          $('[data-time]').textContent = clock(s.time);
          seekEl.value = String(duration ? Math.round((s.time / duration) * 1000) : 0);
          seekEl.style.setProperty('--fill', `${duration ? (s.time / duration) * 100 : 0}%`);
        }
      };

      toggleBtn.addEventListener('click', toggle);
      $('[data-next]').addEventListener('click', next);
      $('[data-prev]').addEventListener('click', prev);
      rows.forEach((row) =>
        row.addEventListener('click', () => {
          const i = Number(row.dataset.track);
          if (i === state().index) toggle();
          else play(i);
        }),
      );
      seekEl.addEventListener('input', () => {
        dragging = true;
        seekEl.style.setProperty('--fill', `${Number(seekEl.value) / 10}%`);
      });
      seekEl.addEventListener('change', () => {
        dragging = false;
        const s = state();
        if (s.index < 0) return;
        seek((Number(seekEl.value) / 1000) * s.duration);
      });
      $<HTMLInputElement>('[data-volume]').addEventListener('input', (e) => setVolume(Number((e.target as HTMLInputElement).value) / 100));

      setMiniHidden(true);
      const off = subscribe(paint);
      paint(state());
      return () => {
        off();
        setMiniHidden(false);
      };
    },
  };
}
