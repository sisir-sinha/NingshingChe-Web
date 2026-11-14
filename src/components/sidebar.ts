import type { Category, Post } from '../types';
import { T } from '../strings';
import { bn, categoryUrl, esc } from '../utils';
import { postRow } from './cards';

export function widget(title: string, body: string, extra = ''): string {
  return `<section class="widget ${extra}"><h2 class="widget__title">${esc(title)}</h2>${body}</section>`;
}

export function categoryWidget(categories: Category[], active?: string): string {
  return widget(
    T.categories,
    `<ul class="cat-list">${categories
      .map(
        (c) =>
          `<li><a href="${categoryUrl(c.name)}"${c.name === active ? ' aria-current="page"' : ''}><span>${esc(c.name)}</span><span class="count">${bn(c.count)}</span></a></li>`,
      )
      .join('')}</ul>`,
  );
}

export function postsWidget(title: string, posts: Post[], numbered = false): string {
  return widget(title, `<ol class="rows">${posts.map((p, i) => postRow(p, numbered ? i + 1 : undefined)).join('')}</ol>`);
}
