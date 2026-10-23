import rss from '@astrojs/rss';
import { config } from '../config/site';
import { publishing } from '../config/publishing.mjs';
import { getPosts, indexablePosts } from '../lib/posts';
import { postUrl, withBase } from '../lib/urls';
import type { APIRoute } from 'astro';
export const GET: APIRoute = async ({ site }) => rss({
  title: config.site.name, description: config.site.tagline, site: new URL(withBase(''), site),
  items: indexablePosts(await getPosts()).map(post => ({ title: post.data.title, description: post.data.excerpt,
    pubDate: new Date(post.data.date + 'T00:00:00Z'), link: postUrl(post.id), categories: [post.data.category, ...post.data.tags] })),
  customData: '<language>' + publishing.language.replace(/[<>&]/g, '') + '</language>',
});
