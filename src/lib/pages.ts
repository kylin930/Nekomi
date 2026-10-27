import { getCollection } from 'astro:content';
import { validatePages } from './page-rules.mjs';
import { config } from '../config/site';
import { withBase } from './urls';
import { commentKey } from '../integrations/comments/identity';
import { getPosts } from './posts';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
export async function getPages() {
  const entries = await getCollection('pages');
  const pages = validatePages(entries, config.navigation.pageTabs) as (typeof entries[number] & { slug: string })[];
  for (const page of pages) {
    const paths = ['.astro', '.md', '.mdx', '.html', '.ts', '.js'].flatMap(extension => [resolve('src/pages', page.slug + extension), resolve('src/pages', page.slug, 'index' + extension)]);
    paths.push(resolve('public', page.slug, 'index.html'));
    const conflict = paths.find(path => existsSync(path));
    if (conflict) throw new Error(`Page route /${page.slug}/ conflicts with an existing static file: ${conflict}`);
  }
  const identities = new Map((await getPosts()).map(post => [commentKey(post, config.comments.keyPrefix), `post:${post.id}`]));
  for (const page of pages) {
    if (!page.data.comments) continue;
    const key = commentKey(page, config.comments.pageKeyPrefix);
    if (config.comments.provider === 'twikoo' && /^https?:/.test(key)) throw new Error(`Twikoo page commentPath must be a path: ${page.id}.`);
    if (identities.has(key)) throw new Error(`Duplicate comment identity ${key}: ${identities.get(key)} and page:${page.id}. Set unique commentId / commentPath / pageKeyPrefix.`);
    identities.set(key, `page:${page.id}`);
  }
  return pages;
}
export type ContentPage = Awaited<ReturnType<typeof getPages>>[number];
export const standaloneUrl = (slug: string) => withBase(slug.split('/').map(encodeURIComponent).join('/') + '/');
export const pageMetadata = (page: ContentPage) => ({ id: 'page:' + page.id, kind: 'page' as const, title: page.data.title, key: commentKey(page, config.comments.pageKeyPrefix), url: standaloneUrl(page.slug), comments: page.data.comments });
