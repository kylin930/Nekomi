/**
 * 主题模式：浅色 / 深色 / 跟随系统
 * - 用 localStorage 记忆用户选择；
 * - 用 MDUI 2 的 mdui-theme-* 类切换颜色令牌；
 * - 桌面 Tabs 栏与移动端工具栏中的菜单共用同一状态。
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'nekomi-theme';
  var MODES = {
    light: { icon: 'light_mode', label: '浅色' },
    dark: { icon: 'dark_mode', label: '深色' },
    auto: { icon: 'contrast', label: '跟随系统' }
  };

  function isMode(value) {
    return Object.prototype.hasOwnProperty.call(MODES, value);
  }

  function readStoredMode() {
    try {
      var value = localStorage.getItem(STORAGE_KEY);
      return isMode(value) ? value : 'auto';
    } catch (error) {
      return 'auto';
    }
  }

  function writeStoredMode(value) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch (error) {
      /* 隐私模式或禁用存储时忽略，本次会话仍然有效。 */
    }
  }

  function getMenus() {
    return Array.prototype.slice.call(document.querySelectorAll('[data-theme-menu]'));
  }

  function getIcons() {
    return Array.prototype.slice.call(document.querySelectorAll('[data-theme-icon]'));
  }

  var mode = readStoredMode();

  function updateControls() {
    var meta = MODES[mode];
    var root = document.documentElement;

    getIcons().forEach(function (button) {
      button.setAttribute('icon', meta.icon);
      button.setAttribute('aria-label', '切换主题（当前：' + meta.label + '）');
      button.setAttribute('title', '当前主题：' + meta.label);
    });

    getMenus().forEach(function (menu) {
      menu.setAttribute('value', mode);
    });

    root.dataset.theme = mode;
    root.style.colorScheme = mode === 'auto' ? 'light dark' : mode;
  }

  function applyMode(next, options) {
    if (!isMode(next)) {
      return;
    }

    var opts = options || {};
    mode = next;
    var root = document.documentElement;
    root.classList.remove('mdui-theme-light', 'mdui-theme-dark', 'mdui-theme-auto');
    root.classList.add('mdui-theme-' + mode);

    if (opts.persist !== false) {
      writeStoredMode(mode);
    }

    updateControls();
  }

  function bindMenu(menu) {
    if (menu.dataset.themeBound === 'true') {
      return;
    }
    menu.dataset.themeBound = 'true';
    menu.addEventListener('change', function () {
      var next = menu.value;
      if (isMode(next) && next !== mode) {
        applyMode(next);
      }
    });
  }

  function initMenus() {
    getMenus().forEach(bindMenu);
    updateControls();
  }

  function init() {
    applyMode(mode, { persist: false });

    var ready = window.customElements && window.customElements.whenDefined
      ? window.customElements.whenDefined('mdui-menu')
      : Promise.resolve();

    ready.then(initMenus).catch(function () {
      /* 组件加载失败时保留 CSS 主题切换能力。 */
      updateControls();
    });

    window.addEventListener('storage', function (event) {
      if (event.key === STORAGE_KEY && isMode(event.newValue)) {
        applyMode(event.newValue, { persist: false });
      }
    });
  }

  window.NekomiTheme = {
    getMode: function () {
      return mode;
    },
    setMode: function (next) {
      applyMode(next);
    },
    labelOf: function (value) {
      return isMode(value) ? MODES[value].label : '';
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}());
