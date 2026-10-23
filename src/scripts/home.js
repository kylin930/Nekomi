import { a11y } from './a11y';
import { motion } from './motion';
import { createFeed } from './feed';
import { currentList, registerList, listURL, prepareInitialList } from './list-state';

export function initHome(site, signal) {
  const tabs = document.getElementById('content-tabs');
  const title = document.getElementById('feed-title');
  const path = location.pathname;
  const tabIds = ['recent', 'categories', 'tags', 'archive'];
  prepareInitialList();
  const snapshot = currentList();
  const feed = createFeed(site, signal, snapshot?.feed);
  let query = snapshot?.query || '';
  let booting = true, changing = false;
  let previousTab = snapshot?.tab || tabs?.getAttribute('value') || 'recent';
  let searchMotion;
  const on = (element, event, listener) => element?.addEventListener(event, listener, { signal });
  function showTab(value) {
    if (!tabs) return;
    tabs.value = value;
    tabs.querySelectorAll('mdui-tab-panel').forEach(panel => { panel.hidden = panel.value !== value; });
  }
  function navigateTab(value, push = true) {
    const url = new URL(location.href);
    url.hash = value;
    if (value !== 'recent') url.searchParams.delete('q');
    listURL(url, push, previousTab);
    previousTab = value;
    showTab(value);
  }
  function setQuery(value, focus = false, fromLocation = false) {
    const hadQuery = Boolean(query.trim());
    if (String(value).trim() && tabs && tabs.value !== 'recent') navigateTab('recent', !fromLocation);
    query = String(value); site.setSearch(query);
    if (!fromLocation) {
      const url = new URL(location.href);
      if (query.trim()) url.searchParams.set('q', query); else url.searchParams.delete('q');
      listURL(url);
    }
    feed.search(query, false);
    clearTimeout(searchMotion);
    if (!booting) searchMotion = setTimeout(() => { if (!signal.aborted) motion.enter(document.getElementById('post-list'), 4); }, 100);
    if (focus) title.focus({ preventScroll: true });
    else if (!hadQuery && query.trim() && !site.drawer.open && !booting) title.scrollIntoView({ block: 'start' });
  }
  const unregister = registerList(
    () => ({ tab: tabs?.value || 'recent', query, feed: feed.snapshot() }),
    saved => { changing = true; query = saved.query; feed.restore(saved.feed); showTab(saved.tab); previousTab = saved.tab; site.setSearch(query); changing = false; },
  );
  function readLocation() {
    if (location.pathname !== path) return;
    changing = true;
    const raw = location.hash.slice(1);
    if (raw.startsWith('preview/')) {
      try { const id = decodeURIComponent(raw.slice(8)); if (site.data.posts.some(post => post.id === id)) { site.go(site.postUrl(id), { history: 'replace' }); return; } } catch { /* Keep malformed legacy fragments readable. */ }
    }
    const value = tabIds.includes(raw) ? raw : tabs?.dataset.initialTab || 'recent';
    showTab(value); previousTab = value;
    setQuery(value === 'recent' ? new URLSearchParams(location.search).get('q') || '' : '', false, true);
    if (tabs && !tabIds.includes(raw)) { const url = new URL(location.href); url.hash = value; listURL(url); }
    changing = false;
  }
  if (tabs) a11y.tabs(tabs, signal);
  on(tabs, 'change', event => {
    if (event.target !== tabs || changing || tabs.value === previousTab) return;
    const value = tabs.value;
    const direction = tabIds.indexOf(value) >= tabIds.indexOf(previousTab) ? 1 : -1;
    navigateTab(value, !booting);
    if (value !== 'recent' && query) { query = ''; site.setSearch(''); feed.search('', false); }
    if (!booting) requestAnimationFrame(() => { if (!signal.aborted) motion.enter(document.getElementById('panel-' + value), direction * 10); });
  });
  on(tabs, 'click', event => { const tab = event.target.closest('mdui-tab'); if (tab?.value === 'recent' && query) setQuery('', true); });
  on(window, 'popstate', readLocation);
  on(window, 'hashchange', readLocation);
  on(document, 'nekomi:search', event => setQuery(event.detail));
  on(document, 'nekomi:search-submit', async () => {
    await site.closeModal(site.drawer);
    if (!signal.aborted) feed.focusResult();
  });
  on(document.getElementById('search-chip'), 'delete', () => setQuery('', true));
  on(document, 'click', event => {
    const target = event.target.closest('[data-query], [data-clear-search]');
    if (!target || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || event.button) return;
    event.preventDefault(); setQuery(target.hasAttribute('data-query') ? target.dataset.query : '', true);
  });
  signal.addEventListener('abort', () => clearTimeout(searchMotion), { once: true });
  readLocation();
  const main = document.getElementById('main-content');
  Promise.all([...main.querySelectorAll('*')].map(element => element.updateComplete)).then(() => {
    requestAnimationFrame(() => { if (!signal.aborted) main.style.removeProperty('min-height'); });
  });
  requestAnimationFrame(() => { if (!signal.aborted) booting = false; });
  return unregister;
}
