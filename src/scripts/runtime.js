import './mdui';
import { prefetch } from 'astro:prefetch';
import { navigate, swapFunctions } from 'astro:transitions/client';
import { a11y } from './a11y';
import { motion } from './motion';
import { createTheme } from './theme';
import { initHome } from './home';
import { initArticle } from './article';
import { prepareShared, prepareSharedImage, swapShared } from './navigation-motion';

// This bundled module executes once. Only page-local enhancements are renewed by page-load.
const data = JSON.parse(document.getElementById('site-data').textContent);
let theme;
let site;
let boot;
let pageController;
let disposePage;
let generation = 0;
let visited = false;
let navigationType;
const base = new URL(data.base, location.origin);
const postUrl = id => new URL('posts/' + encodeURIComponent(id) + '/', base).href;
const filterUrl = query => new URL('?q=' + encodeURIComponent(query) + '#recent', base).href;
const closing = new WeakMap();
function waitForClosed(component) {
  if (!closing.has(component)) closing.set(component, new Promise(resolve => {
    component.addEventListener('closed', () => setTimeout(() => { closing.delete(component); resolve(); }, 0), { once: true });
  }));
  return closing.get(component);
}
function closeModal(component) {
  if (!component) return Promise.resolve();
  if (closing.has(component)) return closing.get(component);
  if (!component.open) return Promise.resolve();
  const done = waitForClosed(component);
  component.open = false;
  return done;
}
function imageFailure(image) {
  if (!(image instanceof HTMLImageElement)) return;
  if (image.matches('[data-cover]')) image.closest('.post-cover')?.remove();
  else if (image.matches('[data-avatar]')) image.remove();
  else if (image.matches('[data-hero]')) image.closest('figure')?.remove();
  else if (image.matches('.prose img')) {
    const note = document.createElement('p'); note.className = 'image-fallback'; note.setAttribute('role', 'note');
    note.textContent = '图片暂时无法显示' + (image.alt ? '：' + image.alt : ''); image.replaceWith(note);
  }
}
function recoverImages(root) {
  root.querySelectorAll('img').forEach(image => { if (image.complete && image.currentSrc && !image.naturalWidth) imageFailure(image); });
}
function createSite() {
  const drawer = document.getElementById('mobile-drawer');
  const menu = document.getElementById('menu-button');
  const drawerClose = document.getElementById('drawer-close');
  const friendsDialog = document.getElementById('friends-dialog');
  [drawer, friendsDialog].forEach(component => component.addEventListener('close', () => { waitForClosed(component); }));
  const mobile = matchMedia('(max-width: 1119px)');
  let search = '';
  function setSearch(value) { search = String(value); document.querySelectorAll('[data-search]').forEach(field => { field.value = search; }); }
  function openDrawer(find = false) { drawerClose.autofocus = !find; drawer.querySelector('[data-search]').autofocus = find; drawer.open = true; }
  function notify(text) { const feedback = document.getElementById('site-feedback'); feedback.textContent = text; feedback.open = true; }
  document.querySelectorAll('.sidebar-tabs').forEach(tabs => {
    a11y.tabs(tabs);
    let previous = tabs.value;
    tabs.addEventListener('change', event => {
      if (event.target !== tabs) return;
      const panel = [...tabs.querySelectorAll('mdui-tab-panel')].find(panel => panel.value === tabs.value);
      const values = [...tabs.querySelectorAll('mdui-tab')].map(tab => tab.value);
      const direction = values.indexOf(tabs.value) >= values.indexOf(previous) ? 1 : -1;
      previous = tabs.value;
      if (panel) requestAnimationFrame(() => motion.enter(panel.querySelector('.side-panel-content'), direction * 6));
    });
  });
  menu.addEventListener('click', () => openDrawer());
  drawerClose.addEventListener('click', () => { drawer.open = false; });
  a11y.buttonState(menu, { 'aria-controls': 'mobile-drawer', 'aria-expanded': 'false', 'aria-haspopup': 'dialog' });
  ['open', 'close'].forEach(type => drawer.addEventListener(type, event => {
    if (event.target === drawer) a11y.buttonState(menu, { 'aria-expanded': String(type === 'open') });
  }));
  mobile.addEventListener('change', () => { if (!mobile.matches) drawer.open = false; });
  document.addEventListener('click', async event => {
    const target = event.target.closest('[data-theme-cycle], [data-friends-all], #friends-close');
    if (target?.matches('[data-theme-cycle]')) { const modes = ['light', 'dark', 'auto']; theme.setMode(modes[(modes.indexOf(theme.getMode()) + 1) % 3]); }
    if (target?.matches('[data-friends-all]') && !target.disabled) { await closeModal(drawer); friendsDialog.open = true; }
    if (target?.id === 'friends-close') friendsDialog.open = false;
  });
  document.addEventListener('input', event => {
    const field = event.target.closest('[data-search]');
    if (!field) return;
    setSearch(field.value);
    document.dispatchEvent(new CustomEvent('nekomi:search', { detail: search }));
  });
  document.addEventListener('keydown', async event => {
    const field = event.target.closest('[data-search]');
    if (field && !event.isComposing) {
      if (event.key === 'Escape' && !drawer.open && search) { event.preventDefault(); setSearch(''); document.dispatchEvent(new CustomEvent('nekomi:search', { detail: '' })); }
      if (event.key === 'Enter' && search.trim()) {
        event.preventDefault();
        if (document.body.dataset.page === 'home') document.dispatchEvent(new Event('nekomi:search-submit'));
        else { await closeModal(drawer); await navigate(filterUrl(search)); document.querySelector('#post-list .post-card:not([hidden]) .post-title a')?.focus(); }
      }
      return;
    }
    const active = document.activeElement;
    if (event.key !== '/' || event.isComposing || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || active.isContentEditable || active.matches('input, textarea, select, mdui-text-field')) return;
    event.preventDefault();
    if (mobile.matches && !drawer.open) openDrawer(true); else document.querySelector(`[data-sidebar="${mobile.matches ? 'mobile' : 'desktop'}"] [data-search]`).focus();
  });
  document.addEventListener('error', event => imageFailure(event.target), true);
  // Top App Bar Title clones its content into its own shadow root. Image error
  // events are not composed, so handle those copies at that root as well.
  const title = document.querySelector('mdui-top-app-bar-title');
  title.updateComplete.then(() => {
    title.shadowRoot.addEventListener('error', event => imageFailure(event.target), true);
    recoverImages(title.shadowRoot);
  });
  // Astro handles ordinary anchors. This bridge also handles MDUI links clicked through nested icon shadow roots.
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    const path = event.composedPath();
    if (!path.some(node => node instanceof Element && node.localName.startsWith('mdui-'))) return;
    const link = path.find(node => node instanceof HTMLAnchorElement);
    if (!link || link.hasAttribute('download') || link.dataset.astroReload !== undefined || link.target && link.target !== '_self') return;
    const url = new URL(link.href);
    if (url.origin !== location.origin || !url.pathname.startsWith(data.base) || url.pathname === location.pathname && url.search === location.search && url.hash) return;
    event.preventDefault();
    navigate(url.href, { sourceElement: link });
  }, true);
  // Astro's anchor discovery does not cross Web Component shadow roots. Use its
  // public, deduplicating API only for explicitly opted-in MDUI navigation links.
  let prefetchTimer;
  const cancelPrefetch = () => { clearTimeout(prefetchTimer); };
  const hoverPrefetch = event => {
    const link = event.target.closest('mdui-button[data-astro-prefetch="hover"], mdui-card[data-astro-prefetch="hover"]');
    if (!link?.href || link.contains(event.relatedTarget)) return;
    cancelPrefetch();
    prefetchTimer = setTimeout(() => prefetch(new URL(link.href, location.href).href), 80);
  };
  ['pointerover', 'focusin'].forEach(type => document.addEventListener(type, hoverPrefetch, { passive: true }));
  ['pointerout', 'focusout', 'astro:before-preparation'].forEach(type => document.addEventListener(type, cancelPrefetch, { passive: true }));
  return { data, drawer, setSearch, notify, postUrl, closeModal, go: navigate };
}
async function initialize() {
  const current = ++generation;
  if (!boot) boot = customElements.whenDefined('mdui-tabs').then(() => {
    theme = createTheme(data);
    site = createSite();
  });
  await boot;
  if (current !== generation) return;
  theme.syncDocument();
  // Static images may finish before the bundled runtime on a direct visit.
  recoverImages(document);
  motion.cancelWithin(document.getElementById('main-content'));
  pageController?.abort();
  disposePage?.();
  pageController = new AbortController();
  const signal = pageController.signal;
  document.querySelectorAll('[data-site-sidebar] [data-post], [data-sidebar=mobile] [data-post]').forEach(item => { item.active = item.dataset.post === document.body.dataset.postId; });
  if (document.body.dataset.page === 'home') { initHome(site, signal); disposePage = undefined; }
  else if (document.body.dataset.page === 'article') disposePage = initArticle(site, signal, navigationType);
  else disposePage = undefined;
  document.getElementById('main-content').dataset.enhanced = 'true';
  if (!visited) motion.enter(document.getElementById('main-content'));
  else if (!location.hash && navigationType !== 'traverse') document.getElementById('main-content').focus({ preventScroll: true });
  visited = true;
}
document.addEventListener('astro:before-preparation', event => {
  navigationType = event.navigationType;
  motion.cancelScroll();
  const shared = prepareShared(event, data.base);
  // Complete native modal closure before ClientRouter replaces the main content.
  const loader = event.loader;
  event.loader = async () => {
    await closeModal(site?.drawer);
    await closeModal(document.getElementById('friends-dialog'));
    await loader();
    await prepareSharedImage(shared, event.newDocument);
  };
});
document.addEventListener('astro:before-swap', event => {
  ++generation;
  motion.cancelWithin(document.getElementById('main-content'));
  pageController?.abort();
  disposePage?.();
  disposePage = undefined;
  theme?.prepareSwap(event.newDocument);
  swapShared(event);
  const incoming = event.newDocument;
  const nextLayout = incoming.querySelector('.site-layout');
  const nextMain = incoming.getElementById('main-content');
  if (!nextLayout || !nextMain) return;
  // MDUI 2.1.5's resize observers cannot disconnect twice in the same task.
  // Use Astro's supported swap hook: keep the persisted shell in its actual position,
  // and replace only the server-rendered main/TOC. No MDUI internals are patched.
  event.swap = () => {
    const restoreFocus = swapFunctions.saveFocus();
    swapFunctions.deselectScripts(incoming);
    swapFunctions.swapRootAttributes(incoming);
    swapFunctions.swapHeadElements(incoming);
    for (const attr of [...document.body.attributes]) document.body.removeAttribute(attr.name);
    for (const attr of [...incoming.body.attributes]) document.body.setAttribute(attr.name, attr.value);
    const layout = document.querySelector('.site-layout');
    layout.className = nextLayout.className;
    document.getElementById('main-content').replaceWith(nextMain);
    layout.querySelector(':scope > .reading-toc')?.remove();
    const toc = nextLayout.querySelector(':scope > .reading-toc');
    if (toc) layout.append(toc);
    document.body.querySelectorAll(':scope > script, :scope > .astro-route-announcer').forEach(node => node.remove());
    document.body.append(...incoming.body.querySelectorAll(':scope > script'));
    restoreFocus();
  };
});
document.addEventListener('astro:page-load', initialize);
