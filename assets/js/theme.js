/* MDUI 原生主题与菜单，两个入口共享一份用户偏好。 */
(function () {
  'use strict';
  if (!window.mdui) return;

  var KEY = 'nekomi-theme';
  var MODES = {
    light: { label: '浅色', icon: 'light_mode' },
    dark: { label: '深色', icon: 'dark_mode' },
    auto: { label: '跟随系统', icon: 'contrast' }
  };
  function read() {
    try {
      var value = localStorage.getItem(KEY);
      return Object.hasOwn(MODES, value) ? value : 'auto';
    } catch (_) { return 'auto'; }
  }
  var mode = read();
  mdui.setColorScheme('#476756');

  document.querySelectorAll('[data-theme-control]').forEach(function (container) {
    var placement = container.closest('.sidebar') ? 'top-end' : 'bottom-end';
    container.innerHTML = '<mdui-dropdown placement="' + placement + '">' +
      '<mdui-button-icon slot="trigger" class="theme-trigger">' +
        '<mdui-icon data-theme-glyph aria-hidden="true"></mdui-icon>' +
        '<span class="visually-hidden" data-theme-label></span>' +
      '</mdui-button-icon><mdui-menu selects="single" role="menu" aria-label="主题模式">' +
      Object.entries(MODES).map(function (entry) {
        return '<mdui-menu-item value="' + entry[0] + '" role="menuitemradio">' +
          '<mdui-icon slot="icon" name="' + entry[1].icon + '" aria-hidden="true"></mdui-icon>' +
          '<mdui-icon slot="selected-icon" name="check" aria-hidden="true"></mdui-icon>' +
          entry[1].label + '</mdui-menu-item>';
      }).join('') + '</mdui-menu></mdui-dropdown>';
  });

  function sync() {
    document.querySelectorAll('[data-theme-control]').forEach(function (container) {
      container.querySelector('[data-theme-glyph]').name = MODES[mode].icon;
      container.querySelector('[data-theme-label]').textContent = '切换主题，当前' + MODES[mode].label;
      container.querySelector('mdui-menu').value = mode;
      container.querySelectorAll('mdui-menu-item').forEach(function (item) {
        item.setAttribute('aria-checked', String(item.value === mode));
      });
    });
  }
  function apply(next, persist) {
    if (!Object.hasOwn(MODES, next)) return;
    mode = next;
    mdui.setTheme(mode);
    if (persist !== false) {
      try { localStorage.setItem(KEY, mode); } catch (_) { /* 当前会话仍可切换。 */ }
    }
    sync();
  }

  document.querySelectorAll('[data-theme-control] mdui-dropdown').forEach(function (dropdown) {
    var trigger = dropdown.querySelector('[slot="trigger"]');
    var menu = dropdown.querySelector('mdui-menu');
    NekomiA11y.buttonState(trigger, { 'aria-haspopup': 'menu', 'aria-expanded': 'false' });
    menu.addEventListener('change', function (event) {
      if (event.target !== menu) return;
      if (Object.hasOwn(MODES, menu.value) && menu.value !== mode) {
        apply(menu.value);
      } else {
        // Menu 允许取消单选。下一帧恢复，避免 Lit 合并掉 value 的回写。
        requestAnimationFrame(sync);
      }
    });
    ['open', 'close'].forEach(function (type) {
      dropdown.addEventListener(type, function (event) {
        if (event.target === dropdown) {
          NekomiA11y.buttonState(trigger, { 'aria-expanded': String(type === 'open') });
        }
      });
    });
    dropdown.addEventListener('closed', function (event) {
      // 2.1.5 Menu 的异步聚焦可能晚于 Dropdown 的自动恢复，仅补救丢失的焦点。
      if (event.target === dropdown && trigger.getClientRects().length &&
          (document.activeElement === document.body || dropdown.contains(document.activeElement))) {
        trigger.focus({ preventScroll: true });
      }
    });
  });
  window.addEventListener('storage', function (event) {
    if (event.key === KEY || event.key === null) apply(read(), false);
  });
  window.NekomiTheme = { getMode: function () { return mode; }, setMode: apply };
  apply(mode, false);
}());
