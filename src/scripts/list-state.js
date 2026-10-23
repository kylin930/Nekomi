// Astro owns URL navigation and scroll coordinates. This bounded cache restores
// the *height and contents* of a list before Astro restores those coordinates.
const storageKey = 'nekomi-lists:' + import.meta.url + ':' + document.getElementById('site-data').dataset.version;
const snapshots = new Map();
try { for (const [key, value] of JSON.parse(sessionStorage.getItem(storageKey) || '[]')) snapshots.set(key, value); } catch { /* Memory-only browsing still works. */ }
let capture, restore, activeKey, activeURL;
const pending = new WeakMap();
let committing;
const key = () => crypto.randomUUID?.() || Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
function persist() {
  while (snapshots.size > 8) snapshots.delete(snapshots.keys().next().value);
  try {
    const rows = [...snapshots];
    let value = JSON.stringify(rows);
    while (value.length >= 1800000 && rows.length > 1) { rows.shift(); value = JSON.stringify(rows); }
    if (value.length < 1800000) sessionStorage.setItem(storageKey, value);
    else sessionStorage.removeItem(storageKey);
  } catch { /* Storage denial/quota never blocks navigation. */ }
}
export function saveList(overrides = {}) {
  if (!capture || !activeKey) return;
  const snapshot = { ...capture(), ...overrides, url: activeURL, x: scrollX, y: scrollY,
    height: document.getElementById('main-content').getBoundingClientRect().height };
  snapshots.delete(activeKey); snapshots.set(activeKey, snapshot); persist();
}
export function currentList() { return snapshots.get(history.state?.nekomiList); }
export function registerList(read, apply) {
  capture = read; restore = apply;
  activeKey = history.state?.nekomiList || key(); activeURL = location.href;
  history.replaceState({ ...history.state, nekomiList: activeKey }, '');
  return () => { saveList(); capture = restore = undefined; };
}
export function listURL(url, push = false, previousTab) {
  if (url.href === location.href) return;
  if (push) {
    saveList(previousTab ? { tab: previousTab } : {});
    activeKey = key();
    history.replaceState({ ...history.state, scrollX, scrollY }, '');
    history.pushState({ ...history.state, nekomiList: activeKey, scrollX, scrollY }, '', url);
  } else history.replaceState(history.state, '', url);
  activeURL = url.href;
}
function applySnapshot(doc, snapshot) {
  const list = doc.getElementById('post-list');
  if (!list || !snapshot?.feed) return;
  list.innerHTML = snapshot.feed.html;
  list.dataset.restored = 'true';
  // New MDUI slots render asynchronously. Reserve the previous content height
  // until they settle, so Astro's own scrollTo is not clamped to a short page.
  doc.getElementById('main-content').style.minHeight = snapshot.height + 'px';
  const tabs = doc.getElementById('content-tabs');
  if (tabs) {
    tabs.setAttribute('value', snapshot.tab);
    if ('value' in tabs) tabs.value = snapshot.tab;
    tabs.querySelectorAll('mdui-tab-panel').forEach(panel => { panel.hidden = panel.getAttribute('value') !== snapshot.tab; });
  }
  doc.getElementById('feed-title').textContent = snapshot.feed.title;
  doc.getElementById('feed-summary').textContent = snapshot.feed.summary;
  doc.getElementById('search-toolbar').hidden = !snapshot.query.trim();
  doc.getElementById('search-empty').hidden = !snapshot.feed.empty;
  doc.getElementById('search-chip').textContent = snapshot.query;
}
export function beforeListNavigation(event) {
  saveList();
  if (event.navigationType === 'traverse') return;
  if (document.body.dataset.page === 'home' && capture) pending.set(event.signal, { key: activeKey, url: activeURL, steps: 1 });
  else if (document.body.dataset.page === 'article' && validOrigin(history.state?.nekomiReturn)) {
    const origin = history.state.nekomiReturn;
    pending.set(event.signal, { ...origin, steps: origin.steps + (event.navigationType === 'replace' ? 0 : 1) });
  }
}
export function prepareListDocument(event) {
  if (event.navigationType !== 'traverse') return;
  const snapshot = currentList();
  if (snapshot && new URL(snapshot.url).pathname === event.to.pathname) applySnapshot(event.newDocument, snapshot);
}
export function prepareInitialList() {
  const snapshot = currentList();
  if (snapshot && new URL(snapshot.url).pathname === location.pathname && !document.getElementById('post-list')?.dataset.restored) applySnapshot(document, snapshot);
}
export function listWillSwap(event) { committing = { type: event.navigationType, origin: pending.get(event.signal) }; }
export function listDidSwap() {
  if (committing && committing.type !== 'traverse' && document.body.dataset.page === 'article' && committing.origin) history.replaceState({ ...history.state, nekomiReturn: committing.origin }, '');
  committing = undefined;
}
function validOrigin(origin) {
  if (!origin || !Number.isInteger(origin.steps) || origin.steps < 1 || origin.steps >= history.length || !snapshots.has(origin.key)) return false;
  try { return new URL(origin.url).origin === location.origin && snapshots.get(origin.key).url === origin.url; } catch { return false; }
}
export function returnToList(event) {
  if (event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
  if (!event.composedPath().some(node => node instanceof Element && node.hasAttribute('data-return-list'))) return;
  const origin = history.state?.nekomiReturn;
  if (!validOrigin(origin)) return;
  event.preventDefault(); history.go(-origin.steps);
}
export function pushArticleHash(hash) {
  const state = { ...history.state, scrollX, scrollY };
  history.replaceState(state, '');
  if (state.nekomiReturn) state.nekomiReturn = { ...state.nekomiReturn, steps: state.nekomiReturn.steps + 1 };
  history.pushState(state, '', hash);
}
window.addEventListener('pagehide', () => saveList());
// Hash-only history traversal can be handled synchronously by Astro. Restore
// panels first, including when their heights differ, without a scroll override.
window.addEventListener('popstate', () => {
  saveList();
  if (!capture || !activeURL || new URL(activeURL).pathname !== location.pathname || new URL(activeURL).search !== location.search) return;
  const snapshot = currentList();
  if (!snapshot) return;
  activeKey = history.state.nekomiList; activeURL = location.href;
  applySnapshot(document, snapshot); restore?.(snapshot);
}, { capture: true });
