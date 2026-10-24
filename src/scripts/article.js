import { a11y } from './a11y';
import { motion } from './motion';
import { pushArticleHash } from './list-state';

export function initArticle(site, signal, navigationType) {
  const body = document.getElementById('article-body');
  const headings = [...body.querySelectorAll('h2, h3, h4, h5, h6')];
  const copyEnabled = document.getElementById('reader').dataset.copyCode !== 'false';
  if (!copyEnabled) body.querySelectorAll('.copy-code').forEach(button => button.remove());
  const links = [...document.querySelectorAll('.toc-list mdui-list-item')];
  const lists = [...document.querySelectorAll('.toc-list')];
  let previousSection;
  let measureToc = true;
  const path = location.pathname;
  const inlineToc = document.getElementById('inline-toc-item');
  let frame = 0;
  let tocMoving = false;
  let pending = null;
  const timers = new Set();
  const on = (element, type, handler, options = {}) => element?.addEventListener(type, handler, { ...options, signal });
  function currentSection() {
    frame = 0;
    if (signal.aborted || !links.length || !headings.length) return;
    const offset = document.querySelector('.site-appbar').getBoundingClientRect().height + 32;
    let current = headings[0];
    for (const heading of headings) { if (heading.getBoundingClientRect().top <= offset) current = heading; else break; }
    if (Math.ceil(scrollY + innerHeight) >= document.documentElement.scrollHeight - 3) current = headings.at(-1);
    if (previousSection === current.id && !measureToc) return;
    previousSection = current.id;
    measureToc = false;
    for (const link of links) {
      const active = link.getAttribute('href') === '#' + encodeURIComponent(current.id);
      link.active = active;
      // The actual link lives in the public container part. Forward its current
      // location semantics without reproducing MDUI's native active visuals.
      if (active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
      const anchor = link.shadowRoot?.querySelector('a');
      if (active) anchor?.setAttribute('aria-current', 'location'); else anchor?.removeAttribute('aria-current');
    }
    positionMarkers();
  }
  function positionMarkers() {
    for (const list of lists) {
      const item = [...list.querySelectorAll('mdui-list-item')].find(item => item.active);
      if (!item) continue;
      const box = item.getBoundingClientRect();
      const y = box.top - list.getBoundingClientRect().top + 8;
      list.style.setProperty('--toc-marker-y', `${y}px`);
      list.style.setProperty('--toc-marker-height', `${Math.max(12, box.height - 16)}px`);
      list.dataset.positioned = '';
    }
  }
  function update() { if (!frame) frame = requestAnimationFrame(currentSection); }
  function scrollHash(smooth) {
    if (location.pathname !== path) return;
    if (tocMoving && document.querySelector('.toc-inline')?.getClientRects().length) { pending = smooth; return; }
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    if (!target || !body.contains(target)) return;
    target.tabIndex = -1;
    target.focus({ preventScroll: true });
    motion.scrollTo(target, smooth);
    update();
  }
  function settle() {
    tocMoving = false;
    measureToc = true; update();
    if (pending !== null) { const smooth = pending; pending = null; scrollHash(smooth); }
  }
  function legacyCopy(text) {
    const active = document.activeElement;
    const field = Object.assign(document.createElement('textarea'), { value: text, readOnly: true });
    field.style.cssText = 'position:fixed;left:-9999px';
    document.body.append(field);
    field.select();
    try { return document.execCommand('copy'); } finally { field.remove(); active?.focus({ preventScroll: true }); }
  }
  async function copyCode(button) {
    const code = button.closest('.code-block').querySelector('code').textContent;
    let copied = false;
    try { if (navigator.clipboard && isSecureContext) { await navigator.clipboard.writeText(code); copied = true; } } catch { /* Fall back below. */ }
    if (!copied) { try { copied = legacyCopy(code); } catch { /* Report a useful failure. */ } }
    if (signal.aborted) return;
    site.notify(copied ? '代码已复制' : '复制失败，请手动选择代码。');
    if (copied) {
      button.textContent = '已复制';
      const timer = setTimeout(() => { timers.delete(timer); button.textContent = '复制'; }, 2000);
      timers.add(timer);
    }
  }
  headings.forEach(heading => {
    if (heading.querySelector('.heading-anchor')) return;
    const anchor = document.createElement('a');
    anchor.className = 'heading-anchor';
    anchor.href = '#' + encodeURIComponent(heading.id);
    anchor.setAttribute('aria-label', '定位到：' + heading.textContent.trim());
    anchor.textContent = '#';
    heading.append(anchor);
  });
  document.querySelectorAll('.copy-code').forEach(button => a11y.buttonState(button, { 'aria-label': button.getAttribute('aria-label') }));
  const toggle = document.getElementById('toc-toggle');
  if (toggle) a11y.buttonState(toggle, { 'aria-expanded': 'false', 'aria-controls': 'toc-inline-list' });
  ['open', 'close'].forEach(type => on(inlineToc, type, () => {
    tocMoving = true;
    a11y.buttonState(toggle, { 'aria-expanded': String(type === 'open') });
    document.getElementById('toc-toggle-icon').name = type === 'open' ? 'expand_less' : 'expand_more';
  }));
  ['opened', 'closed'].forEach(type => on(inlineToc, type, settle));
  on(document, 'click', event => {
    const button = event.target.closest('.copy-code');
    if (button && copyEnabled) { copyCode(button); return; }
    const anchor = event.target.closest('.toc-list mdui-list-item, .heading-anchor, .prose a[href^="#"]');
    if (!anchor || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || event.button) return;
    const hash = new URL(anchor.getAttribute('href'), location.href).hash;
    let target;
    try { target = document.getElementById(decodeURIComponent(hash.slice(1))); } catch { return; }
    if (!target || !body.contains(target)) return;
    // Capture precedes ClientRouter's default same-document anchor handling.
    event.preventDefault();
    if (location.hash !== hash) pushArticleHash(hash);
    // Set pending first: Collapse closes on the next Lit update, before the final
    // offset is known. Its native closed event starts the spring at stable layout.
    if (anchor.closest('#toc-inline-list') && inlineToc.active) {
      pending = true;
      document.getElementById('inline-toc').value = '';
    } else scrollHash(true);
  }, { capture: true });
  on(window, 'hashchange', () => scrollHash(false));
  on(window, 'popstate', () => scrollHash(false));
  ['wheel', 'touchstart'].forEach(type => on(window, type, () => { pending = null; }, { passive: true }));
  on(site.drawer, 'open', () => { pending = null; motion.cancelScroll(); });
  if (links.length) on(window, 'scroll', update, { passive: true });
  if (links.length) on(window, 'resize', () => { motion.cancelScroll(); if (tocMoving && !document.querySelector('.toc-inline').getClientRects().length) settle(); update(); });
  // Let ClientRouter restore a traversed page's actual scroll position, rather than forcing its previous hash.
  if (navigationType !== 'traverse') scrollHash(false);
  const observer = links.length ? new ResizeObserver(() => { measureToc = true; update(); }) : null;
  lists.forEach(list => observer?.observe(list));
  currentSection();
  Promise.all(links.map(link => link.updateComplete)).then(() => { if (!signal.aborted) { measureToc = true; update(); } });
  return () => { observer?.disconnect(); cancelAnimationFrame(frame); timers.forEach(clearTimeout); motion.cancelScroll(); };
}
