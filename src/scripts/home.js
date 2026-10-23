import { a11y } from './a11y';
import { motion } from './motion';

export function initHome(site, signal) {
  const tabs = document.getElementById('content-tabs');
  const cards = [...document.querySelectorAll('#post-list .post-card')];
  const feedTitle = document.getElementById('feed-title');
  const tabIds = ['recent', 'categories', 'tags', 'archive'];
  const path = location.pathname;
  let query = '';
  let booting = true;
  let previousTab = tabs.value;
  let searchMotion = 0;
  const texts = [...document.querySelectorAll('[data-highlight]')].map(node => [node, node.textContent]);
  const on = (element, event, listener) => element.addEventListener(event, listener, { signal });
  function renderFeed() {
    const needle = query.trim().toLocaleLowerCase();
    let count = 0;
    cards.forEach(card => { card.hidden = !card.dataset.searchText.includes(needle); if (!card.hidden) count++; });
    for (const [node, original] of texts) {
      const index = needle ? original.toLocaleLowerCase().indexOf(needle) : -1;
      if (index < 0) { node.textContent = original; continue; }
      const mark = document.createElement('mark');
      mark.textContent = original.slice(index, index + query.trim().length);
      node.replaceChildren(original.slice(0, index), mark, original.slice(index + query.trim().length));
    }
    feedTitle.textContent = needle ? '搜索结果' : '最近发布';
    document.getElementById('feed-summary').textContent = needle ? `“${query.trim()}” · 找到 ${count} 篇文章` : `${cards.length} 篇文章 · 按时间收录`;
    document.getElementById('search-toolbar').hidden = !needle;
    document.getElementById('search-chip').textContent = query.trim();
    document.getElementById('search-empty').hidden = count > 0;
  }
  function navigateTab(tab, push = true) {
    tabs.value = tabIds.includes(tab) ? tab : 'recent';
    const url = new URL(location.href);
    url.hash = tabs.value;
    if (query.trim() && tabs.value === 'recent') url.searchParams.set('q', query); else url.searchParams.delete('q');
    if (push && url.href !== location.href) history.pushState(history.state, '', url);
  }
  function setQuery(value, focus = false, fromLocation = false) {
    const hadQuery = Boolean(query.trim());
    query = String(value);
    site.setSearch(query);
    if (query.trim() && tabs.value !== 'recent') navigateTab('recent', !fromLocation);
    if (!fromLocation) {
      const url = new URL(location.href);
      if (query.trim()) url.searchParams.set('q', query); else url.searchParams.delete('q');
      history.replaceState(history.state, '', url);
    }
    renderFeed();
    clearTimeout(searchMotion);
    if (!booting) searchMotion = setTimeout(() => { if (!signal.aborted) motion.enter(document.getElementById('post-list'), 4); }, 100);
    if (focus) feedTitle.focus({ preventScroll: true });
    else if (!hadQuery && query.trim() && !site.drawer.open && !booting) feedTitle.scrollIntoView({ block: 'start' });
  }
  function readLocation() {
    if (location.pathname !== path) return;
    const raw = location.hash.slice(1);
    if (raw.startsWith('preview/')) {
      const id = decodeURIComponent(raw.slice(8));
      if (site.data.posts.some(post => post.id === id)) { site.go(site.postUrl(id), { history: 'replace' }); return; }
    }
    const tab = tabIds.includes(raw) ? raw : 'recent';
    navigateTab(tab, false);
    setQuery(tab === 'recent' ? new URLSearchParams(location.search).get('q') || '' : '', false, true);
    if (!tabIds.includes(raw)) { const url = new URL(location.href); url.hash = 'recent'; history.replaceState(history.state, '', url); }
  }
  a11y.tabs(tabs, signal);
  on(tabs, 'change', event => {
    if (event.target !== tabs) return;
    if (tabs.value !== 'recent' && query) { query = ''; site.setSearch(''); renderFeed(); }
    navigateTab(tabs.value);
    const direction = tabIds.indexOf(tabs.value) >= tabIds.indexOf(previousTab) ? 1 : -1;
    previousTab = tabs.value;
    if (!booting) requestAnimationFrame(() => { if (!signal.aborted) motion.enter(document.getElementById('panel-' + tabs.value), direction * 10); });
  });
  on(tabs, 'click', event => { const tab = event.target.closest('mdui-tab'); if (tab?.value === 'recent' && query) setQuery('', true); });
  on(window, 'popstate', readLocation);
  on(window, 'hashchange', readLocation);
  on(document, 'nekomi:search', event => setQuery(event.detail));
  on(document, 'nekomi:search-submit', async () => {
    await site.closeModal(site.drawer);
    if (!signal.aborted) (document.querySelector('#post-list .post-card:not([hidden]) .post-title a') || feedTitle).focus();
  });
  on(document.getElementById('search-chip'), 'delete', () => setQuery('', true));
  on(document, 'click', event => {
    const target = event.target.closest('[data-query], [data-clear-search]');
    if (!target || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || event.button) return;
    event.preventDefault();
    setQuery(target.hasAttribute('data-query') ? target.dataset.query : '', true);
  });
  signal.addEventListener('abort', () => clearTimeout(searchMotion), { once: true });
  readLocation();
  requestAnimationFrame(() => { if (!signal.aborted) booting = false; });
}
