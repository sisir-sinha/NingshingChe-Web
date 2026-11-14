/**
 * User accounts, kept by Supabase Auth (the same accounts the Android app uses).
 *
 * - E-mail + password: the reader confirms the address from a mail Supabase sends.
 * - Google: the browser goes to Google and comes back signed in.
 * - Each account has a row in the `profiles` table (name, picture); the forum
 *   requires it, so it is created on first sign-in.
 * - Profile pictures are hosted on ImgBB; the profile row keeps the picture's
 *   address and its ImgBB delete link (`avatar_url`, `imgbb_delete_url`).
 */
import type { Session } from '@supabase/supabase-js';
import { IMGBB_KEY } from './config';
import { sb } from './supabase';
import { B } from './utils';

export interface User {
  id: string;
  name: string;
  email: string;
  /** Image URL; empty when the user has no picture */
  picture: string;
  provider: 'password' | 'google';
}

type Code = 'email-taken' | 'bad-credentials' | 'unconfirmed' | 'weak' | 'rate' | 'google' | 'image' | 'network';
export class AuthError extends Error {
  constructor(public code: Code) {
    super(code);
  }
}

const NEXT_KEY = 'nc-next';
const listeners = new Set<(user: User | null) => void>();
let me: User | null = null;
let profileReady: Promise<void> = Promise.resolve();

const emit = () => listeners.forEach((fn) => fn(me));

function fromSession(session: Session | null): User | null {
  const u = session?.user;
  if (!u) return null;
  const meta = (u.user_metadata ?? {}) as Record<string, string | undefined>;
  return {
    id: u.id,
    email: u.email ?? '',
    name: (meta.full_name || meta.name || (u.email ?? '').split('@')[0] || '').trim(),
    picture: meta.avatar_url || meta.picture || '',
    provider: u.app_metadata?.provider === 'google' ? 'google' : 'password',
  };
}

function translate(error: { message?: string; code?: string; status?: number }): AuthError {
  const text = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase();
  if (text.includes('not confirmed')) return new AuthError('unconfirmed');
  if (text.includes('invalid login') || text.includes('invalid_credentials')) return new AuthError('bad-credentials');
  if (text.includes('already registered') || text.includes('user_already_exists')) return new AuthError('email-taken');
  if (text.includes('weak') || text.includes('at least')) return new AuthError('weak');
  if (text.includes('rate limit') || error.status === 429) return new AuthError('rate');
  return new AuthError('network');
}

interface Hosted {
  url: string;
  deleteUrl: string;
}

/** Sends a picture (a data: URL) to ImgBB and returns where it now lives. */
async function uploadPicture(dataUrl: string, name: string): Promise<Hosted> {
  const body = new FormData();
  body.append('image', dataUrl.slice(dataUrl.indexOf(',') + 1)); // ImgBB takes the base64 part only
  body.append('name', name);
  try {
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(IMGBB_KEY)}`, { method: 'POST', body });
    const json = (await res.json()) as { success?: boolean; data?: { url?: string; delete_url?: string } };
    if (!res.ok || !json.success || !json.data?.url) throw new Error('imgbb');
    return { url: json.data.url, deleteUrl: json.data.delete_url ?? '' };
  } catch {
    throw new AuthError('image');
  }
}

/** Makes sure the account has its profile row, and takes name / picture from it. */
async function syncProfile(base: User, pictureDeleteUrl: string): Promise<void> {
  try {
    const { data } = await sb.from('profiles').select('name,avatar_url').eq('id', base.id).maybeSingle();
    let name = (data?.name as string | null) ?? '';
    let picture = (data?.avatar_url as string | null) ?? '';
    if (!data) {
      // First sign-in: start the profile from what was given when registering (or by Google).
      name ||= base.name;
      picture ||= base.picture;
      await sb.from('profiles').insert({ id: base.id, name, email: base.email, avatar_url: picture, imgbb_delete_url: pictureDeleteUrl });
    }
    if (me?.id === base.id) {
      me = { ...me, name: name || me.name, picture: picture || me.picture };
      emit();
    }
  } catch {
    /* the site still works signed in; the forum retries when posting */
  }
}

function setSession(session: Session | null): void {
  const next = fromSession(session);
  const changed = next?.id !== me?.id;
  if (!next) {
    me = null;
    profileReady = Promise.resolve();
  } else if (changed) {
    me = next;
    profileReady = syncProfile(next, String(session?.user.user_metadata?.imgbb_delete_url ?? ''));
  }
  if (changed) emit();
}

/** Call once before the first page is drawn. Restores the session kept in this browser. */
export async function initAuth(): Promise<void> {
  try {
    const { data } = await sb.auth.getSession();
    setSession(data.session);
  } catch {
    me = null;
  }
  // Supabase asks that nothing is awaited inside this callback, hence the timeout.
  sb.auth.onAuthStateChange((_event, session) => {
    window.setTimeout(() => setSession(session), 0);
  });
}

export const currentUser = (): User | null => me;

/** Resolves once the signed-in reader's profile row exists (needed before posting in the forum). */
export const whenProfileReady = (): Promise<void> => profileReady;

/** Calls `fn` whenever someone signs in, signs out or edits their profile. */
export function onAuthChange(fn: (user: User | null) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Creates an account. Returns the user when they are signed in at once, or
 * 'confirm' when Supabase has sent a confirmation mail that must be opened first.
 */
export async function register(input: { name: string; email: string; password: string; picture: string }): Promise<User | 'confirm'> {
  const name = input.name.trim();
  // The picture goes to ImgBB first; its address travels with the new account.
  const hosted = input.picture.startsWith('data:image/') ? await uploadPicture(input.picture, `avatar-${Date.now()}`) : null;
  const { data, error } = await sb.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: {
      data: { full_name: name, name, ...(hosted ? { avatar_url: hosted.url, imgbb_delete_url: hosted.deleteUrl } : {}) },
      emailRedirectTo: `${location.origin}${B}/`,
    },
  });
  if (error) throw translate(error);
  // With confirmation on, an address that already has an account comes back with no identities.
  if (data.user && !data.session && (data.user.identities ?? []).length === 0) throw new AuthError('email-taken');
  if (!data.session) return 'confirm';
  setSession(data.session);
  await profileReady;
  return me!;
}

export async function login(email: string, password: string): Promise<User> {
  const { data, error } = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error || !data.session) throw translate(error ?? {});
  setSession(data.session);
  await profileReady;
  return me!;
}

/** Sends the browser to Google; it returns to the site signed in. `next` is the page to open afterwards. */
export async function loginWithGoogle(next: string): Promise<void> {
  try {
    sessionStorage.setItem(NEXT_KEY, next);
  } catch {
    /* falls back to the home page */
  }
  const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${location.origin}${B}/` } });
  if (error) throw new AuthError('google');
}

/** After coming back from Google: the page the reader wanted, once. */
export function takeNext(): string | null {
  try {
    const next = sessionStorage.getItem(NEXT_KEY);
    sessionStorage.removeItem(NEXT_KEY);
    return me && next ? next : null;
  } catch {
    return null;
  }
}

/** `picture`: a data: URL for a new picture, '' to remove it, undefined to leave it. */
export async function updateProfile(changes: { name?: string; picture?: string }): Promise<User> {
  if (!me) throw new AuthError('bad-credentials');
  await profileReady;
  const name = changes.name?.trim() || me.name;
  let picture = me.picture;
  let hosted: Hosted | null = null;
  if (changes.picture === '') {
    picture = '';
    hosted = { url: '', deleteUrl: '' };
  } else if (changes.picture?.startsWith('data:image/')) {
    hosted = await uploadPicture(changes.picture, `avatar-${me.id}`);
    picture = hosted.url;
  }
  const { error } = await sb
    .from('profiles')
    .upsert({ id: me.id, name, email: me.email, ...(hosted ? { avatar_url: hosted.url, imgbb_delete_url: hosted.deleteUrl } : {}) });
  if (error) throw new AuthError('network');
  void sb.auth.updateUser({ data: { full_name: name, name, avatar_url: picture } });
  me = { ...me, name, picture };
  emit();
  return me;
}

export function logout(): void {
  me = null;
  profileReady = Promise.resolve();
  emit();
  void sb.auth.signOut();
}

/** Fills empty name / e-mail inputs inside `root` with the signed-in user's details. */
export function prefillFromAccount(root: HTMLElement): void {
  if (!me) return;
  const fill = (selector: string, value: string) =>
    root.querySelectorAll<HTMLInputElement>(selector).forEach((input) => {
      if (!input.value) input.value = value;
    });
  fill('input[name="name"]', me.name);
  fill('input[name="email"]', me.email);
}

export async function pictureFromFile(file: File, size = 256): Promise<string> {
  if (!file.type.startsWith('image/') || file.size > 8 * 1024 * 1024) throw new AuthError('image');
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new AuthError('image');
  }
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.85);
}
