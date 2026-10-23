import { getCollection } from 'astro:content';
import { assetUrl, postUrl } from './urls';
export async function getPosts() {
  return (await getCollection('posts')).sort((a, b) => b.data.date.localeCompare(a.data.date));
}
export type Post = Awaited<ReturnType<typeof getPosts>>[number];
export const postMetadata = (post: Post) => ({ id: post.id, ...post.data, cover: assetUrl(post.data.cover), url: postUrl(post.id) });
