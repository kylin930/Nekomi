import type { APIRoute } from 'astro';
import { publishing } from '../config/publishing.mjs';
import { absoluteUrl } from '../lib/seo';
import { withBase } from '../lib/urls';
import { getPosts, indexablePosts } from '../lib/posts';
export const GET: APIRoute = async () => new Response('User-agent: *\nAllow: /\n' + (publishing.url && indexablePosts(await getPosts()).length ? '\nSitemap: ' + absoluteUrl(withBase('sitemap-index.xml')) + '\n' : ''), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
