import { currentUser } from '../auth';
import { addReply, createTopic, deleteReply, deleteTopic, getForum, getTopic, toggleLike } from '../forum';
import type { ForumPost, Reply, Topic } from '../forum';
import { navigate, reload } from '../router';
import { htmlToText } from '../sanitize';
import { SITE, T } from '../strings';
import type { RouteContext, View } from '../types';
import { B, bn, esc, toast } from '../utils';
import { avatar } from './account';
import { pageHead } from './listing';

function when(ts: number): string {
  const mins = Math.round((Date.now() - ts) / 60000);
  try {
    const rel = new Intl.RelativeTimeFormat('bn', { numeric: 'auto' });
    if (mins < 1) return rel.format(0, 'minute');
    if (mins < 60) return rel.format(-mins, 'minute');
    if (mins < 60 * 24) return rel.format(-Math.round(mins / 60), 'hour');
    if (mins < 60 * 24 * 7) return rel.format(-Math.round(mins / 1440), 'day');
    return new Intl.DateTimeFormat('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' }).format(ts);
  } catch {
    return new Date(ts).toLocaleDateString();
  }
}

function loginPrompt(next: string): string {
  return `<div class="forum-login">
    <i class="fa-solid fa-lock" aria-hidden="true"></i>
    <p>${T.loginToPost}</p>
    <a class="btn btn--primary" href="${B}/login?next=${encodeURIComponent(next)}"><i class="fa-solid fa-right-to-bracket" aria-hidden="true"></i> ${T.login}</a>
    <a class="btn btn--ghost" href="${B}/register?next=${encodeURIComponent(next)}">${T.register}</a>
  </div>`;
}

const who = (p: ForumPost) => ({ name: p.authorName, picture: p.authorPicture });
const badge = (p: ForumPost) => (p.official ? ` <span class="chip chip--official"><i class="fa-solid fa-circle-check" aria-hidden="true"></i> ${T.official}</span>` : '');

/** Shows the database's refusal in plain words instead of failing silently. */
function fail(err: unknown): void {
  console.error(err);
  toast(T.errGeneric);
}

function topicRow(t: Topic): string {
  return `<li class="topic-row${t.official ? ' is-pinned' : ''}">
    ${avatar(who(t))}
    <div class="topic-row__body">
      <a class="topic-row__title" href="${B}/forum/${t.id}">${esc(t.title)}</a>
      <p class="topic-row__meta"><span class="chip">${esc(t.category)}</span> <span>${esc(t.authorName)}</span>${badge(t)} · <span>${when(t.lastAt)}</span> · <span><i class="fa-regular fa-eye" aria-hidden="true"></i> ${bn(t.views)}</span></p>
    </div>
    <span class="topic-row__count" aria-label="${bn(t.replyCount)} ${T.replies}"><i class="fa-regular fa-comment" aria-hidden="true"></i> ${bn(t.replyCount)}</span>
  </li>`;
}

/* ---------- /forum ---------- */

export async function forumPage({ query }: RouteContext): Promise<View> {
  const active = query.get('c') ?? '';
  const { categories, topics } = await getForum(active);
  const user = currentUser();
  const filter = (label: string, value: string) =>
    `<a class="topic${value === active ? ' is-active' : ''}" href="${B}/forum${value ? `?c=${encodeURIComponent(value)}` : ''}"${value === active ? ' aria-current="true"' : ''}>${esc(label)}</a>`;

  return {
    title: `${T.forum} | ${SITE.name}`,
    description: T.forumSub,
    html: `${pageHead(T.forum, 'fa-solid fa-comments', T.forum, T.forumSub)}
    <section class="container container--narrow forum section" data-scroll-anchor>
      <div class="forum__bar">
        <div class="forum__filters">${filter(T.all, '')}${categories.map((c) => filter(c.title, c.slug)).join('')}</div>
        ${user ? `<button type="button" class="btn btn--primary" data-new-topic aria-expanded="false"><i class="fa-solid fa-plus" aria-hidden="true"></i> ${T.newTopic}</button>` : ''}
      </div>
      ${
        user
          ? `<form class="form form--card forum__new" data-topic-form novalidate hidden>
              <h2 class="auth__title">${T.newTopic}</h2>
              <label class="field"><span>${T.topicTitle} <b>*</b></span><input name="title" type="text" required minlength="4" maxlength="160"></label>
              <label class="field"><span>${T.topicCategory}</span>
                <select name="category">${categories.map((c) => `<option value="${esc(c.slug)}"${c.slug === active ? ' selected' : ''}>${esc(c.title)}</option>`).join('')}</select>
              </label>
              <label class="field"><span>${T.topicBody} <b>*</b></span><textarea name="body" rows="6" required maxlength="8000"></textarea></label>
              <div class="pill-row">
                <button class="btn btn--primary" type="submit"><i class="fa-solid fa-paper-plane" aria-hidden="true"></i> ${T.postTopic}</button>
                <button class="btn btn--ghost" type="button" data-cancel>${T.cancel}</button>
              </div>
            </form>`
          : loginPrompt('/forum')
      }
      ${topics.length ? `<ul class="topic-list">${topics.map(topicRow).join('')}</ul>` : `<p class="forum__empty">${T.noTopics}</p>`}
    </section>`,
    mount(root) {
      const form = root.querySelector<HTMLFormElement>('[data-topic-form]');
      const open = root.querySelector<HTMLButtonElement>('[data-new-topic]');
      if (!form || !open) return;
      const show = (on: boolean) => {
        form.hidden = !on;
        open.setAttribute('aria-expanded', String(on));
        if (on) form.querySelector<HTMLInputElement>('[name="title"]')!.focus();
      };
      open.addEventListener('click', () => show(form.hidden === true));
      form.querySelector('[data-cancel]')!.addEventListener('click', () => show(false));
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = new FormData(form);
        const title = String(data.get('title') ?? '').trim();
        const body = String(data.get('body') ?? '').trim();
        if (!form.checkValidity() || title.length < 4 || !body) {
          form.classList.add('was-validated');
          form.querySelector<HTMLElement>(':invalid')?.focus();
          return;
        }
        const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
        submit.disabled = true;
        try {
          const id = await createTopic({ title, body, category: String(data.get('category')) });
          toast(T.posted);
          navigate(`${B}/forum/${id}`);
        } catch (err) {
          submit.disabled = false;
          fail(err);
        }
      });
    },
  };
}

/* ---------- /forum/:id ---------- */

function post(p: ForumPost, kind: 'topic' | 'reply', mine: boolean, extra = ''): string {
  return `<article class="fpost${kind === 'topic' ? ' fpost--first' : ''}${kind === 'reply' && (p as Reply).parentId ? ' fpost--child' : ''}" id="p-${p.id}">
    ${avatar(who(p))}
    <div class="fpost__body">
      <header class="fpost__head">
        <strong>${esc(p.authorName)}</strong>${badge(p)}
        <time datetime="${new Date(p.createdAt).toISOString()}">${when(p.createdAt)}</time>
        ${mine ? `<button type="button" class="fpost__delete" data-delete="${kind}" data-id="${p.id}" aria-label="${T.deleteItem}"><i class="fa-regular fa-trash-can" aria-hidden="true"></i> ${T.deleteItem}</button>` : ''}
      </header>
      <div class="fpost__text prose">${p.body}</div>
      ${extra}
    </div>
  </article>`;
}

const likeButton = (r: Reply) =>
  `<button type="button" class="fpost__like${r.liked ? ' is-on' : ''}" data-like="${r.id}" aria-pressed="${r.liked}"><i class="fa-${r.liked ? 'solid' : 'regular'} fa-thumbs-up" aria-hidden="true"></i> <span>${bn(r.likes)}</span><span class="sr-only"> ${T.like}</span></button>`;

/** Answers follow the reply they were written under. */
function threaded(replies: Reply[]): Reply[] {
  const roots = replies.filter((r) => !r.parentId || !replies.some((x) => x.id === r.parentId));
  return roots.flatMap((r) => [r, ...replies.filter((x) => x.parentId === r.id)]);
}

export async function topicPage({ params }: RouteContext): Promise<View> {
  const found = await getTopic(params[0]);
  if (!found) {
    return {
      title: `${T.topicMissing} | ${SITE.name}`,
      html: `<section class="container state">
        <p class="state__code" aria-hidden="true"><i class="fa-regular fa-comments"></i></p>
        <h1>${T.topicMissing}</h1>
        <div class="pill-row pill-row--center"><a class="btn btn--primary" href="${B}/forum"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i> ${T.backToForum}</a></div>
      </section>`,
    };
  }
  const { topic, replies } = found;
  const user = currentUser();
  const path = `/forum/${topic.id}`;
  return {
    title: `${topic.title} | ${T.forum} | ${SITE.name}`,
    description: htmlToText(topic.body).slice(0, 160),
    html: `<section class="container container--narrow forum forum--topic section">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="${B}/">${T.home}</a><i class="fa-solid fa-chevron-right" aria-hidden="true"></i><a href="${B}/forum">${T.forum}</a></nav>
      <a class="chip" href="${B}/forum?c=${encodeURIComponent(topic.categorySlug)}">${esc(topic.category)}</a>
      <h1 class="forum__title">${esc(topic.title)}</h1>
      ${topic.cover ? `<img class="forum__cover" src="${esc(topic.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}
      ${post(topic, 'topic', Boolean(user) && topic.authorId === user?.id)}
      <h2 class="section-title forum__count">${bn(replies.length)} ${T.replies}</h2>
      ${
        replies.length
          ? `<div class="fpost-list">${threaded(replies).map((r) => post(r, 'reply', r.mine, likeButton(r))).join('')}</div>`
          : `<p class="forum__empty">${T.noReplies}</p>`
      }
      ${
        user
          ? `<form class="fpost fpost--form" data-reply-form novalidate>
              ${avatar(user)}
              <div class="fpost__body form">
                <label class="field"><span class="sr-only">${T.reply}</span><textarea name="body" rows="4" required maxlength="4000" placeholder="${T.writeReply}"></textarea></label>
                <button class="btn btn--primary" type="submit"><i class="fa-solid fa-reply" aria-hidden="true"></i> ${T.reply}</button>
              </div>
            </form>`
          : loginPrompt(path)
      }
    </section>`,
    mount(root) {
      root.addEventListener('click', async (e) => {
        const target = e.target as Element;
        const like = target.closest<HTMLButtonElement>('[data-like]');
        if (like) {
          like.disabled = true;
          try {
            const now = await toggleLike(like.dataset.like!);
            like.classList.toggle('is-on', now.liked);
            like.setAttribute('aria-pressed', String(now.liked));
            like.querySelector('i')!.className = `fa-${now.liked ? 'solid' : 'regular'} fa-thumbs-up`;
            like.querySelector('span')!.textContent = bn(now.likes);
          } catch (err) {
            fail(err);
          }
          like.disabled = false;
          return;
        }
        const btn = target.closest<HTMLElement>('[data-delete]');
        if (!btn || !window.confirm(T.confirmDelete)) return;
        try {
          if (btn.dataset.delete === 'topic') {
            await deleteTopic(topic.id);
            toast(T.deleted);
            navigate(`${B}/forum`, { replace: true });
          } else {
            await deleteReply(btn.dataset.id!);
            toast(T.deleted);
            reload();
          }
        } catch (err) {
          fail(err);
        }
      });
      const form = root.querySelector<HTMLFormElement>('[data-reply-form]');
      form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const body = String(new FormData(form).get('body') ?? '').trim();
        if (!body) {
          form.classList.add('was-validated');
          form.querySelector<HTMLElement>('textarea')!.focus();
          return;
        }
        const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
        submit.disabled = true;
        try {
          await addReply(topic.id, body);
          toast(T.posted);
          reload();
        } catch (err) {
          submit.disabled = false;
          fail(err);
        }
      });
    },
  };
}
