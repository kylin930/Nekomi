import { a11y } from './a11y';

// Closed details may still report client rects despite being unpainted.
export function isContentVisible(element) {
  return element.checkVisibility
    ? element.checkVisibility()
    : !!element.getClientRects().length &&
        !element.closest('details:not([open])');
}

// Native MDUI owns panel activation; hidden only prevents pre-upgrade flashes.
export function initContentTabs(body, signal) {
  for (const tabs of body.querySelectorAll('[data-md-tabs]')) {
    a11y.tabs(tabs, signal);
    const sync = async (event) => {
      if (event && event.target !== tabs) return;
      await tabs.updateComplete;
      const panels = [...tabs.querySelectorAll(':scope > mdui-tab-panel')];
      await Promise.all(panels.map((panel) => panel.updateComplete));
      if (signal.aborted) return;
      panels.forEach((panel) => {
        panel.hidden = false;
      });
      document.dispatchEvent(new Event('nekomi:content-change'));
    };
    tabs.addEventListener('change', sync, { signal });
    void sync();
  }
}

// Reveal existing DOM, never duplicate Markdown or its heading IDs.
export function revealContentTarget(target) {
  const ancestors = [];
  for (let node = target.parentElement; node; node = node.parentElement)
    ancestors.unshift(node);
  const needsReveal = ancestors.some(
    (node) =>
      (node.localName === 'details' && !node.open) ||
      (node.localName === 'mdui-tab-panel' &&
        node.parentElement.matches('[data-md-tabs]') &&
        (node.hidden ||
          node.parentElement.value !== node.getAttribute('value') ||
          !node.getClientRects().length)),
  );
  if (!needsReveal) return;
  return (async () => {
    for (const node of ancestors) {
      if (node.localName === 'details') node.open = true;
      if (
        node.localName === 'mdui-tab-panel' &&
        node.parentElement.matches('[data-md-tabs]')
      ) {
        const tabs = node.parentElement;
        tabs.value = node.getAttribute('value');
        tabs.querySelectorAll(':scope > mdui-tab-panel').forEach((panel) => {
          panel.hidden = false;
        });
        await tabs.updateComplete;
        await node.updateComplete;
      }
    }
    await new Promise(requestAnimationFrame);
  })();
}
