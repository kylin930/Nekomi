import { motion } from './motion';

export function createFeed(site, signal, saved) {
  const root = document.querySelector('[data-listing]');
  const list = document.getElementById('post-list');
  const title = document.getElementById('feed-title');
  const summary = document.getElementById('feed-summary');
  const status = document.getElementById('feed-status');
  const more = document.getElementById('load-more');
  const pagination = document.getElementById('feed-pagination');
  const sentinel = document.getElementById('feed-sentinel');
  const metadata = new Map(site.data.posts.map(post => [post.id, post]));
  const initialTitle = root.dataset.title, initialSummary = root.dataset.description;
  let cache = new Map([...list.children].map(card => [card.dataset.postId, card.outerHTML]));
  let normal = [...cache.keys()], next = root.dataset.next, pages = [location.pathname];
  let query = '', shown = 0, matches = [], busy = false, failed = false;
  let serial = 0, request, observer, searchTimer, deferred = false, focusPending = false;
  const pageCache = new Map();
  function restore(state) {
    if (!state) return;
    request?.abort(); clearTimeout(searchTimer); ++serial; busy = deferred = failed = focusPending = false;
    cache = new Map(state.cache); normal = state.normal; next = state.next; pages = state.pages;
    query = state.query; shown = state.shown; matches = find(query);
    if (list.dataset.restored !== 'true') list.innerHTML = state.html;
    delete list.dataset.restored;
  }
  function find(value) {
    const needle = value.trim().toLocaleLowerCase();
    return site.data.posts.filter(post => [post.title, post.excerpt, post.category, ...post.tags].join(' ').toLocaleLowerCase().includes(needle)).map(post => post.id);
  }
  function highlight(card) {
    const post = metadata.get(card.dataset.postId);
    card.querySelectorAll('[data-highlight]').forEach(node => {
      const original = node.closest('.post-title') ? post.title : post.excerpt;
      const index = query.trim() ? original.toLocaleLowerCase().indexOf(query.trim().toLocaleLowerCase()) : -1;
      if (index < 0) { node.textContent = original; return; }
      const mark = document.createElement('mark'); mark.textContent = original.slice(index, index + query.trim().length);
      node.replaceChildren(original.slice(0, index), mark, original.slice(index + query.trim().length));
    });
  }
  function hasMore() { return query.trim() ? shown < matches.length : Boolean(next); }
  function controls() {
    const searching = Boolean(query.trim());
    title.textContent = searching ? '搜索结果' : initialTitle;
    summary.textContent = searching ? `“${query.trim()}” · 找到 ${matches.length} 篇文章` : initialSummary;
    document.getElementById('search-toolbar').hidden = !searching;
    document.getElementById('search-chip').textContent = query;
    document.getElementById('search-empty').hidden = !searching || matches.length > 0;
    pagination.hidden = searching;
    const first = Number(root.dataset.page), last = first + pages.length - 1;
    pagination.querySelector('[data-page-label]').textContent = `第 ${first === last ? first : first + '–' + last} / ${root.dataset.pages} 页`;
    const link = pagination.querySelector('[data-page-next]');
    if (link) { link.hidden = !next; if (next) link.href = next; }
    more.hidden = !hasMore() && !failed;
    more.disabled = busy || deferred; more.loading = busy || deferred;
    more.textContent = failed ? '重试加载' : '加载更多';
    status.textContent = failed ? '暂时没能加载，点击重试。' : busy || deferred ? '正在加载文章…' : hasMore() ? `已显示 ${list.children.length} / ${searching ? matches.length : root.dataset.total} 篇` : (site.data.posts.length ? '已经读到最后了' : '');
    root.setAttribute('aria-busy', String(busy || deferred));
    if (focusPending && !busy && !deferred) queueMicrotask(focusResult);
  }
  function focusResult() {
    if (signal.aborted) return;
    if (busy || deferred) { focusPending = true; return; }
    focusPending = false;
    (list.querySelector('.post-title a') || title).focus();
  }
  async function fetchPage(url, controller) {
    if (pageCache.has(url)) return pageCache.get(url);
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'text/html' } });
    if (!response.ok) throw new Error('Page unavailable');
    const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
    const feed = doc.querySelector('[data-listing]');
    const cards = [...doc.querySelectorAll('#post-list .post-card')].map(card => [card.dataset.postId, card.outerHTML]);
    if (!feed || !cards.length) throw new Error('Invalid article page');
    const result = { cards, next: feed.dataset.next };
    pageCache.set(url, result);
    return result;
  }
  function append(ids, replace = false) {
    if (replace) list.replaceChildren();
    const existing = new Set([...list.children].map(card => card.dataset.postId));
    const fragment = document.createDocumentFragment();
    for (const id of ids) {
      if (existing.has(id) || !cache.has(id)) continue;
      const template = document.createElement('template'); template.innerHTML = cache.get(id);
      const card = template.content.firstElementChild;
      highlight(card); fragment.append(card); existing.add(id);
    }
    list.append(fragment);
    // Newly appended images use the same public fallback as initial images.
    site.recoverImages(list);
  }
  async function load(replace = false, manual = false) {
    if (busy || signal.aborted || !hasMore()) return;
    busy = true; failed = false; const turn = serial; const controller = request = new AbortController(); controls();
    try {
      if (query.trim()) {
        const ids = matches.slice(replace ? 0 : shown, (replace ? 0 : shown) + site.data.pageSize);
        const urls = [...new Set(ids.filter(id => !cache.has(id)).map(id => metadata.get(id).pageUrl))];
        // Search consults the complete metadata index, but fetches only pages
        // containing the next batch of matching results, never all pages eagerly.
        for (const url of urls) {
          const result = await fetchPage(url, controller);
          if (turn !== serial || signal.aborted) return;
          result.cards.forEach(([id, html]) => cache.set(id, html));
        }
        if (turn !== serial || signal.aborted) return;
        append(ids, replace); shown = (replace ? 0 : shown) + ids.length;
        if (replace) motion.enter(list, 4);
      } else {
        const url = next; const result = await fetchPage(url, controller);
        if (turn !== serial || signal.aborted) return;
        result.cards.forEach(([id, html]) => cache.set(id, html));
        const ids = result.cards.map(([id]) => id).filter(id => !normal.includes(id));
        append(ids); normal.push(...ids); pages.push(url); next = result.next;
        if (manual && ids.length) requestAnimationFrame(() => {
          if (!signal.aborted) [...list.children].find(card => card.dataset.postId === ids[0])?.querySelector('.post-title a')?.focus({ preventScroll: true });
        });
      }
    } catch (error) {
      if (error.name !== 'AbortError' && turn === serial && !signal.aborted) failed = true;
    } finally {
      if (turn === serial && !signal.aborted) {
        busy = false; controls();
        if (observer && !failed) { observer.unobserve(sentinel); observer.observe(sentinel); }
      }
    }
  }
  function search(value, animate = true) {
    if (value === query) { controls(); return; }
    request?.abort(); clearTimeout(searchTimer); ++serial; busy = deferred = failed = focusPending = false;
    query = value; matches = find(query); shown = 0;
    if (query.trim()) {
      const ids = matches.slice(0, site.data.pageSize);
      if (ids.every(id => cache.has(id))) { append(ids, true); shown = ids.length; }
      else {
        list.replaceChildren(); deferred = true;
        searchTimer = setTimeout(() => { deferred = false; load(true); }, 120);
      }
    } else append(normal, true);
    controls();
    if (animate) motion.enter(list, 4);
  }
  restore(saved); controls();
  more.addEventListener('click', () => load(shown === 0 && Boolean(query.trim()), true), { signal });
  if (site.data.content.infiniteScroll && 'IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting) && root.getClientRects().length && !failed && !deferred) load(shown === 0 && Boolean(query.trim()));
    }, { rootMargin: '360px 0px' });
    observer.observe(sentinel);
  }
  signal.addEventListener('abort', () => { ++serial; clearTimeout(searchTimer); request?.abort(); observer?.disconnect(); }, { once: true });
  return {
    search, focusResult, restore(state) { restore(state); controls(); },
    snapshot: () => {
      const copy = list.cloneNode(true);
      copy.querySelectorAll('[data-shared-title], [data-shared-cover]').forEach(element => element.style.removeProperty('view-transition-name'));
      return { cache: [...cache], normal: [...normal], next, pages: [...pages], query, shown,
        html: copy.innerHTML, title: title.textContent, summary: summary.textContent, empty: !document.getElementById('search-empty').hidden };
    },
  };
}
