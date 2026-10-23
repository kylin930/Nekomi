/* 只缓存 /__nekomi_wallpaper 下的图片，不缓存 HTML、脚本或文章。
   随机 API 不开放 CORS：保留浏览器的 opaque 图片响应，不读取或改写图片。 */
'use strict';
var CACHE = 'nekomi-wallpaper-v1';
var pending = new Map();
var endpoint = new URL('__nekomi_wallpaper', self.registration.scope);
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (event) { event.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function (event) {
  var url = new URL(event.request.url);
  if (url.origin !== endpoint.origin || url.pathname !== endpoint.pathname || event.request.destination !== 'image') return;
  var source;
  try { source = new URL(url.searchParams.get('source')); } catch (_) { return; }
  if (!['http:', 'https:'].includes(source.protocol)) return;
  // Image 默认 no-cors，允许直接返回 opaque 响应；其他请求不交给此缓存。
  if (event.request.mode !== 'no-cors') return;
  if (!pending.has(url.href)) pending.set(url.href, (async function () {
    var cache;
    try { cache = await caches.open(CACHE); }
    catch (_) { return fetch(source.href, { mode: 'no-cors', credentials: 'omit' }); }
    var key = new Request(url.href);
    var metadataKey = new Request(url.href + '&metadata=1');
    var cached = await cache.match(key);
    var metadata = await cache.match(metadataKey);
    var savedAt = metadata ? Number(await metadata.text()) : 0;
    var hours = Math.min(168, Math.max(1, Number(url.searchParams.get('hours')) || 24));
    if (cached && Date.now() - savedAt < hours * 3600000) return cached;
    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 25000);
    try {
      var response = await fetch(source.href, { mode: 'no-cors', credentials: 'omit', cache: 'no-cache', signal: controller.signal });
      if (response.type !== 'opaque' && !response.ok) throw new Error('Wallpaper unavailable');
      // 只保留最近两个主题的图片，避免随机大图无限占用存储。
      try {
        var keys = (await cache.keys()).filter(function (item) { return !new URL(item.url).searchParams.has('metadata') && item.url !== key.url; });
        for (var i = 0; i < keys.length - 1; i++) {
          await cache.delete(keys[i]);
          await cache.delete(keys[i].url + '&metadata=1');
        }
        await cache.put(key, response.clone());
        await cache.put(metadataKey, new Response(String(Date.now())));
      } catch (_) { /* 配额或存储权限不足时仍展示网络图片。 */ }
      return response;
    } catch (_) {
      // 网络不可用时可以继续使用之前已加载的背景。
      return cached || Response.error();
    } finally { clearTimeout(timeout); }
  }()).finally(function () { pending.delete(url.href); }));
  event.respondWith(pending.get(url.href).then(function (response) { return response.clone(); }));
});
self.addEventListener('message', function (event) {
  if (!event.data || event.data.type !== 'nekomi:wallpaper-failed') return;
  var url;
  try { url = new URL(event.data.url); } catch (_) { return; }
  if (url.origin !== endpoint.origin || url.pathname !== endpoint.pathname) return;
  event.waitUntil(caches.open(CACHE).then(function (cache) {
    return Promise.all([cache.delete(url.href), cache.delete(url.href + '&metadata=1')]);
  }).catch(function () { /* 没有缓存权限时无需清理。 */ }));
});
