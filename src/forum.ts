/**
 * Forum data.
 *
 * Like src/auth.ts this is a browser-only store (localStorage): a visitor sees
 * the welcome topic plus whatever was posted on their own device. Keep the
 * exported function signatures and swap the bodies for API calls to go live.
 */
import { currentUser, findUser } from './auth';
import { SITE } from './strings';

export interface ForumAuthor {
  id: string;
  name: string;
  picture: string;
}
export interface Reply {
  id: string;
  body: string;
  authorId: string;
  authorName: string;
  createdAt: number;
}
export interface Topic extends Reply {
  title: string;
  category: string;
  pinned?: boolean;
  replies: Reply[];
}

export const FORUM_CATEGORIES = ['সাধারণ আলোচনা', 'ভাষা ও সাহিত্য', 'ইতিহাস ও সংস্কৃতি', 'এলা ও মিউজিক', 'প্রশ্ন ও সাহায্য'] as const;

const KEY = 'nc-forum';
const STAFF = 'ningshingche';

const WELCOME: Topic = {
  id: 'welcome',
  title: 'ফোরামে স্বাগতম — আলোচনার নিয়মাবলি',
  category: FORUM_CATEGORIES[0],
  body: 'নিংশিং চে ফোরামে সবাইকে স্বাগতম।\n\nএখানে ইমার ঠার, সাহিত্য, ইতিহাস, সংস্কৃতি ও এলা নিয়ে প্রশ্ন করতে ও মত জানাতে পারবেন।\n\n১. পরস্পরের প্রতি শ্রদ্ধাশীল থাকুন।\n২. বিষয়ের সাথে মিল রেখে সঠিক বিভাগ বেছে নিন।\n৩. ব্যক্তিগত আক্রমণ, বিজ্ঞাপন বা স্প্যাম করবেন না।',
  authorId: STAFF,
  authorName: SITE.name,
  createdAt: Date.UTC(2026, 0, 1),
  pinned: true,
  replies: [],
};

function read(): Topic[] {
  try {
    const list: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (Array.isArray(list)) return list as Topic[];
  } catch {
    /* fall through to the default */
  }
  return [structuredClone(WELCOME)];
}

function write(topics: Topic[]): void {
  localStorage.setItem(KEY, JSON.stringify(topics));
}

const lastActivity = (t: Topic) => t.replies[t.replies.length - 1]?.createdAt ?? t.createdAt;

export function authorOf(post: Reply): ForumAuthor {
  if (post.authorId === STAFF) return { id: STAFF, name: SITE.name, picture: SITE.logo };
  const user = findUser(post.authorId);
  return { id: post.authorId, name: user?.name ?? post.authorName, picture: user?.picture ?? '' };
}

export async function listTopics(category = ''): Promise<Topic[]> {
  return read()
    .filter((t) => !category || t.category === category)
    .sort((a, b) => Number(b.pinned ?? false) - Number(a.pinned ?? false) || lastActivity(b) - lastActivity(a));
}

export async function getTopic(id: string): Promise<Topic | null> {
  return read().find((t) => t.id === id) ?? null;
}

function me() {
  const user = currentUser();
  if (!user) throw new Error('not signed in');
  return user;
}

export async function createTopic(input: { title: string; body: string; category: string }): Promise<Topic> {
  const user = me();
  const topic: Topic = {
    id: crypto.randomUUID().slice(0, 8),
    title: input.title.trim(),
    body: input.body.trim(),
    category: (FORUM_CATEGORIES as readonly string[]).includes(input.category) ? input.category : FORUM_CATEGORIES[0],
    authorId: user.id,
    authorName: user.name,
    createdAt: Date.now(),
    replies: [],
  };
  write([...read(), topic]);
  return topic;
}

export async function addReply(topicId: string, body: string): Promise<Reply> {
  const user = me();
  const topics = read();
  const topic = topics.find((t) => t.id === topicId);
  if (!topic) throw new Error('topic not found');
  const reply: Reply = { id: crypto.randomUUID().slice(0, 8), body: body.trim(), authorId: user.id, authorName: user.name, createdAt: Date.now() };
  topic.replies.push(reply);
  write(topics);
  return reply;
}

/** Only the author can delete their own topic or reply. */
export async function deleteTopic(topicId: string): Promise<void> {
  const user = me();
  write(read().filter((t) => !(t.id === topicId && t.authorId === user.id)));
}

export async function deleteReply(topicId: string, replyId: string): Promise<void> {
  const user = me();
  const topics = read();
  const topic = topics.find((t) => t.id === topicId);
  if (!topic) return;
  topic.replies = topic.replies.filter((r) => !(r.id === replyId && r.authorId === user.id));
  write(topics);
}
