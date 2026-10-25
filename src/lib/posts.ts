import { readingMinutes, excerptText } from './reading.mjs';
import { normalizeCategory } from './categories.mjs';
import { getCollection } from 'astro:content';
import { assetUrl, postUrl, pageUrl } from './urls';
import { publishing } from '../config/publishing.mjs';
import { commentKey } from '../integrations/comments/identity';
import { config } from '../config/site';
import { createHash } from 'node:crypto';
function summarize(body: string) {
  const plain = excerptText(body);
  const chars = Array.from(plain);
  return chars.slice(0, config.content.excerptLength).join('') + (chars.length > config.content.excerptLength ? '…' : '');
}
export async function getPosts() {
  const posts = (await getCollection('posts')).filter(post => !post.data.draft).map(post => ({ ...post, data: { ...post.data, ...normalizeCategory(post.data.category, config.content.defaultCategory), excerpt: post.data.excerpt ?? summarize(post.body || ''), readingMinutes: typeof post.data.readingTime === 'number' ? post.data.readingTime : readingMinutes(post.body || '') } })).sort((a, b) => Number(b.data.pinned) - Number(a.data.pinned) || b.data.date.localeCompare(a.data.date) || a.id.localeCompare(b.id));
  const keys = new Map<string, string>();
  for (const post of posts) {
    const key = commentKey(post, config.comments.keyPrefix);
    if (config.comments.provider === 'twikoo' && /^https?:/.test(key)) throw new Error(`Twikoo commentPath must be a path without a domain: ${post.id}. Preserve a legacy path explicitly.`);
    if (keys.has(key)) throw new Error(`Duplicate comment identity ${key}: ${keys.get(key)} and ${post.id}. Set unique commentId / commentPath values.`);
    keys.set(key, post.id);
  }
  return posts;
}
export type Post = Awaited<ReturnType<typeof getPosts>>[number];
export const postMetadata = (post: Post, index: number) => ({ id: post.id, ...post.data, key: commentKey(post, config.comments.keyPrefix), cover: assetUrl(post.data.cover), url: postUrl(post.id), pageUrl: pageUrl(Math.floor(index / publishing.pageSize) + 1) });
export const indexablePosts = (posts: Post[]) => publishing.indexing ? posts.filter(post => !post.data.demo) : [];
export function facets(posts: Post[], kind: 'categories' | 'tags' | 'archive') {
  const groups = new Map<string, Post[]>();
  const ordered = kind === 'archive' ? [...posts].sort((a, b) => b.data.date.localeCompare(a.data.date) || a.id.localeCompare(b.id)) : posts;
  for (const post of ordered) for (const name of kind === 'tags' ? post.data.tags : [kind === 'categories' ? post.data.category : post.data.date.slice(0, 7)]) groups.set(name, [...(groups.get(name) || []), post]);
  const slug = (name: string) => name.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'topic';
  return [...groups].map(([name, items]) => {
    const value = slug(name);
    const duplicates = [...groups.keys()].filter(key => slug(key) === value).length > 1;
    return { name, posts: items, slug: value + (duplicates ? '-' + createHash('sha256').update(name).digest('hex').slice(0, 8) : '') };
  });
}
