import { config, ui } from '../config/site';
import { getPosts } from '../lib/posts';
import { postUrl, withBase } from '../lib/urls';
const escape = (value: string) => value.replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]!);
export async function GET() {
  const urls = Object.fromEntries((await getPosts()).map(post => [post.id, postUrl(post.id)]));
  const data = JSON.stringify({ urls, missing: withBase('404.html') }).replace(/</g, '\\u003c');
  // Entry compatibility only: all new internal links use static /posts/<id>/ URLs.
  return new Response(`<!doctype html><html lang="${escape(config.publishing.language)}"><meta charset="utf-8"><title>${escape(ui.reading.moved)}</title><script>const data=${data};const id=new URLSearchParams(location.search).get('post');location.replace((Object.hasOwn(data.urls,id)?data.urls[id]:data.missing)+location.hash);</script><p>${escape(ui.reading.moved)}<a href="${withBase('')}">${escape(ui.common.backToPosts)}</a></p></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
