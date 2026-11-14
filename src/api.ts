/**
 * Data layer.
 *
 * The content in /public/data is a static snapshot of ningshingche.com.
 * To plug in the live backend, only this file has to change: keep the
 * function signatures and return the same shapes (see types.ts).
 */
import type { Author, Category, Post, PostDetail, Site } from './types';
import { B } from './utils';

const cache = new Map<string, Promise<unknown>>();

function getJSON<T>(url: string): Promise<T> {
  let hit = cache.get(url) as Promise<T> | undefined;
  if (!hit) {
    hit = fetch(url).then((res) => {
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return res.json() as Promise<T>;
    });
    hit.catch(() => cache.delete(url)); // allow a retry after a failure
    cache.set(url, hit);
  }
  return hit;
}

export const getPosts = () => getJSON<Post[]>(`${B}/data/posts.json`);
export const getAuthors = () => getJSON<Author[]>(`${B}/data/authors.json`);
export const getSite = () => getJSON<Site>(`${B}/data/site.json`);

export async function getPostByPath(path: string): Promise<PostDetail | null> {
  const posts = await getPosts();
  const clean = path.trim().normalize('NFC');
  const post = posts.find((p) => p.path.normalize('NFC') === clean);
  if (!post) return null;
  return getJSON<PostDetail>(`${B}/data/posts/${post.id}.json`);
}

export async function getCategories(): Promise<Category[]> {
  const posts = await getPosts();
  const counts = new Map<string, number>();
  for (const p of posts) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
  return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

export async function getAuthor(name: string): Promise<Author | null> {
  const authors = await getAuthors();
  const clean = name.normalize('NFC');
  return authors.find((a) => a.name.normalize('NFC') === clean) ?? null;
}

/** Look posts up by path, keeping the requested order. */
export function pick(posts: Post[], paths: string[]): Post[] {
  const byPath = new Map(posts.map((p) => [p.path, p]));
  return paths.map((p) => byPath.get(p)).filter((p): p is Post => Boolean(p));
}

/**
 * Form endpoints. This static build has no backend, so both calls reject;
 * the forms catch that and tell the visitor honestly that nothing was sent.
 * Replace the bodies with real POST requests when the API is available, e.g.
 *
 *   const res = await fetch('/api/comments/', { method: 'POST', body: data });
 *   if (!res.ok) throw new Error(await res.text());
 */
export class BackendMissingError extends Error {
  constructor() {
    super('No backend is connected to this build.');
    this.name = 'BackendMissingError';
  }
}

export async function submitComment(_postPath: string, _data: FormData): Promise<void> {
  throw new BackendMissingError();
}

export async function submitArticle(_data: FormData): Promise<void> {
  throw new BackendMissingError();
}
