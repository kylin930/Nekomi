/* 单按钮循环切换：浅色 → 深色 → 跟随系统。 */
(function () {
  'use strict';
  if (!window.mdui) return;
  var KEY = 'nekomi-theme';
  var modes = ['light', 'dark', 'auto'];
  var labels = { light: '浅色', dark: '深色', auto: '跟随系统' };
  var icons = { light: 'light_mode', dark: 'dark_mode', auto: 'contrast' };
  function read() {
    try { var value = localStorage.getItem(KEY); return modes.includes(value) ? value : 'auto'; }
    catch (_) { return 'auto'; }
  }
  var mode = read();
  var appearance = window.NekomiData && NekomiData.appearance || {};
  var source = /^#(?:[a-f0-9]{3}|[a-f0-9]{6})$/i.test(appearance.color || '') ? appearance.color : '#8064b1';
  mdui.setColorScheme(source, { customColors: [
    { name: 'blossom', value: '#b65e82' }, { name: 'sky', value: '#427f9d' }
  ] });
  var wallpaper = appearance.wallpaper || {};
  var systemDark = matchMedia('(prefers-color-scheme: dark)');
  var wallpaperRequest = 0;
  var currentWallpaper = '';
  var pendingImage = null;
  var workerReady;
  var layer = document.createElement('div');
  layer.className = 'site-wallpaper';
  layer.setAttribute('aria-hidden', 'true');
  layer.hidden = true;
  document.body.prepend(layer);
  function number(value, fallback, min, max) {
    return typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
  }
  function cachedSource(url) {
    if (!wallpaper.cacheHours || !('serviceWorker' in navigator) || !isSecureContext) return Promise.resolve(url);
    if (!workerReady) {
      var workerUrl = new URL('wallpaper-cache.js', location.href);
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
      var endpoint = new URL('__nekomi_wallpaper', location.href);
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
    document.body.style.setProperty('--wallpaper-overlay', number(dark ? wallpaper.darkOverlay : wallpaper.lightOverlay, dark ? .68 : .64, 0, 1));
    document.body.style.setProperty('--wallpaper-paper-opacity', number(dark ? wallpaper.darkSurface : wallpaper.lightSurface, dark ? .92 : .90, .65, 1));
    var path = dark ? wallpaper.dark || wallpaper.light : wallpaper.light;
    var url = window.NekomiSite ? NekomiSite.safeUrl(path) : '';
    var request = ++wallpaperRequest;
    if (pendingImage) { clearTimeout(pendingImage.nekomiTimeout); pendingImage.onload = pendingImage.onerror = null; pendingImage.src = ''; pendingImage = null; }
    if (!url || wallpaper.enabled === false) { clearWallpaper(); return; }
    if (url === currentWallpaper) return;
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
  document.querySelectorAll('[data-theme-control]').forEach(function (container) {
    container.innerHTML = '<mdui-button-icon class="theme-trigger" data-theme-cycle>' +
      '<mdui-icon data-theme-glyph aria-hidden="true"></mdui-icon><span class="visually-hidden" data-theme-label></span>' +
      '</mdui-button-icon><span class="theme-mode-label" aria-hidden="true"></span>';
    container.querySelector('mdui-button-icon').addEventListener('click', function () {
      apply(modes[(modes.indexOf(mode) + 1) % modes.length]);
    });
  });
  function apply(next, persist) {
    if (!modes.includes(next)) return;
    mode = next;
    mdui.setTheme(mode);
    applyWallpaper();
    if (persist !== false) {
      try { localStorage.setItem(KEY, mode); } catch (_) { /* 无存储权限时仍可切换。 */ }
    }
    var nextLabel = labels[modes[(modes.indexOf(mode) + 1) % modes.length]];
    document.querySelectorAll('[data-theme-control]').forEach(function (container) {
      container.querySelector('[data-theme-glyph]').name = icons[mode];
      container.querySelector('[data-theme-label]').textContent = '主题：' + labels[mode] + '，点击切换为' + nextLabel;
      container.querySelector('[data-theme-cycle]').title = '当前' + labels[mode] + '，点击切换为' + nextLabel;
      container.querySelector('.theme-mode-label').textContent = labels[mode];
    });
  }
  window.addEventListener('storage', function (event) {
    if (event.key === KEY || event.key === null) apply(read(), false);
  });
  window.NekomiTheme = { getMode: function () { return mode; }, setMode: apply };
  apply(mode, false);
}());
