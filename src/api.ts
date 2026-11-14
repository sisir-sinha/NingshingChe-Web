/**
 * Data layer. Everything comes from the Supabase database, so what is published
 * in the dashboard shows on the site straight away (no rebuild needed).
 * Pages only use the functions below and the shapes in types.ts.
 */
import { sanitizeHtml } from './sanitize';
import { sb } from './supabase';
import type { Author, Category, Comment, PdfBook, Post, PostDetail, Site } from './types';
import { bn } from './utils';

const cache = new Map<string, Promise<unknown>>();

/** Runs `load` once per visit and shares the answer; a failure is not remembered. */
function once<T>(key: string, load: () => Promise<T>): Promise<T> {
  let hit = cache.get(key) as Promise<T> | undefined;
  if (!hit) {
    hit = load();
    hit.catch(() => cache.delete(key));
    cache.set(key, hit);
  }
  return hit;
}

/** Unwraps a Supabase answer, turning its error object into a thrown Error. */
async function rows<T>(query: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as T[];
}

const MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];

/** 2025-07-27 → জুলাই ২৭, ২০২৫ */
export function dateBn(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  if (!m) return '';
  return `${MONTHS[Number(m[2]) - 1] ?? ''} ${bn(Number(m[3]))}, ${bn(m[1])}`;
}

const nfc = (s: string) => (s ?? '').normalize('NFC').trim();
/** Letters and digits only: lets an old link still find its article after the slug was tidied. */
const loose = (s: string) => nfc(s).replace(/[^\p{L}\p{M}\p{N}]+/gu, '');

interface BlogRow {
  id: string;
  title: string;
  slug: string;
  image: string;
  category_title: string;
  author_name: string;
  tags: string[] | null;
  is_slider: boolean;
  is_feature: boolean;
  is_special_article: boolean;
  reading_time_minutes: number;
  published_date: string | null;
  created_at: string;
  seo_description: string;
  sub_title: string;
}

interface Flags {
  slider: boolean;
  special: boolean;
}
const flags = new Map<string, Flags>();

const BLOG_COLUMNS =
  'id,title,slug,image,category_title,author_name,tags,is_slider,is_feature,is_special_article,reading_time_minutes,published_date,created_at,seo_description,sub_title';

function toPost(b: BlogRow): Post {
  const iso = (b.published_date ?? b.created_at ?? '').slice(0, 10);
  const post: Post = {
    id: b.id,
    path: `/${iso.slice(0, 4)}/${iso.slice(5, 7)}/${nfc(b.slug)}.kehem`,
    title: b.title,
    category: nfc(b.category_title),
    date: dateBn(iso),
    iso,
    author: nfc(b.author_name),
    tags: (b.tags ?? []).map(nfc).filter(Boolean),
    image: b.image ?? '',
    excerpt: (b.seo_description || b.sub_title || '').trim(),
    featured: Boolean(b.is_feature),
    minutes: b.reading_time_minutes || 1,
  };
  flags.set(post.id, { slider: Boolean(b.is_slider), special: Boolean(b.is_special_article) });
  return post;
}

/** Every published article, newest first (without the article body). */
export const getPosts = () =>
  once('posts', async () => {
    const list = await rows<BlogRow>(
      sb.from('blogs').select(BLOG_COLUMNS).eq('status', 'Publish').order('published_date', { ascending: false }).order('created_at', { ascending: false }),
    );
    return list.map(toPost);
  });

export async function getPostByPath(path: string): Promise<PostDetail | null> {
  const posts = await getPosts();
  const clean = nfc(decodeURIComponent(path));
  const slug = (clean.split('/').pop() ?? '').replace(/\.kehem$/, '');
  const post =
    posts.find((p) => p.path === clean) ??
    posts.find((p) => p.path.endsWith(`/${slug}.kehem`)) ??
    posts.find((p) => loose(p.path.split('/').pop()!.replace(/\.kehem$/, '')) === loose(slug));
  if (!post || !slug) return null;
  const content = await once(`content:${post.id}`, async () => {
    const [row] = await rows<{ content: string }>(sb.from('blogs').select('content').eq('id', post.id).limit(1));
    return sanitizeHtml(row?.content ?? '');
  });
  return { ...post, content };
}

export const getAuthors = () =>
  once('authors', async () => {
    const [list, posts] = await Promise.all([
      rows<{ title: string; designation: string; image: string; description: string }>(sb.from('authors').select('title,designation,image,description')),
      getPosts(),
    ]);
    const counts = new Map<string, number>();
    for (const p of posts) counts.set(p.author, (counts.get(p.author) ?? 0) + 1);
    return list
      .map<Author>((a) => ({ name: nfc(a.title), role: a.designation ?? '', image: a.image ?? '', bio: a.description ?? '', count: counts.get(nfc(a.title)) ?? 0 }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'bn'));
  });

export async function getAuthor(name: string): Promise<Author | null> {
  const authors = await getAuthors();
  const clean = nfc(name);
  return authors.find((a) => a.name === clean) ?? null;
}

/** Categories that have at least one published article, biggest first. */
export const getCategories = () =>
  once('categories', async () => {
    const [list, posts] = await Promise.all([rows<{ title: string; icon_name: string }>(sb.from('categories').select('title,icon_name')), getPosts()]);
    const counts = new Map<string, number>();
    for (const p of posts) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    const icons = new Map(list.map((c) => [nfc(c.title), c.icon_name ?? '']));
    return [...counts]
      .filter(([name]) => name)
      .map<Category>(([name, count]) => ({ name, count, icon: icons.get(name) || undefined }))
      .sort((a, b) => b.count - a.count);
  });

const FIRST_ISSUE = 2014;
const LITERATURE = ['সাহিত্য', 'কবিতা'];

function youtubeId(link: string): string {
  const m = /(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([\w-]{11})/.exec(link ?? '');
  return m ? m[1] : '';
}

/** Home-page picks, videos, PDF books, the sidebar banner and the yearly issues. */
export const getSite = () =>
  once('site', async () => {
    const [posts, videos, books, settings] = await Promise.all([
      getPosts(),
      rows<{ video_link: string; platform: string }>(sb.from('videos').select('video_link,platform,created_at').order('created_at', { ascending: true })),
      rows<{ id: string; title: string; image: string; link: string; book_published_date: string | null }>(
        sb.from('pdf_books').select('id,title,image,link,book_published_date').order('book_published_date', { ascending: false }),
      ),
      rows<{ ad_image_url?: string; ad_link_url?: string }>(sb.from('settings').select('*').limit(1)),
    ]);

    const lastYear = Math.max(new Date().getFullYear(), ...posts.map((p) => Number(p.iso.slice(0, 4)) || 0));
    const issues: string[] = [];
    for (let y = FIRST_ISSUE; y <= lastYear; y++) issues.push(`নিংশিং চে - ${bn(y)}`);
    const issueCounts: Record<string, number> = {};
    for (const label of issues) issueCounts[label] = posts.filter((p) => p.tags.includes(label)).length;

    const site: Site = {
      hero: posts.filter((p) => flags.get(p.id)?.slider).map((p) => p.path),
      special: posts.filter((p) => flags.get(p.id)?.special).map((p) => p.path),
      literature: posts.filter((p) => LITERATURE.includes(p.category)).slice(0, 5).map((p) => p.path),
      videos: [...new Set(videos.map((v) => youtubeId(v.video_link)).filter(Boolean))],
      pdfs: books.map<PdfBook>((b) => ({ id: b.id, title: b.title, published: dateBn(b.book_published_date ?? ''), cover: b.image ?? '', file: b.link ?? '' })),
      ad: { href: settings[0]?.ad_link_url ?? '', image: settings[0]?.ad_image_url ?? '' },
      issues,
      issueCounts,
    };
    // Nothing picked for the slider yet: show the newest articles instead of an empty box.
    if (!site.hero.length) site.hero = posts.slice(0, 3).map((p) => p.path);
    return site;
  });

/** Look posts up by path, keeping the requested order. */
export function pick(posts: Post[], paths: string[]): Post[] {
  const byPath = new Map(posts.map((p) => [p.path, p]));
  return paths.map((p) => byPath.get(p)).filter((p): p is Post => Boolean(p));
}

/* ---------- comments ---------- */

/** Approved comments on an article, oldest first. */
export async function getComments(postId: string): Promise<Comment[]> {
  const list = await rows<{ id: string; name: string; address: string; content: string; created_at: string; avatar_url: string }>(
    sb.from('comments').select('id,name,address,content,created_at,avatar_url').eq('blog_id', postId).eq('status', 'Publish').order('created_at', { ascending: true }),
  );
  return list.map((c) => ({ id: c.id, name: c.name, address: c.address ?? '', text: c.content, date: dateBn(c.created_at), picture: c.avatar_url ?? '' }));
}

const field = (data: FormData, name: string) => String(data.get(name) ?? '').trim();

/** Sends a comment for approval. It appears on the article once an editor publishes it. */
export async function submitComment(postId: string, data: FormData, user: { id: string; picture: string } | null): Promise<void> {
  const { error } = await sb.from('comments').insert({
    blog_id: postId,
    name: field(data, 'name'),
    address: field(data, 'address'),
    email: field(data, 'email'),
    phone: field(data, 'phone'),
    content: field(data, 'comment'),
    status: 'Unpublish',
    user_id: user?.id ?? null,
    avatar_url: user?.picture && /^https?:/.test(user.picture) ? user.picture : '',
  });
  if (error) throw new Error(error.message);
}

/** Sends an article to the editors (it lands in the dashboard's submissions list as "Pending"). */
export async function submitArticle(data: FormData, html: string, userId: string | null): Promise<void> {
  const about = field(data, 'writer_info');
  const { error } = await sb.from('submitted_blogs').insert({
    title: field(data, 'content_title'),
    content_title: field(data, 'content_title'),
    content: html,
    writer_name: field(data, 'title'),
    writer_designation: about,
    designation: about,
    writer_email: field(data, 'email'),
    writer_facebook: field(data, 'facebook'),
    address: field(data, 'address'),
    phone: field(data, 'phone'),
    status: 'Pending',
    user_id: userId,
  });
  if (error) throw new Error(error.message);
}
