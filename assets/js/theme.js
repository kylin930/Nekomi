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
  mdui.setColorScheme('#476756');
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
