/**
 * Music player. One <audio> element lives for the whole visit, so a song keeps
 * playing while the reader moves between pages; a small bar at the bottom of the
 * screen controls it away from the Music page.
 *
 * Tracks come from public/data/music.json:
 *   [{ "id": "...", "title": "...", "artist": "...", "src": "/data/music/file.mp3", "cover": "", "duration": 123 }]
 * `src` and `cover` may be site paths (as above) or full URLs.
 */
import { SITE, T } from './strings';
import { B, esc, img } from './utils';

export interface Track {
  id: string;
  title: string;
  artist: string;
  src: string;
  cover?: string;
  /** seconds — only used to show a length before the file has loaded */
  duration?: number;
}

export interface PlayerState {
  tracks: Track[];
  index: number; // -1 until something is chosen
  playing: boolean;
  time: number;
  duration: number;
}

const audio = new Audio();
audio.preload = 'metadata';
let tracks: Track[] = [];
let index = -1;
let loading: Promise<Track[]> | undefined;
const listeners = new Set<(s: PlayerState) => void>();

const url = (path: string) => (path.startsWith('/') ? `${B}${path}` : path);

export function state(): PlayerState {
  const fallback = index >= 0 ? (tracks[index].duration ?? 0) : 0;
  return { tracks, index, playing: !audio.paused && !audio.ended, time: audio.currentTime, duration: Number.isFinite(audio.duration) ? audio.duration : fallback };
}
function emit(): void {
  const s = state();
  listeners.forEach((fn) => fn(s));
}
export function subscribe(fn: (s: PlayerState) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function loadTracks(): Promise<Track[]> {
  loading ??= fetch(`${B}/data/music.json`)
    .then((r) => (r.ok ? (r.json() as Promise<Track[]>) : []))
    .catch(() => [])
    .then((list) => (tracks = list));
  return loading;
}

export function coverUrl(t: Track): string {
  return t.cover ? img(url(t.cover), 400) : '';
}

function select(i: number): void {
  index = (i + tracks.length) % tracks.length;
  const t = tracks[index];
  audio.src = url(t.src);
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: t.title,
      artist: t.artist,
      album: SITE.name,
      artwork: [{ src: t.cover ? coverUrl(t) : SITE.logo }],
    });
  }
}

export function play(i: number): void {
  if (!tracks.length) return;
  if (i !== index) select(i);
  void audio.play().catch(() => emit());
  emit();
}
export function toggle(): void {
  if (index < 0) return play(0);
  if (audio.paused) void audio.play().catch(() => emit());
  else audio.pause();
}
export const next = () => play(index + 1);
export const prev = () => (audio.currentTime > 3 ? seek(0) : play(index - 1));
export function seek(seconds: number): void {
  audio.currentTime = seconds;
  emit();
}
export function setVolume(v: number): void {
  audio.volume = Math.min(1, Math.max(0, v));
}
export const volume = () => audio.volume;
export function stop(): void {
  audio.pause();
  audio.removeAttribute('src');
  audio.load();
  index = -1;
  emit();
}

['play', 'pause', 'timeupdate', 'loadedmetadata', 'durationchange', 'emptied'].forEach((ev) => audio.addEventListener(ev, emit));
audio.addEventListener('ended', () => {
  if (index < tracks.length - 1) next();
  else emit();
});
if ('mediaSession' in navigator) {
  navigator.mediaSession.setActionHandler('previoustrack', prev);
  navigator.mediaSession.setActionHandler('nexttrack', next);
}

export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`.replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[Number(d)]);
}

/* ---------- mini player (shown on every page except /music) ---------- */
let hideMini = false;
export function setMiniHidden(hidden: boolean): void {
  hideMini = hidden;
  emit();
}

export function initMiniPlayer(): void {
  const el = document.createElement('div');
  el.className = 'mini-player';
  el.hidden = true;
  el.setAttribute('role', 'region');
  el.setAttribute('aria-label', T.nowPlaying);
  el.innerHTML = `
    <a class="mini-player__info" href="${B}/music">
      <span class="mini-player__art"><i class="fa-solid fa-music" aria-hidden="true"></i></span>
      <span class="mini-player__text"><strong data-mp-title></strong><small data-mp-artist></small></span>
    </a>
    <button type="button" class="icon-btn icon-btn--plain" data-mp-toggle aria-label="${T.play}"><i class="fa-solid fa-play" aria-hidden="true"></i></button>
    <button type="button" class="icon-btn icon-btn--plain" data-mp-next aria-label="${T.nextTrack}"><i class="fa-solid fa-forward-step" aria-hidden="true"></i></button>
    <button type="button" class="icon-btn icon-btn--plain" data-mp-close aria-label="${T.close}"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
    <span class="mini-player__bar" aria-hidden="true"><span data-mp-bar></span></span>`;
  document.body.appendChild(el);
  const title = el.querySelector<HTMLElement>('[data-mp-title]')!;
  const artist = el.querySelector<HTMLElement>('[data-mp-artist]')!;
  const btn = el.querySelector<HTMLElement>('[data-mp-toggle]')!;
  const bar = el.querySelector<HTMLElement>('[data-mp-bar]')!;
  btn.addEventListener('click', toggle);
  el.querySelector('[data-mp-next]')!.addEventListener('click', next);
  el.querySelector('[data-mp-close]')!.addEventListener('click', stop);
  let shownIndex = -2;
  let shownPlaying: boolean | undefined;
  subscribe((s) => {
    const visible = s.index >= 0 && !hideMini;
    el.hidden = !visible;
    document.documentElement.classList.toggle('has-mini-player', visible);
    if (s.index < 0) return;
    if (s.index !== shownIndex) {
      shownIndex = s.index;
      title.textContent = s.tracks[s.index].title;
      artist.textContent = s.tracks[s.index].artist;
    }
    if (s.playing !== shownPlaying) {
      shownPlaying = s.playing;
      btn.innerHTML = `<i class="fa-solid ${s.playing ? 'fa-pause' : 'fa-play'}" aria-hidden="true"></i>`;
      btn.setAttribute('aria-label', s.playing ? T.pause : T.play);
    }
    bar.style.width = `${s.duration ? (s.time / s.duration) * 100 : 0}%`;
  });
}

export function artHtml(t: Track | undefined, cls = ''): string {
  const cover = t ? coverUrl(t) : '';
  return `<span class="art ${cls}">${cover ? `<img src="${esc(cover)}" alt="">` : '<i class="fa-solid fa-music" aria-hidden="true"></i>'}</span>`;
}
