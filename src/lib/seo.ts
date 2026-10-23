import { getImage } from 'astro:assets';
import type { Post } from './posts';
import { publishing } from '../config/publishing.mjs';
import { externalUrl, withBase, postUrl } from './urls';
import { localImage } from './images';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export const absoluteUrl = (path: string) => publishing.url ? new URL(path, publishing.url).href : undefined;
export const canonicalUrl = (pathname: string) => absoluteUrl(pathname);
export const canIndex = (posts: Post[]) => publishing.indexing && posts.some(post => !post.data.demo);
export async function sharingImage(value: string) {
  if (!value) return undefined;
  if (!publishing.url && !externalUrl(value)) return undefined;
  const local = localImage(value);
  if (local) {
    const image = await getImage({ src: local, width: Math.min(local.width, 1200), format: 'webp' });
    return absoluteUrl(image.src);
  }
  if (/^https?:\/\//.test(value)) return externalUrl(value) || undefined;
  // Only emit a configured public image when that file actually exists.
  const path = value.startsWith(publishing.base) ? value.slice(publishing.base.length) : value;
  const file = resolve('public', path.replace(/^\//, ''));
  return file.startsWith(resolve('public') + '/') && existsSync(file) ? absoluteUrl(withBase(path)) : undefined;
}
export function structuredSite(name: string, description: string) {
  const url = absoluteUrl(withBase(''));
  return [
    { '@type': 'WebSite', name, description, inLanguage: publishing.language, ...(url ? { '@id': url + '#website', url } : {}) },
    { '@type': 'Blog', name, description, inLanguage: publishing.language, ...(url ? { '@id': url + '#blog', url } : {}) },
  ];
}
export function structuredArticle(post: Post, image?: string) {
  if (post.data.demo || !publishing.indexing) return [];
  return [{ '@type': 'BlogPosting', headline: post.data.title, description: post.data.excerpt,
    datePublished: post.data.date, ...(post.data.updated ? { dateModified: post.data.updated } : {}),
    inLanguage: publishing.language, articleSection: post.data.category, keywords: post.data.tags,
    mainEntityOfPage: absoluteUrl(postUrl(post.id)), ...(image ? { image } : {}),
    author: { '@type': 'Person', name: publishing.author, ...(externalUrl(publishing.authorUrl) ? { url: externalUrl(publishing.authorUrl) } : {}) },
  }];
}
