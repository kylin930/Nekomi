import { setTheme } from 'mdui/functions/setTheme.js';
import { setColorScheme } from 'mdui/functions/setColorScheme.js';
import { categoryColors } from '../lib/categories.mjs';
import { say } from './ui';

/* 单按钮循环切换：浅色 → 深色 → 跟随系统。 */
export function createTheme(data) {
  'use strict';
  var KEY = 'nekomi-theme';
  var modes = ['light', 'dark', 'auto'];
  var labels = data.ui.theme;
  var icons = { light: 'light_mode', dark: 'dark_mode', auto: 'contrast' };
  function read() {
    try { var value = localStorage.getItem(KEY); return modes.includes(value) ? value : data.appearance.mode; }
    catch (_) { return data.appearance.mode; }
  }
  var mode = read();
  var appearance = data.appearance;
  var baseUrl = new URL(data.base, location.origin);
  var source = /^#(?:[a-f0-9]{3}|[a-f0-9]{6})$/i.test(appearance.color || '') ? appearance.color : '#8064b1';
  setColorScheme(source, { customColors: [
    ...(appearance.secondary ? [{ name: 'accent', value: appearance.secondary }] : []),
    ...categoryColors(data.content.categoryColors),
    ...Object.entries(appearance.semanticColors).map(([name, value]) => ({ name, value }))
  ] });
  var wallpaper = appearance.wallpaper || {};
  var systemDark = matchMedia('(prefers-color-scheme: dark)');
  var mobileWallpaper = matchMedia('(max-width: 1119px)');
  var wallpaperRequest = 0;
  var currentWallpaper = '';
  var pendingImage = null;
  var pendingWallpaper = '';
  var workerReady;
  var layer = document.querySelector('.site-wallpaper');
  var palette = document.querySelector('style[id^="mdui-custom-color-scheme-"]');
  palette.setAttribute('data-astro-transition-persist', 'nekomi-palette');
  function number(value, fallback, min, max) {
    return typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
  }
  function cachedSource(url) {
    if (!wallpaper.cacheHours || !('serviceWorker' in navigator) || !isSecureContext) return Promise.resolve(url);
    if (!workerReady) {
      var workerUrl = new URL('wallpaper-cache.js', baseUrl);
      workerReady = navigator.serviceWorker.register(workerUrl).then(function () {
        return new Promise(function (resolve) {
          var timer = setTimeout(function () { done(false); }, 2500);
          function done(ready) { clearTimeout(timer); navigator.serviceWorker.removeEventListener('controllerchange', check); resolve(ready); }
          function check() { if (navigator.serviceWorker.controller && navigator.serviceWorker.controller.scriptURL === workerUrl.href) done(true); }
          navigator.serviceWorker.addEventListener('controllerchange', check);
          check();
        });
      }).catch(function () { return false; });
    }
    return workerReady.then(function (ready) {
      if (!ready) return url;
      var endpoint = new URL('__nekomi_wallpaper', baseUrl);
      endpoint.searchParams.set('source', url);
      endpoint.searchParams.set('hours', number(wallpaper.cacheHours, 24, 1, 168));
      return endpoint.href;
    });
  }
  function clearWallpaper() {
    layer.hidden = true;
    layer.replaceChildren();
    currentWallpaper = '';
    document.body.classList.remove('has-wallpaper');
  }
  async function applyWallpaper() {
    var dark = mode === 'dark' || mode === 'auto' && systemDark.matches;
    document.body.style.setProperty('--wallpaper-overlay', number(dark ? wallpaper.darkOverlay : wallpaper.lightOverlay, dark ? .68 : .60, 0, 1));
    document.body.style.setProperty('--wallpaper-paper-opacity', number(dark ? wallpaper.darkSurface : wallpaper.lightSurface, dark ? .88 : .84, .65, 1));
    document.body.style.setProperty('--wallpaper-reader-opacity', number(dark ? wallpaper.darkReaderSurface : wallpaper.lightReaderSurface, .97, .85, 1));
    var path = mobileWallpaper.matches
      ? dark ? wallpaper.mobileDark || wallpaper.dark || wallpaper.light || wallpaper.mobileLight : wallpaper.mobileLight || wallpaper.light
      : dark ? wallpaper.dark || wallpaper.light : wallpaper.light;
    var url = '';
    if (path) { try { var parsed = new URL(/^https?:\/\//.test(path) || path.startsWith(baseUrl.pathname) ? path : path.replace(/^\//, ''), baseUrl); if (['http:', 'https:'].includes(parsed.protocol)) url = parsed.href; } catch (_) { /* 无效图片回退。 */ } }
    if (url && wallpaper.enabled !== false && url === pendingWallpaper) return;
    var request = ++wallpaperRequest;
    pendingWallpaper = '';
    if (pendingImage) { clearTimeout(pendingImage.nekomiTimeout); pendingImage.onload = pendingImage.onerror = null; pendingImage.src = ''; pendingImage = null; }
    if (!url || wallpaper.enabled === false) { clearWallpaper(); return; }
    if (url === currentWallpaper) return;
    pendingWallpaper = url;
    var resolved = await cachedSource(url);
    if (request !== wallpaperRequest) return;
    var image = pendingImage = new Image();
    image.className = 'wallpaper-image';
    image.alt = '';
    image.decoding = 'async';
    image.fetchPriority = 'low';
    image.style.objectPosition = CSS.supports('object-position', wallpaper.position || '') ? wallpaper.position : 'center';
    image.style.objectFit = wallpaper.fit === 'contain' ? 'contain' : 'cover';
    var timer = image.nekomiTimeout = setTimeout(function () { if (image.onerror) image.onerror(); }, 30000);
    image.onload = async function () {
      clearTimeout(timer);
      try { await image.decode(); } catch (_) { /* load 已确认图片可用。 */ }
      if (request !== wallpaperRequest) return;
      pendingImage = null;
      pendingWallpaper = '';
      currentWallpaper = url;
      var previous = layer.querySelectorAll('img');
      layer.append(image);
      layer.hidden = false;
      document.body.classList.add('has-wallpaper');
      requestAnimationFrame(function () { requestAnimationFrame(function () { image.classList.add('is-visible'); }); });
      setTimeout(function () { previous.forEach(function (old) { old.remove(); }); }, 700);
    };
    image.onerror = function () {
      clearTimeout(timer);
      if (request !== wallpaperRequest) return;
      pendingImage = null;
      pendingWallpaper = '';
      ++wallpaperRequest;
      image.onload = image.onerror = null;
      image.src = '';
      if (navigator.serviceWorker && navigator.serviceWorker.controller && resolved !== url) {
        navigator.serviceWorker.controller.postMessage({ type: 'nekomi:wallpaper-failed', url: resolved });
      }
      clearWallpaper();
    };
    image.src = resolved;
  }
  systemDark.addEventListener('change', function () { if (mode === 'auto') applyWallpaper(); });
  mobileWallpaper.addEventListener('change', applyWallpaper);
  function apply(next, persist) {
    if (!modes.includes(next)) return;
    mode = next;
    setTheme(mode);
    applyWallpaper();
    if (persist !== false) {
      try { localStorage.setItem(KEY, mode); } catch (_) { /* 无存储权限时仍可切换。 */ }
    }
    syncDocument();
  }
  function syncDocument() {
    setTheme(mode);
    if (appearance.secondary) {
      for (const [role, accent] of [['secondary', 'accent'], ['on-secondary', 'on-accent'], ['secondary-container', 'accent-container'], ['on-secondary-container', 'on-accent-container']]) document.documentElement.style.setProperty('--mdui-color-' + role, `var(--mdui-color-${accent})`);
    }
    document.body.classList.toggle('has-wallpaper', !layer.hidden);
    var nextLabel = labels[modes[(modes.indexOf(mode) + 1) % modes.length]];
    document.querySelectorAll('[data-theme-control]').forEach(function (container) {
      container.querySelector('[data-theme-glyph]').name = icons[mode];
      container.querySelector('[data-theme-label]').textContent = say('theme', 'label', { mode: labels[mode], next: nextLabel });
      container.querySelector('[data-theme-cycle]').title = say('theme', 'title', { mode: labels[mode], next: nextLabel });
      container.querySelector('.theme-mode-label').textContent = labels[mode];
    });
    document.dispatchEvent(new Event('nekomi:theme'));
  }
  window.addEventListener('storage', function (event) {
    if (event.key === KEY || event.key === null) apply(read(), false);
  });
  function prepareSwap(newDocument) {
    newDocument.documentElement.style.cssText = document.documentElement.style.cssText;
    newDocument.documentElement.className = document.documentElement.className;
    // MDUI generates this palette only once. Give Astro a matching persistent head node.
    newDocument.head.append(palette.cloneNode(true));
    newDocument.body.classList.toggle('has-wallpaper', !layer.hidden);
    ['--wallpaper-overlay', '--wallpaper-paper-opacity', '--wallpaper-reader-opacity'].forEach(function (name) {
      newDocument.body.style.setProperty(name, document.body.style.getPropertyValue(name));
    });
  }
  var api = { getMode: function () { return mode; }, setMode: apply, syncDocument, prepareSwap };
  window.NekomiTheme = api;
  apply(mode, false);
  return api;
}
