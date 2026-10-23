import type { Post } from './posts';
import { publishing } from '../config/publishing.mjs';
import { withBase } from './urls';
export const listingUrl = (prefix: string, number: number) => withBase(prefix ? prefix + '/' + (number > 1 ? number + '/' : '') : number > 1 ? 'page/' + number + '/' : '');
export function listing(posts: Post[], number = 1, prefix = '') {
  const pages = Math.max(1, Math.ceil(posts.length / publishing.pageSize));
  return { items: posts.slice((number - 1) * publishing.pageSize, number * publishing.pageSize), ids: posts.map(post => post.id), total: posts.length, number, pages,
    previous: number > 1 ? listingUrl(prefix, number - 1) : '', next: number < pages ? listingUrl(prefix, number + 1) : '' };
}
export type Listing = ReturnType<typeof listing>;
