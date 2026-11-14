import { currentUser } from '../auth';
import { FORUM_CATEGORIES, addReply, authorOf, createTopic, deleteReply, deleteTopic, getTopic, listTopics } from '../forum';
import type { Reply, Topic } from '../forum';
import { navigate, reload } from '../router';
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

function topicRow(t: Topic): string {
  const a = authorOf(t);
  const last = t.replies[t.replies.length - 1];
  return `<li class="topic-row${t.pinned ? ' is-pinned' : ''}">
    ${avatar(a)}
    <div class="topic-row__body">
      <a class="topic-row__title" href="${B}/forum/${t.id}">${t.pinned ? `<i class="fa-solid fa-thumbtack" title="${T.pinned}" aria-label="${T.pinned}"></i> ` : ''}${esc(t.title)}</a>
      <p class="topic-row__meta"><span class="chip">${esc(t.category)}</span> <span>${esc(a.name)}</span> · <span>${when(last?.createdAt ?? t.createdAt)}</span></p>
    </div>
    <span class="topic-row__count" aria-label="${bn(t.replies.length)} ${T.replies}"><i class="fa-regular fa-comment" aria-hidden="true"></i> ${bn(t.replies.length)}</span>
  </li>`;
}

/* ---------- /forum ---------- */

export async function forumPage({ query }: RouteContext): Promise<View> {
  const active = query.get('c') ?? '';
  const topics = await listTopics(active);
  const user = currentUser();
  const filter = (label: string, value: string) =>
    `<a class="topic${value === active ? ' is-active' : ''}" href="${B}/forum${value ? `?c=${encodeURIComponent(value)}` : ''}"${value === active ? ' aria-current="true"' : ''}>${esc(label)}</a>`;

  return {
    title: `${T.forum} | ${SITE.name}`,
    description: T.forumSub,
    html: `${pageHead(T.forum, 'fa-solid fa-comments', T.forum, T.forumSub)}
    <section class="container container--narrow forum section" data-scroll-anchor>
      <div class="forum__bar">
        <div class="forum__filters">${filter(T.all, '')}${FORUM_CATEGORIES.map((c) => filter(c, c)).join('')}</div>
        ${user ? `<button type="button" class="btn btn--primary" data-new-topic aria-expanded="false"><i class="fa-solid fa-plus" aria-hidden="true"></i> ${T.newTopic}</button>` : ''}
      </div>
      ${
        user
          ? `<form class="form form--card forum__new" data-topic-form novalidate hidden>
              <h2 class="auth__title">${T.newTopic}</h2>
              <label class="field"><span>${T.topicTitle} <b>*</b></span><input name="title" type="text" required minlength="4" maxlength="140"></label>
              <label class="field"><span>${T.topicCategory}</span>
                <select name="category">${FORUM_CATEGORIES.map((c) => `<option${c === active ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select>
              </label>
              <label class="field"><span>${T.topicBody} <b>*</b></span><textarea name="body" rows="6" required minlength="4" maxlength="5000"></textarea></label>
              <div class="pill-row">
                <button class="btn btn--primary" type="submit"><i class="fa-solid fa-paper-plane" aria-hidden="true"></i> ${T.postTopic}</button>
                <button class="btn btn--ghost" type="button" data-cancel>${T.cancel}</button>
              </div>
            </form>`
          : loginPrompt('/forum')
      }
      ${topics.length ? `<ul class="topic-list">${topics.map(topicRow).join('')}</ul>` : `<p class="forum__empty">${T.noTopics}</p>`}
      <p class="form__hint auth__demo"><i class="fa-solid fa-circle-info" aria-hidden="true"></i> ${T.demoForum}</p>
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
        if (!form.checkValidity() || title.length < 4 || body.length < 4) {
          form.classList.add('was-validated');
          form.querySelector<HTMLElement>(':invalid')?.focus();
          return;
        }
        const topic = await createTopic({ title, body, category: String(data.get('category')) });
        toast(T.posted);
        navigate(`${B}/forum/${topic.id}`);
      });
    },
  };
}

/* ---------- /forum/:id ---------- */

function post(p: Reply, kind: 'topic' | 'reply', mine: boolean): string {
  const a = authorOf(p);
  return `<article class="fpost${kind === 'topic' ? ' fpost--first' : ''}" id="p-${p.id}">
    ${avatar(a)}
    <div class="fpost__body">
      <header class="fpost__head">
        <strong>${esc(a.name)}</strong>
        <time datetime="${new Date(p.createdAt).toISOString()}">${when(p.createdAt)}</time>
        ${mine ? `<button type="button" class="fpost__delete" data-delete="${kind}" data-id="${p.id}" aria-label="${T.deleteItem}"><i class="fa-regular fa-trash-can" aria-hidden="true"></i> ${T.deleteItem}</button>` : ''}
      </header>
      <div class="fpost__text">${esc(p.body)}</div>
    </div>
  </article>`;
}

export async function topicPage({ params }: RouteContext): Promise<View> {
  const topic = await getTopic(params[0]);
  if (!topic) {
    return {
      title: `${T.topicMissing} | ${SITE.name}`,
      html: `<section class="container state">
        <p class="state__code" aria-hidden="true"><i class="fa-regular fa-comments"></i></p>
        <h1>${T.topicMissing}</h1>
        <div class="pill-row pill-row--center"><a class="btn btn--primary" href="${B}/forum"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i> ${T.backToForum}</a></div>
      </section>`,
    };
  }
  const user = currentUser();
  const path = `/forum/${topic.id}`;
  return {
    title: `${topic.title} | ${T.forum} | ${SITE.name}`,
    description: topic.body.slice(0, 160),
    html: `<section class="container container--narrow forum forum--topic section">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="${B}/">${T.home}</a><i class="fa-solid fa-chevron-right" aria-hidden="true"></i><a href="${B}/forum">${T.forum}</a></nav>
      <a class="chip" href="${B}/forum?c=${encodeURIComponent(topic.category)}">${esc(topic.category)}</a>
      <h1 class="forum__title">${esc(topic.title)}</h1>
      ${post(topic, 'topic', topic.authorId === user?.id)}
      <h2 class="section-title forum__count">${bn(topic.replies.length)} ${T.replies}</h2>
      ${
        topic.replies.length
          ? `<div class="fpost-list">${topic.replies.map((r) => post(r, 'reply', r.authorId === user?.id)).join('')}</div>`
          : `<p class="forum__empty">${T.noReplies}</p>`
      }
      ${
        user
          ? `<form class="fpost fpost--form" data-reply-form novalidate>
              ${avatar(user)}
              <div class="fpost__body form">
                <label class="field"><span class="sr-only">${T.reply}</span><textarea name="body" rows="4" required maxlength="5000" placeholder="${T.writeReply}"></textarea></label>
                <button class="btn btn--primary" type="submit"><i class="fa-solid fa-reply" aria-hidden="true"></i> ${T.reply}</button>
              </div>
            </form>`
          : loginPrompt(path)
      }
    </section>`,
    mount(root) {
      root.addEventListener('click', async (e) => {
        const btn = (e.target as Element).closest<HTMLElement>('[data-delete]');
        if (!btn || !window.confirm(T.confirmDelete)) return;
        if (btn.dataset.delete === 'topic') {
          await deleteTopic(topic.id);
          toast(T.deleted);
          navigate(`${B}/forum`, { replace: true });
        } else {
          await deleteReply(topic.id, btn.dataset.id!);
          toast(T.deleted);
          reload();
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
        await addReply(topic.id, body);
        toast(T.posted);
        reload();
      });
    },
  };
}
