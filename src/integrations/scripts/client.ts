import type { SiteConfig } from '../../config/site';
import type { ScriptHooks, ScriptCleanup, ScriptContext } from './types';
type Entry = SiteConfig['scripts']['global'][number];
const timeout = 15000;
const dispose = async (value: ScriptCleanup) => { if (typeof value === 'function') await value(); else if (value) await value.destroy(); };

export function createUserScripts(settings: SiteConfig['scripts'], base: string) {
  const registered = new Map<string, ScriptHooks>();
  const resources = new Map<string, Promise<Partial<ScriptHooks>>>();
  const sourceURL = (src: string) => new URL(src.startsWith('https://') ? src : base + src.replace(/^\//, ''), location.origin).href;
  const report = (src: string, error: unknown) => console.warn(`[Nekomi scripts] ${src}`, error);
  window.NekomiScripts = { register(src, hooks) {
    const url = new URL(src, location.href).href;
    if (registered.has(url) || typeof hooks?.mount !== 'function') throw new Error('Script register requires one mount lifecycle per source URL.');
    registered.set(url, hooks);
  } };
  function load(entry: Entry) {
    const url = sourceURL(entry.src);
    if (!resources.has(url)) resources.set(url, new Promise<Partial<ScriptHooks>>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      if (entry.type === 'module') script.type = 'module';
      else script.async = true;
      if (entry.integrity) { script.integrity = entry.integrity; script.crossOrigin = 'anonymous'; }
      const timer = setTimeout(() => { script.remove(); reject(new Error('Script resource timed out.')); }, timeout);
      script.addEventListener('error', () => { clearTimeout(timer); script.remove(); reject(new Error('Script resource failed (network/CORS/SRI).')); }, { once: true });
      script.addEventListener('load', async () => {
        clearTimeout(timer);
        try {
          // The browser module map reuses the already executed/verified module;
          // no second evaluation, and SRI is enforced by the native script load.
          const hooks = entry.type === 'module' ? await import(/* @vite-ignore */ url) : registered.get(url) || {};
          resolve(hooks);
        } catch (error) { reject(error); }
      }, { once: true });
      (entry.position === 'head' ? document.head : document.querySelector('[data-user-script-host]') || document.body).append(script);
    }));
    return resources.get(url)!;
  }
  const globals = new AbortController();
  const order = <T extends Entry>(entries: T[]) => [...entries].filter(entry => entry.enabled).sort((a, b) => Number(a.position !== 'head') - Number(b.position !== 'head'));
  function path() {
    const current = decodeURI(location.pathname);
    const prefix = decodeURI(base);
    const logical = current.startsWith(prefix) ? current.slice(prefix.length) : current.replace(/^\//, '');
    return logical ? '/' + logical.replace(/\/?$/, '/') : '/';
  }
  async function mount(entry: Entry, parent: AbortSignal, scope: 'global' | 'page') {
    const controller = new AbortController();
    const signal = controller.signal;
    const stop = () => controller.abort(parent.reason);
    parent.addEventListener('abort', stop, { once: true });
    signal.addEventListener('abort', () => parent.removeEventListener('abort', stop), { once: true });
    if (parent.aborted) stop();
    let container: HTMLElement | undefined;
    try {
      const hooks = await load(entry);
      if (signal.aborted) return;
      if (typeof hooks.mount !== 'function') {
        if (scope === 'page') throw new Error('Page scripts must export mount or register a lifecycle; do not create UI at module top level.');
        return; // Global side-effect libraries still execute only once.
      }
      container = document.createElement('div');
      container.dataset.userScript = entry.src;
      container.style.display = 'contents';
      (scope === 'global' ? document.querySelector('[data-user-script-host]') || document.body : document.getElementById('main-content')!).append(container);
      let cleanup: ScriptCleanup = undefined;
      const remove = () => { const value = cleanup; cleanup = undefined; void dispose(value).catch(error => report(entry.src, error)); container?.remove(); };
      signal.addEventListener('abort', remove, { once: true });
      const context: ScriptContext = { container, signal, scope, base, path: path(), url: new URL(location.href), on(target, type, listener, options = {}) { target.addEventListener(type, listener, { ...options, signal }); } };
      const pending = Promise.resolve().then(() => { signal.throwIfAborted(); return hooks.mount!(context); });
      // A late async mount still receives cancellation and its cleanup is run.
      cleanup = await new Promise<ScriptCleanup>((resolve, reject) => {
        const timer = setTimeout(() => controller.abort(new DOMException('Script mount timed out.', 'TimeoutError')), timeout);
        const interrupted = () => reject(signal.reason || new DOMException('Aborted', 'AbortError'));
        signal.addEventListener('abort', interrupted, { once: true });
        pending.then(value => {
          if (signal.aborted) void dispose(value).catch(error => report(entry.src, error));
          else resolve(value);
        }, reject).finally(() => { clearTimeout(timer); signal.removeEventListener('abort', interrupted); });
      });
      if (signal.aborted) { const value = cleanup; cleanup = undefined; await dispose(value); }
    } catch (error) {
      const cancelled = parent.aborted;
      controller.abort(); container?.remove();
      if (!cancelled) report(entry.src, error);
    }
  }
  const boot = (async () => { for (const entry of order(settings.global)) await mount(entry, globals.signal, 'global'); })();
  let current: AbortSignal | undefined;
  function enterPage(signal: AbortSignal) {
    if (current === signal) return;
    current = signal;
    const entries = order(settings.byPage.filter(entry => decodeURI(entry.path) === path()));
    void boot.then(async () => {
      for (const entry of entries) { if (signal.aborted) break; await mount(entry, signal, 'page'); }
    });
  }
  window.addEventListener('pagehide', event => { if (!event.persisted) globals.abort(); });
  return { enterPage };
}
