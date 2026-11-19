/**
 * Forum, stored in Supabase (shared with the Android app).
 * Reading is open to everyone; posting needs a signed-in reader. The rules
 * (who may post, edit or delete what, length limits) are enforced by the
 * database functions, not by this file.
 */
import { whenProfileReady } from './auth';
import { sanitizeHtml, textToHtml } from './sanitize';
import { deviceId, sb } from './supabase';

export interface ForumCategory {
  slug: string;
  title: string;
  description: string;
  count: number;
}
export interface ForumPost {
  id: string;
  /** Sanitised HTML */
  body: string;
  authorId: string;
  authorName: string;
  authorPicture: string;
  createdAt: number;
  official: boolean;
}
export interface Topic extends ForumPost {
  title: string;
  excerpt: string;
  category: string;
  categorySlug: string;
  replyCount: number;
  views: number;
  lastAt: number;
  cover: string;
}
export interface Reply extends ForumPost {
  parentId: string;
  likes: number;
  liked: boolean;
  mine: boolean;
}

type Row = Record<string, unknown>;
const text = (v: unknown) => (typeof v === 'string' ? v : '');
const time = (v: unknown) => (typeof v === 'string' ? Date.parse(v) || 0 : 0);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toTopic(r: Row): Topic {
  return {
    id: text(r.id),
    title: text(r.title),
    body: sanitizeHtml(text(r.body)),
    excerpt: text(r.excerpt).trim(),
    category: text(r.category_title),
    categorySlug: text(r.category_slug),
    authorId: text(r.author_id),
    authorName: text(r.author_name),
    authorPicture: text(r.author_avatar_url),
    createdAt: time(r.created_at),
    lastAt: time(r.last_reply_at) || time(r.created_at),
    replyCount: Number(r.replies_count) || 0,
    views: Number(r.views_count) || 0,
    official: r.is_official === true,
    cover: text(r.cover_image_url),
  };
}

function toReply(r: Row): Reply {
  return {
    id: text(r.id),
    body: sanitizeHtml(text(r.body)),
    authorId: text(r.author_id),
    authorName: text(r.author_name),
    authorPicture: text(r.author_avatar_url),
    createdAt: time(r.created_at),
    official: r.is_official === true,
    parentId: text(r.parent_id),
    likes: Number(r.like_count) || 0,
    liked: r.my_reaction === 'like',
    mine: r.is_mine === true,
  };
}

async function call(fn: string, args: Record<string, unknown>): Promise<Row> {
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw new Error(error.message);
  return (data ?? {}) as Row;
}

/** The forum front page, or one category when `slug` is given. */
export async function getForum(slug = ''): Promise<{ categories: ForumCategory[]; topics: Topic[] }> {
  const overview = await call('forum_overview', { p_limit: 60, p_order: 'recent' });
  const categories = ((overview.categories as Row[] | undefined) ?? []).map<ForumCategory>((c) => ({
    slug: text(c.slug),
    title: text(c.title),
    description: text(c.description),
    count: Number(c.discussions) || 0,
  }));
  let list = (overview.latest as Row[] | undefined) ?? [];
  if (slug && categories.some((c) => c.slug === slug)) {
    const one = await call('forum_category', { p_slug: slug, p_limit: 60, p_offset: 0 });
    list = (one.discussions as Row[] | undefined) ?? [];
  }
  return { categories, topics: list.map(toTopic) };
}

export async function getTopic(id: string): Promise<{ topic: Topic; replies: Reply[] } | null> {
  if (!UUID.test(id)) return null;
  try {
    const data = await call('forum_discussion', { p_id: id, p_count_view: true, p_device_id: deviceId() });
    if (!data.discussion) return null;
    return { topic: toTopic(data.discussion as Row), replies: ((data.replies as Row[] | undefined) ?? []).map(toReply) };
  } catch {
    return null;
  }
}

/** Starts a discussion and returns its id. `body` is plain text. */
export async function createTopic(input: { title: string; body: string; category: string }): Promise<string> {
  await whenProfileReady();
  const data = await call('forum_create_discussion', { p_category_slug: input.category, p_title: input.title, p_body: textToHtml(input.body) });
  return text((data.discussion as Row | undefined)?.id);
}

/** Submit rich HTML; the reader-side sanitizer also protects rendered replies. */
export async function addReply(topicId: string, body: string, parentId = ''): Promise<void> {
  await whenProfileReady();
  await call('forum_reply', { p_id: topicId, p_body: sanitizeHtml(body), p_parent_id: parentId || null, p_device_id: deviceId() });
}

export async function deleteReply(replyId: string): Promise<void> {
  await call('forum_delete_reply', { p_id: replyId });
}

/** Only the reader who started a discussion can remove it (the database checks). */
export async function deleteTopic(topicId: string): Promise<void> {
  const { data, error } = await sb.from('forum_discussions').delete().eq('id', topicId).select('id');
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error('not allowed');
}

/** Likes a reply, or takes the like back. Returns the new count. */
export async function toggleLike(replyId: string): Promise<{ likes: number; liked: boolean }> {
  const data = await call('forum_react', { p_reply_id: replyId, p_kind: 'like', p_device_id: deviceId() });
  return { likes: Number(data.likes) || 0, liked: data.mine === 'like' };
}
