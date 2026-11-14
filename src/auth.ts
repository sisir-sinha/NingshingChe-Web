/**
 * User accounts.
 *
 * IMPORTANT — this is a browser-only implementation: accounts are kept in
 * localStorage on the visitor's own device (passwords as salted PBKDF2 hashes).
 * It makes the whole sign-up / sign-in flow work on a static host, but it is
 * not a real account system: nothing is shared between devices and a Google
 * sign-in is not verified by a server.
 *
 * To go live, keep the exported function signatures and replace their bodies
 * with calls to your backend (or Firebase / Supabase): register(), login(),
 * loginWithGoogle(), updateProfile(), logout() and currentUser().
 */
import { GOOGLE_CLIENT_ID } from './config';

export interface User {
  id: string;
  name: string;
  email: string;
  /** Image URL or data: URL; empty when the user has no picture */
  picture: string;
  provider: 'password' | 'google';
}

interface StoredUser extends User {
  salt?: string;
  hash?: string;
}

export class AuthError extends Error {
  constructor(public code: 'email-taken' | 'bad-credentials' | 'use-google' | 'storage' | 'google' | 'image') {
    super(code);
  }
}

const USERS_KEY = 'nc-users';
const SESSION_KEY = 'nc-session';
const listeners = new Set<(user: User | null) => void>();

function readUsers(): StoredUser[] {
  try {
    const list: unknown = JSON.parse(localStorage.getItem(USERS_KEY) ?? '[]');
    return Array.isArray(list) ? (list as StoredUser[]) : [];
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]): void {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {
    throw new AuthError('storage');
  }
}

function publicUser(u: StoredUser): User {
  return { id: u.id, name: u.name, email: u.email, picture: u.picture, provider: u.provider };
}

function setSession(id: string | null): void {
  try {
    if (id) localStorage.setItem(SESSION_KEY, id);
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    throw new AuthError('storage');
  }
  const user = currentUser();
  listeners.forEach((fn) => fn(user));
}

const normEmail = (email: string) => email.trim().toLowerCase();
const hex = (bytes: Uint8Array) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
const unhex = (text: string) => new Uint8Array((text.match(/../g) ?? []).map((h) => parseInt(h, 16)));

async function hashPassword(password: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: 150_000 }, key, 256);
  return hex(new Uint8Array(bits));
}

export function currentUser(): User | null {
  let id: string | null = null;
  try {
    id = localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
  if (!id) return null;
  const found = readUsers().find((u) => u.id === id);
  return found ? publicUser(found) : null;
}

/** Calls `fn` whenever someone signs in, signs out or edits their profile. */
export function onAuthChange(fn: (user: User | null) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function register(input: { name: string; email: string; password: string; picture: string }): Promise<User> {
  const users = readUsers();
  const email = normEmail(input.email);
  if (users.some((u) => u.email === email)) throw new AuthError('email-taken');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const user: StoredUser = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    email,
    picture: input.picture,
    provider: 'password',
    salt: hex(salt),
    hash: await hashPassword(input.password, salt),
  };
  writeUsers([...users, user]);
  setSession(user.id);
  return publicUser(user);
}

export async function login(emailInput: string, password: string): Promise<User> {
  const user = readUsers().find((u) => u.email === normEmail(emailInput));
  if (!user) throw new AuthError('bad-credentials');
  if (!user.hash || !user.salt) throw new AuthError('use-google');
  if ((await hashPassword(password, unhex(user.salt))) !== user.hash) throw new AuthError('bad-credentials');
  setSession(user.id);
  return publicUser(user);
}

export async function updateProfile(changes: { name?: string; picture?: string }): Promise<User> {
  const me = currentUser();
  if (!me) throw new AuthError('bad-credentials');
  const users = readUsers().map((u) =>
    u.id === me.id ? { ...u, name: changes.name?.trim() || u.name, picture: changes.picture ?? u.picture } : u,
  );
  writeUsers(users);
  setSession(me.id); // notifies listeners
  return currentUser()!;
}

export function logout(): void {
  setSession(null);
  window.google?.accounts.id.disableAutoSelect();
}

/** Fills empty name / e-mail inputs inside `root` with the signed-in user's details. */
export function prefillFromAccount(root: HTMLElement): void {
  const me = currentUser();
  if (!me) return;
  const fill = (selector: string, value: string) =>
    root.querySelectorAll<HTMLInputElement>(selector).forEach((input) => {
      if (!input.value) input.value = value;
    });
  fill('input[name="name"]', me.name);
  fill('input[name="email"]', me.email);
}

/* ---------- profile picture ---------- */

/** Crops the chosen image to a square and shrinks it so it is small enough to store. */
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

/* ---------- Google sign-in (Google Identity Services) ---------- */

interface GoogleIdApi {
  initialize(options: { client_id: string; callback: (response: { credential?: string }) => void; ux_mode?: 'popup' }): void;
  renderButton(parent: HTMLElement, options: Record<string, string | number>): void;
  disableAutoSelect(): void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdApi } };
  }
}

export const googleConfigured = GOOGLE_CLIENT_ID.trim() !== '';

let gsiScript: Promise<void> | undefined;
function loadGoogleScript(): Promise<void> {
  gsiScript ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      gsiScript = undefined;
      reject(new AuthError('google'));
    };
    document.head.appendChild(s);
  });
  return gsiScript;
}

/** Reads the profile out of the ID token Google hands back (base64url-encoded JSON). */
function decodeIdToken(token: string): { sub: string; email: string; name?: string; picture?: string } {
  const part = token.split('.')[1] ?? '';
  const bytes = Uint8Array.from(atob(part.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

export async function loginWithGoogle(idToken: string): Promise<User> {
  let profile: ReturnType<typeof decodeIdToken>;
  try {
    profile = decodeIdToken(idToken);
  } catch {
    throw new AuthError('google');
  }
  if (!profile.email || !profile.sub) throw new AuthError('google');
  const users = readUsers();
  const email = normEmail(profile.email);
  let user = users.find((u) => u.email === email);
  if (user) {
    // Same e-mail as an existing account: sign in to it and fill any gaps.
    user.picture ||= profile.picture ?? '';
    user.name ||= profile.name ?? email;
  } else {
    user = { id: `google-${profile.sub}`, name: profile.name ?? email.split('@')[0], email, picture: profile.picture ?? '', provider: 'google' };
    users.push(user);
  }
  writeUsers(users);
  setSession(user.id);
  return publicUser(user);
}

/**
 * Draws Google's own "Continue with Google" button inside `el`.
 * `onDone` runs once the visitor is signed in, `onError` if anything fails.
 */
export async function mountGoogleButton(el: HTMLElement, onDone: (user: User) => void, onError: (err: unknown) => void): Promise<void> {
  try {
    await loadGoogleScript();
    const api = window.google?.accounts.id;
    if (!api) throw new AuthError('google');
    api.initialize({
      client_id: GOOGLE_CLIENT_ID,
      ux_mode: 'popup',
      callback: (response) => {
        if (!response.credential) return onError(new AuthError('google'));
        loginWithGoogle(response.credential).then(onDone, onError);
      },
    });
    if (!el.isConnected) return;
    el.innerHTML = '';
    api.renderButton(el, {
      type: 'standard',
      theme: document.documentElement.dataset.theme === 'dark' ? 'filled_black' : 'outline',
      size: 'large',
      shape: 'pill',
      text: 'continue_with',
      logo_alignment: 'center',
      width: Math.min(400, Math.max(200, Math.floor(el.getBoundingClientRect().width))),
    });
  } catch (err) {
    onError(err);
  }
}
