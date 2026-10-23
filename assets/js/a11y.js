/* MDUI 2.1.5 未提供完整的 Tabs 键盘/ARIA 和图标按钮 ARIA 转发。
 * 这里只补齐无障碍语义；激活、面板切换和模态焦点仍由组件完成。
 */
(function () {
  'use strict';

  function buttonState(element, attributes) {
    Object.entries(attributes).forEach(function (entry) {
      element.setAttribute(entry[0], entry[1]);
    });
    element.updateComplete.then(function () {
      // 固定版本的公开 button part；不修改结构、样式或组件状态。
      var button = element.shadowRoot.querySelector('[part~="button"]');
      if (button) {
        Object.entries(attributes).forEach(function (entry) {
          button.setAttribute(entry[0], entry[1]);
        });
      }
    });
  }

  function tabsAccessibility(tabs) {
    var items = Array.from(tabs.querySelectorAll('mdui-tab'));
    function sync() {
      items.forEach(function (tab) {
        var selected = tab.value === tabs.value;
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
      });
    }
    tabs.updateComplete.then(function () {
      var container = tabs.shadowRoot.querySelector('[part="container"]');
      container.setAttribute('role', 'tablist');
      container.setAttribute('aria-label', tabs.getAttribute('aria-label') || '内容导航');
      sync();
    });
    tabs.addEventListener('change', function (event) {
      if (event.target === tabs) sync();
    });
    tabs.addEventListener('keydown', function (event) {
      var current = event.target.closest('mdui-tab');
      var index = items.indexOf(current);
      if (index < 0 || event.altKey || event.ctrlKey || event.metaKey) return;
      var next;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = items.length - 1;
      var direction = getComputedStyle(tabs).direction === 'rtl' ? -1 : 1;
      if (event.key === 'ArrowRight') next = (index + direction + items.length) % items.length;
      if (event.key === 'ArrowLeft') next = (index - direction + items.length) % items.length;
      if (event.key === 'Enter' || event.key === ' ') next = index;
      if (next === undefined) return;
      event.preventDefault();
      items[next].focus({ preventScroll: true });
      items[next].click();
    });
  }

  window.NekomiA11y = { buttonState: buttonState, tabs: tabsAccessibility };
}());
