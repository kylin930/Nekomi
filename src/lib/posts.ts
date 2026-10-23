import { getCollection } from 'astro:content';
import { assetUrl, postUrl, pageUrl } from './urls';
import { publishing } from '../config/publishing.mjs';
import { createHash } from 'node:crypto';
export async function getPosts() {
  return (await getCollection('posts')).sort((a, b) => b.data.date.localeCompare(a.data.date) || a.id.localeCompare(b.id));
}
export type Post = Awaited<ReturnType<typeof getPosts>>[number];
export const postMetadata = (post: Post, index: number) => ({ id: post.id, ...post.data, cover: assetUrl(post.data.cover), url: postUrl(post.id), pageUrl: pageUrl(Math.floor(index / publishing.pageSize) + 1) });
export const indexablePosts = (posts: Post[]) => publishing.indexing ? posts.filter(post => !post.data.demo) : [];
export function facets(posts: Post[], kind: 'categories' | 'tags' | 'archive') {
  const groups = new Map<string, Post[]>();
  for (const post of posts) for (const name of kind === 'tags' ? post.data.tags : [kind === 'categories' ? post.data.category : post.data.date.slice(0, 7)]) groups.set(name, [...(groups.get(name) || []), post]);
  const slug = (name: string) => name.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'topic';
  return [...groups].map(([name, items]) => {
    const value = slug(name);
    const duplicates = [...groups.keys()].filter(key => slug(key) === value).length > 1;
    return { name, posts: items, slug: value + (duplicates ? '-' + createHash('sha256').update(name).digest('hex').slice(0, 8) : '') };
  });
}
