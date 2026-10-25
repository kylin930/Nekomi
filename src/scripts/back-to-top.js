import 'mdui/components/fab.js';
import { a11y } from './a11y';
import { motion } from './motion';

const initialized = new WeakSet();

// One controller for the persisted shell, not one per ClientRouter visit.
export async function initBackToTop() {
  const root = document.querySelector('[data-back-to-top]');
  if (!root || initialized.has(root)) return;
  initialized.add(root);
  const fab = root.querySelector('mdui-fab');
  await fab.updateComplete;
  a11y.buttonState(fab, { 'aria-label': fab.getAttribute('aria-label') });
  const overlaySelector = 'mdui-dialog, mdui-navigation-drawer[modal], mdui-snackbar';
  const overlays = new Set([...document.querySelectorAll(overlaySelector)].filter(node => node.open));
  let frame = 0;

  function show(visible) {
    root.classList.toggle('is-visible', visible);
    root.inert = !visible;
    root.setAttribute('aria-hidden', String(!visible));
  }
  function update() {
    frame = 0;
    for (const overlay of overlays) if (!overlay.isConnected) overlays.delete(overlay);
    show(scrollY > 400 && !overlays.size && !document.querySelector('.nekomi-lightbox'));
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(update); }
  fab.addEventListener('click', () => {
    // Move keyboard focus before the control disappears; do not add a Hash or
    // rewrite history/scroll restoration. The shared spring respects reduced motion.
    document.getElementById('main-content')?.focus({ preventScroll: true });
    motion.scrollTo(document.body, true);
  });
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('pageshow', schedule);
  document.addEventListener('astro:before-swap', () => show(false));
  ['astro:after-swap', 'astro:page-load'].forEach(type => document.addEventListener(type, schedule));
  // Keep the control unavailable until a native overlay has finished closing.
  ['open', 'closed'].forEach(type => document.addEventListener(type, event => {
    if (!event.target.matches?.(overlaySelector)) return;
    if (type === 'open') overlays.add(event.target); else overlays.delete(event.target);
    schedule();
  }, true));
  // PhotoSwipe mounts directly under body. Do not observe the whole article or
  // appended cards, or reach into a vendor's private DOM.
  new MutationObserver(schedule).observe(document.body, { childList: true });
  root.hidden = false;
  update();
}
