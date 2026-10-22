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
      button.querySelector('[data-theme-glyph]').setAttribute('name', meta.icon);
      button.querySelector('[data-theme-label]').textContent = '切换主题（当前：' + meta.label + '）';
      button.setAttribute('aria-label', '切换主题（当前：' + meta.label + '）');
      button.setAttribute('title', '当前主题：' + meta.label);
    });

    getMenus().forEach(function (menu) {
      // Menu.value 不反射到 HTML attribute；必须使用 property 同步。
      menu.value = mode;
      menu.querySelectorAll('mdui-menu-item').forEach(function (item) {
        item.setAttribute('aria-checked', item.value === mode ? 'true' : 'false');
      });
    });

    root.dataset.theme = mode;
  }

  function applyMode(next, options) {
    if (!isMode(next)) {
      return;
    }

    var opts = options || {};
    mode = next;
    // 首屏恢复在 HTML 中完成；加载后使用官方主题 API。
    if (window.mdui) {
      window.mdui.setTheme(mode);
    } else {
      // CDN 暂时不可用时，仍保留纯 CSS 的主题回退。
      var root = document.documentElement;
      root.classList.remove('mdui-theme-light', 'mdui-theme-dark', 'mdui-theme-auto');
      root.classList.add('mdui-theme-' + mode);
    }

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
    menu.addEventListener('change', function (event) {
      if (event.target !== menu) {
        return;
      }
      var next = menu.value;
      if (isMode(next) && next !== mode) {
        applyMode(next);
      } else {
        // 单选菜单允许取消选中；等本轮组件更新结束后恢复当前主题。
        // 同步回写可能被 Lit 合并，导致 value 正确但 selected 仍为空。
        window.requestAnimationFrame(updateControls);
      }
    });
  }

  function initMenus() {
    getMenus().forEach(bindMenu);
    document.querySelectorAll('.theme-control mdui-dropdown').forEach(function (dropdown) {
      var trigger = dropdown.querySelector('[slot="trigger"]');
      ['open', 'close'].forEach(function (type) {
        dropdown.addEventListener(type, function (event) {
          if (event.target === dropdown) {
            trigger.setAttribute('aria-expanded', type === 'open' ? 'true' : 'false');
          }
        });
      });
      dropdown.addEventListener('closed', function (event) {
        if (event.target !== dropdown) {
          return;
        }
        // 2.1.5 的 Menu 可能在 Dropdown 恢复焦点后异步聚焦已隐藏的菜单项。
        // 仅修复丢失或仍留在隐藏菜单内的焦点，保留外部点击的目标。
        var active = document.activeElement;
        if ((active === document.body || dropdown.contains(active)) &&
            trigger.getClientRects().length) {
          trigger.focus({ preventScroll: true });
        }
      });
    });
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
      if (event.key === STORAGE_KEY || event.key === null) {
        applyMode(readStoredMode(), { persist: false });
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
