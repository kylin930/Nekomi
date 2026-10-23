// Native View Transitions keep the shared pair outside the page-content snapshot.
// Names are armed for one navigation only, never for every card in the feed.
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let active;
const visible = element => {
  if (!element?.getClientRects().length) return false;
  const box = element.getBoundingClientRect();
  return box.bottom > 0 && box.top < innerHeight && box.right > 0 && box.left < innerWidth;
};
const find = (root, kind, id) => [...root.querySelectorAll(`[data-shared-${kind}]`)].find(element => element.dataset[kind === 'title' ? 'sharedTitle' : 'sharedCover'] === id);
function clear(state) {
  state.targets.forEach(element => { element.style.removeProperty('view-transition-name'); });
  state.targets.clear();
  state.cancelWarmup?.();
  clearTimeout(state.timer);
  if (active === state) active = undefined;
}
function name(state, element, kind) {
  element.style.viewTransitionName = 'post-' + kind;
  state.targets.add(element);
}
function postId(url, base) {
  const prefix = base + 'posts/';
  if (!url.pathname.startsWith(prefix)) return '';
  try { return decodeURIComponent(url.pathname.slice(prefix.length).replace(/\/$/, '')); } catch { return ''; }
}
export function prepareShared(event, base) {
  if (active) clear(active);
  if (reduced.matches || !document.startViewTransition) return;
  const from = postId(event.from, base);
  const to = postId(event.to, base);
  const id = event.from.pathname === base ? to : event.to.pathname === base ? from : '';
  if (!id) return;
  const title = find(document, 'title', id);
  if (!visible(title)) return;
  const state = active = { id, signal: event.signal, targets: new Set(), timer: 0, preload: undefined, cover: undefined };
  name(state, title, 'title');
  const cover = find(document, 'cover', id);
  if (visible(cover) && cover.querySelector('img')?.naturalWidth) state.cover = cover;
  event.signal.addEventListener('abort', () => clear(state), { once: true });
  return state;
}
export async function prepareSharedImage(state, incoming) {
  if (!state || active !== state || state.signal.aborted) return;
  if (!find(incoming, 'title', state.id)) { clear(state); return; }
  const cover = state.cover && find(incoming, 'cover', state.id);
  const image = cover?.querySelector('img');
  if (!image) return;
  // A bounded warmup avoids capturing a blank hero, without holding navigation
  // hostage to a slow or broken image. It never touches the wallpaper loader.
  const preload = state.preload = new Image();
  preload.sizes = image.sizes;
  preload.srcset = image.srcset;
  preload.src = image.src;
  let abort;
  const cancelled = new Promise(resolve => {
    abort = state.cancelWarmup = () => resolve(false);
    state.signal.addEventListener('abort', abort, { once: true });
  });
  const decoded = await Promise.race([
    cancelled,
    preload.decode().then(() => true, () => false),
    new Promise(resolve => { state.timer = setTimeout(() => resolve(false), 180); }),
  ]);
  state.signal.removeEventListener('abort', abort);
  state.cancelWarmup = undefined;
  clearTimeout(state.timer);
  if (decoded && active === state && !state.signal.aborted) name(state, state.cover, 'cover');
}
export function swapShared(event) {
  const state = active;
  if (!state || state.signal !== event.signal || reduced.matches) return;
  const title = find(event.newDocument, 'title', state.id);
  if (title) name(state, title, 'title');
  if (state.cover?.style.viewTransitionName === 'post-cover') {
    const cover = find(event.newDocument, 'cover', state.id);
    if (cover) name(state, cover, 'cover');
  }
  event.viewTransition.finished.then(() => clear(state), () => clear(state));
}
reduced.addEventListener('change', () => { if (reduced.matches && active) clear(active); });
