import { assets } from "./catalog";
import type { CommentSettings, CommentTheme, CommentPost } from "./types";
type SDKInstance = {
  update?(options: Record<string, unknown>): void;
  destroy?(): void;
  setDarkMode?(dark: boolean): void;
  on?(name: string, callback: () => void): void;
};
interface SDKs extends Window {
  Waline?: { init(options: Record<string, unknown>): SDKInstance | null };
  twikoo?: {
    init(options: Record<string, unknown>): Promise<void>;
    getCommentsCount(
      options: Record<string, unknown>,
    ): Promise<{ url: string; count: number }[]>;
    getRecentComments(options: Record<string, unknown>): Promise<unknown[]>;
  };
  Artalk?: { init(options: Record<string, unknown>): SDKInstance };
}
const sdkWindow = window as SDKs;
const root = document.getElementById("comments")!;
let channel = "",
  initialized = false,
  instance: SDKInstance | undefined,
  resize: ResizeObserver | undefined;
let current: {
  settings: CommentSettings;
  post?: CommentPost;
  theme?: CommentTheme;
  base: string;
  mode: string;
  limit?: number;
};
let giscusFrame: HTMLIFrameElement | undefined;
let giscusOrigin = "https://giscus.app";
const send = (type: string, value?: unknown) =>
  parent.postMessage({ nekomiComments: channel, type, value }, location.origin);
function theme(value: CommentTheme) {
  document.documentElement.dataset.theme = value.dark ? "dark" : "light";
  document.body.style.color =
    value.tokens?.color || (value.dark ? "#e6e1e7" : "#29252c");
  if (value.tokens) {
    document.body.style.fontFamily = value.tokens.font;
    root.style.setProperty("--waline-theme-color", value.tokens.primary);
    root.style.setProperty("--at-color-main", value.tokens.primary);
  }
  if (current.settings.provider === "waline")
    instance?.update?.({ path: current.post!.key, dark: value.dark });
  if (current.settings.provider === "artalk")
    instance?.setDarkMode?.(value.dark);
  if (giscusFrame)
    giscusFrame.contentWindow?.postMessage(
      { giscus: { setConfig: { theme: value.dark ? "dark" : "light" } } },
      giscusOrigin,
    );
}
function asset(url: string) {
  if (/^https?:\/\//.test(url)) return url;
  const base = new URL(current.base);
  return new URL(
    url.startsWith(base.pathname)
      ? url.slice(base.pathname.length)
      : url.replace(/^\//, ""),
    base,
  ).href;
}
function load(
  tag: "script" | "link",
  url: string,
  integrity?: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const el = document.createElement(tag);
    if (el instanceof HTMLScriptElement) {
      el.src = asset(url);
      el.async = true;
    } else {
      el.rel = "stylesheet";
      el.href = asset(url);
    }
    if (integrity) {
      el.integrity = integrity;
      el.crossOrigin = "anonymous";
    }
    el.onload = () => resolve();
    el.onerror = () => reject(new Error("评论资源加载失败"));
    document.head.append(el);
  });
}
async function boot() {
  const { settings, post, mode } = current;
  if (post) {
    document.title = post.title;
    const backlink = document.createElement("meta");
    backlink.name = "giscus:backlink";
    backlink.content = new URL(post.url, current.base).href;
    document.head.append(backlink);
  }
  const provider = settings.provider;
  document.documentElement.lang =
    provider === "artalk"
      ? settings.artalk.locale
      : provider === "waline"
        ? settings.waline.lang
        : provider === "twikoo"
          ? settings.twikoo.lang
          : settings.giscus.lang;
  if (current.theme) theme(current.theme);
  if (provider === "giscus") {
    // Official client script owns the remote iframe/authentication protocol.
    const script = document.createElement("script");
    script.src = settings.assets.script
      ? asset(settings.assets.script)
      : "https://giscus.app/client.js";
    giscusOrigin = new URL(script.src).origin;
    const attrs = {
      repo: settings.giscus.repo,
      "repo-id": settings.giscus.repoId,
      category: settings.giscus.category,
      "category-id": settings.giscus.categoryId,
      mapping: "specific",
      term: post!.key,
      strict: "1",
      "reactions-enabled": settings.giscus.reactions ? "1" : "0",
      "emit-metadata": settings.counts ? "1" : "0",
      "input-position": "top",
      theme: current.theme?.dark ? "dark" : "light",
      lang: settings.giscus.lang,
    };
    for (const [name, value] of Object.entries(attrs))
      script.setAttribute("data-" + name, value);
    script.crossOrigin = "anonymous";
    script.async = true;
    if (settings.assets.integrity) script.integrity = settings.assets.integrity;
    const observer = new MutationObserver(() => {
      const frame = root.querySelector<HTMLIFrameElement>(
        "iframe.giscus-frame",
      );
      if (!frame || giscusFrame === frame) return;
      giscusFrame = frame;
      frame.addEventListener("load", () => send("result"), { once: true });
      observer.disconnect();
    });
    observer.observe(root, { childList: true, subtree: true });
    window.addEventListener("pagehide", () => observer.disconnect(), {
      once: true,
    });
    script.onerror = () => {
      observer.disconnect();
      send("error");
    };
    root.append(script);
    return;
  }
  const key =
    provider === "twikoo" && !/^https?:\/\//.test(settings.twikoo.envId)
      ? "twikooCloud"
      : provider;
  if (!(key in assets)) throw new Error("无效评论组件");
  const entry = assets[key as keyof typeof assets];
  const css = settings.assets.css || ("css" in entry ? entry.css : "");
  await Promise.all([
    load(
      "script",
      settings.assets.script || entry.script,
      settings.assets.script ? settings.assets.integrity : entry.integrity,
    ),
    mode === "mount" && css
      ? load(
          "link",
          css,
          settings.assets.css
            ? settings.assets.cssIntegrity
            : "cssIntegrity" in entry
              ? entry.cssIntegrity
              : "",
        )
      : Promise.resolve(),
  ]);
  if (provider === "twikoo") {
    const api = sdkWindow.twikoo;
    if (!api) throw new Error("Twikoo 未加载");
    const options = {
      envId: settings.twikoo.envId,
      ...(settings.twikoo.region ? { region: settings.twikoo.region } : {}),
    };
    if (mode === "count") {
      const counts = await api.getCommentsCount({
        ...options,
        urls: [post!.key],
        includeReply: true,
      });
      send("result", counts.find((c) => c.url === post!.key)?.count);
      return;
    }
    if (mode === "recent") {
      send(
        "result",
        await api.getRecentComments({
          ...options,
          pageSize: current.limit,
          includeReply: true,
        }),
      );
      return;
    }
    await api.init({
      ...options,
      el: "#comments",
      path: post!.key,
      href: new URL(post!.url, current.base).href,
      lang: settings.twikoo.lang,
    });
  } else if (provider === "waline") {
    instance =
      sdkWindow.Waline?.init({
        el: root,
        serverURL: settings.waline.serverURL,
        path: post!.key,
        lang: settings.waline.lang,
        dark: current.theme?.dark,
        login: settings.waline.login,
        emoji: false,
        search: false,
        pageview: false,
        comment: false,
      }) || undefined;
    if (!instance) throw new Error("Waline 未加载");
  } else if (provider === "artalk") {
    instance = sdkWindow.Artalk?.init({
      el: root,
      server: settings.artalk.server,
      site: settings.artalk.site,
      pageKey: post!.key,
      pageTitle: post!.title,
      locale: settings.artalk.locale,
      darkMode: Boolean(current.theme?.dark),
      pvAdd: false,
    });
    if (!instance) throw new Error("Artalk 未加载");
    instance.on?.("list-failed", () => send("error"));
  }
  resize = new ResizeObserver(() =>
    send("height", Math.ceil(root.getBoundingClientRect().height + 12)),
  );
  resize.observe(root);
  send("result");
}
window.addEventListener("message", (event) => {
  if (
    event.origin === giscusOrigin &&
    event.source === giscusFrame?.contentWindow &&
    event.data?.giscus
  ) {
    const data = event.data.giscus;
    if (typeof data.resizeHeight === "number") {
      giscusFrame!.style.height = data.resizeHeight + "px";
      send("height", data.resizeHeight + 12);
    }
    if (
      typeof data.discussion?.totalCommentCount === "number" &&
      typeof data.discussion?.totalReplyCount === "number"
    )
      send(
        "count",
        data.discussion.totalCommentCount + data.discussion.totalReplyCount,
      );
    return;
  }
  if (
    event.source !== parent ||
    parent === window ||
    event.origin !== location.origin ||
    !event.data?.nekomiComments
  )
    return;
  if (event.data.type === "initialize" && !initialized) {
    channel = event.data.nekomiComments;
    initialized = true;
    current = event.data.value;
    boot().catch(() => send("error"));
  } else if (
    event.data.nekomiComments === channel &&
    event.data.type === "theme" &&
    initialized
  ) {
    current.theme = event.data.value;
    theme(event.data.value);
  }
});
function destroy() {
  instance?.destroy?.();
  instance = undefined;
  resize?.disconnect();
}
window.addEventListener("nekomi:comments-dispose", destroy);
window.addEventListener("pagehide", destroy);
if (parent !== window)
  parent.postMessage({ type: "nekomi:comments-ready" }, location.origin);
