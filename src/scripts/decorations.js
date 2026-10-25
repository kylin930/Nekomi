// Decorative, non-interactive images stay outside third-party comment frames.
// A scope belongs either to the persistent shell or to one abortable article.
export function initDecorations(root, signal) {
  const nodes = [...root.querySelectorAll('[data-decoration]')];
  if (!nodes.length) return;
  const mobile = matchMedia('(max-width: 1119px)');
  const system = matchMedia('(prefers-color-scheme: dark)');
  const cleanups = [];
  for (const node of nodes) {
    const sidebar = node.dataset.decoration === 'sidebar';
    const drawer = node.closest('#mobile-drawer');
    const parent = node.parentElement;
    const anchor = sidebar ? parent.querySelector(drawer ? '[data-sidebar]' : '.sidebar-settings') : null;
    const section = node.closest('[data-comments-section]');
    const mount = section?.querySelector('[data-comments-mount]');
    let source = '';
    let loaded = '';
    let pending;
    let stopped = false;
    let frame;
    function update() {
      frame = undefined;
      if (stopped) return;
      const allowed = sidebar
        ? (drawer ? mobile.matches && drawer.open : !mobile.matches)
        : !mobile.matches || node.dataset.mobile === 'true';
      // Measure only real content, never the decoration itself. No nested scroll areas.
      const available = sidebar && anchor ? Math.floor(innerHeight - 52 - anchor.getBoundingClientRect().bottom) : 0;
      if (!allowed || sidebar && available < 120) { node.hidden = true; return; }
      const dark = document.documentElement.classList.contains('mdui-theme-dark') || document.documentElement.classList.contains('mdui-theme-auto') && system.matches;
      const next = dark ? node.dataset.dark : node.dataset.light;
      if (next !== source) {
        source = next;
        if (pending) { pending.onload = pending.onerror = null; pending.src = ''; }
        const image = pending = new Image();
        image.alt = ''; image.draggable = false; image.decoding = 'async'; image.fetchPriority = 'low';
        image.onload = () => {
          if (stopped || pending !== image) return;
          pending = undefined; loaded = next;
          node.replaceChildren(image);
          schedule();
        };
        image.onerror = () => {
          if (stopped || pending !== image) return;
          pending = undefined; loaded = ''; node.hidden = true;
        };
        image.src = next;
      }
      if (!loaded || loaded !== source) { node.hidden = true; return; }
      // A custom widget may require more space than an independent right rail.
      // Measure our own mount only; never inspect a vendor's iframe/private DOM.
      if (mount && mount.scrollWidth > mount.clientWidth + 1) section.dataset.decorationLayout = 'stacked';
      if (sidebar) {
        const image = node.querySelector('img');
        const x = Number(node.dataset.x), y = Number(node.dataset.y);
        // clientWidth includes the Drawer's padding; the slot occupies its content box.
        const padding = getComputedStyle(parent);
        const contentWidth = parent.clientWidth - parseFloat(padding.paddingLeft) - parseFloat(padding.paddingRight);
        const width = Math.min(Number(node.dataset.width), contentWidth - Math.abs(x) * 2, (available - Math.abs(y) * 2) * image.naturalWidth / image.naturalHeight, 320 * image.naturalWidth / image.naturalHeight);
        if (width < 64) { node.hidden = true; return; }
        const height = width * image.naturalHeight / image.naturalWidth;
        const left = (node.dataset.align === 'center' ? (contentWidth - width) / 2 : contentWidth - width) + x;
        image.style.width = width + 'px';
        image.style.left = Math.max(0, Math.min(contentWidth - width, left)) + 'px';
        image.style.top = Math.max(0, Math.min(available - height, available - height + y)) + 'px';
        node.style.height = available + 'px';
      }
      node.hidden = false;
    }
    function schedule() { if (!stopped && frame === undefined) frame = requestAnimationFrame(update); }
    const observer = new ResizeObserver(schedule);
    if (anchor) observer.observe(anchor);
    if (mount) observer.observe(mount);
    if (sidebar) {
      const content = parent.querySelector('[data-sidebar]');
      if (content) observer.observe(content);
    }
    window.addEventListener('resize', schedule);
    document.addEventListener('nekomi:theme', schedule);
    system.addEventListener('change', schedule);
    if (drawer) { drawer.addEventListener('opened', schedule); drawer.addEventListener('closed', schedule); }
    cleanups.push(() => {
      stopped = true; cancelAnimationFrame(frame); observer.disconnect();
      window.removeEventListener('resize', schedule);
      document.removeEventListener('nekomi:theme', schedule);
      system.removeEventListener('change', schedule);
      if (drawer) { drawer.removeEventListener('opened', schedule); drawer.removeEventListener('closed', schedule); }
      if (pending) { pending.onload = pending.onerror = null; pending.src = ''; pending = undefined; }
    });
    schedule();
  }
  const dispose = () => cleanups.forEach(cleanup => cleanup());
  if (signal?.aborted) dispose();
  else signal?.addEventListener('abort', dispose, { once: true });
  return dispose;
}
