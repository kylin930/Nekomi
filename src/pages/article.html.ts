import { getPosts } from '../lib/posts';
import { postUrl, withBase } from '../lib/urls';
export async function GET() {
  const urls = Object.fromEntries((await getPosts()).map(post => [post.id, postUrl(post.id)]));
  const data = JSON.stringify({ urls, missing: withBase('404.html') }).replace(/</g, '\\u003c');
  // Entry compatibility only: all new internal links use static /posts/<id>/ URLs.
  return new Response(`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>文章链接已迁移</title><script>const data=${data};const id=new URLSearchParams(location.search).get('post');location.replace((Object.hasOwn(data.urls,id)?data.urls[id]:data.missing)+location.hash);</script><p>文章链接已迁移。<a href="${withBase('')}">返回文章列表</a></p></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
