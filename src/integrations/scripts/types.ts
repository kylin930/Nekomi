/** Public browser-only extension contract. JSON options never contain code. */
export interface ScriptContext {
  container: HTMLElement;
  signal: AbortSignal;
  /** Canonical site-relative path, without the deployment base. */
  path: string;
  url: URL;
  base: string;
  scope: 'global' | 'page';
  /** Listener automatically removed when this lifecycle ends. */
  on(target: EventTarget, type: string, listener: EventListener, options?: AddEventListenerOptions): void;
}
export type ScriptCleanup = void | (() => void | Promise<void>) | { destroy(): void | Promise<void> };
export interface ScriptHooks { mount(context: ScriptContext): ScriptCleanup | Promise<ScriptCleanup> }
export interface ScriptRegistry { register(src: string, hooks: ScriptHooks): void }
declare global { interface Window { NekomiScripts?: ScriptRegistry } }
