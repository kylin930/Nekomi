import { say, commentTime } from '../../scripts/ui';
import { pushArticleHash } from "../../scripts/list-state";
import { selectAdapter } from "./registry";
import { publicUrl } from "./data";
import type {
  CommentAdapter,
  CommentInstance,
  CommentPost,
  CommentSettings,
  CommentTheme,
} from "./types";
interface Site {
  data: { comments: CommentSettings; posts: CommentPost[]; base: string };
  drawer: HTMLElement & { open: boolean };
}
export function createComments(site: Site) {
  const settings = site.data.comments,
    posts = Object.freeze(
      site.data.posts
        .filter((post) => post.comments !== false)
        .map((post) =>
          Object.freeze({
            id: post.id,
            key: post.key,
            title: post.title,
            url: post.url,
            comments: post.comments,
          }),
        ),
    );
  let adapterPromise: Promise<CommentAdapter> | undefined;
  const adapter = () =>
    (adapterPromise ||= selectAdapter(structuredClone(settings)).catch(
      (error) => {
        adapterPromise = undefined;
        throw error;
      },
    ));
  const theme = (): CommentTheme => {
    const mode = document.documentElement.classList.contains("mdui-theme-dark")
      ? "dark"
      : document.documentElement.classList.contains("mdui-theme-light")
        ? "light"
        : "auto";
    const css = getComputedStyle(document.body);
    return {
      mode,
      dark:
        mode === "dark" ||
        (mode === "auto" && matchMedia("(prefers-color-scheme: dark)").matches),
      tokens: {
        color: `rgb(${css.getPropertyValue("--mdui-color-on-surface").trim()})`,
        font: css.fontFamily,
        primary: `rgb(${css.getPropertyValue("--mdui-color-primary").trim()})`,
      },
    };
  };
  // Existing article headings own their hashes, even when an ID begins with comment-.
  function isCommentHash(hash: string) {
    if (!hash.startsWith("#comment-")) return false;
    try {
      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
      return !target || Boolean(target.closest("[data-comments-mount]"));
    } catch {
      return false;
    }
  }
  let active: CommentInstance | undefined;
  let locateCurrent: (() => void) | undefined;
  document.addEventListener(
    "click",
    (event) => {
      if (
        event.defaultPrevented ||
        event.button ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey ||
        !locateCurrent
      )
        return;
      const link = event
        .composedPath()
        .find((node) => node instanceof HTMLAnchorElement) as
        | HTMLAnchorElement
        | undefined;
      if (!link || (link.target && link.target !== "_self")) return;
      const url = new URL(link.href);
      if (
        url.origin !== location.origin ||
        url.pathname !== location.pathname ||
        url.search !== location.search ||
        !isCommentHash(url.hash)
      )
        return;
      event.preventDefault();
      if (location.hash !== url.hash) pushArticleHash(url.hash);
      locateCurrent();
    },
    true,
  );
  const updateTheme = () => {
    const instance = active;
    if (instance?.setTheme)
      Promise.resolve()
        .then(() => instance.setTheme!(theme()))
        .catch(() => {});
  };
  document.addEventListener("nekomi:theme", updateTheme);
  matchMedia("(prefers-color-scheme: dark)").addEventListener(
    "change",
    updateTheme,
  );
  async function task<T>(
    parent: AbortSignal,
    run: (signal: AbortSignal) => Promise<T>,
    keepAlive = false,
  ): Promise<T> {
    const controller = new AbortController();
    const abort = () => controller.abort(parent.reason);
    parent.addEventListener("abort", abort, { once: true });
    if (parent.aborted) abort();
    const timer = setTimeout(
      () =>
        controller.abort(
          new DOMException("Comment request timed out", "TimeoutError"),
        ),
      settings.timeout,
    );
    const interrupted = new Promise<never>((_, reject) => {
      const stop = () =>
        reject(
          controller.signal.reason || new DOMException("Aborted", "AbortError"),
        );
      if (controller.signal.aborted) stop();
      else controller.signal.addEventListener("abort", stop, { once: true });
    });
    return Promise.race([
      Promise.resolve().then(() => {
        controller.signal.throwIfAborted();
        return run(controller.signal);
      }),
      interrupted,
    ]).finally(() => {
      clearTimeout(timer);
      if (!keepAlive) parent.removeEventListener("abort", abort);
    });
  }
  let recentController: AbortController | undefined,
    recentCached = 0;
  const panels = () => [
    ...document.querySelectorAll<HTMLElement>("[data-comments-recent]"),
  ];
  function recentState(text: string, failed = false) {
    for (const panel of panels()) {
      panel.querySelector<HTMLElement>(
        "[data-comments-recent-status]",
      )!.textContent = text;
      panel.querySelector<HTMLElement>("[data-comments-recent-retry]")!.hidden =
        !failed;
    }
  }
  function recentVisible() {
    const mobile = matchMedia("(max-width: 1119px)").matches;
    const root = document.querySelector(
      `[data-sidebar=${mobile ? "mobile" : "desktop"}]`,
    );
    return (
      (!mobile || site.drawer.open) &&
      (
        root?.querySelector("mdui-tabs") as
          | (HTMLElement & { value: string })
          | null
      )?.value === "comments"
    );
  }
  async function loadRecent(force = false) {
    if (
      !panels().length ||
      recentController ||
      !recentVisible() ||
      (!force && Date.now() - recentCached < 60000)
    )
      return;
    const request = (recentController = new AbortController());
    recentState(say('comments', 'recentLoading'));
    try {
      const service = await task(request.signal, async () => adapter());
      request.signal.throwIfAborted();
      if (!service.capabilities.recent || !service.getRecent) {
        recentState(say('comments', 'recentUnavailable'));
        return;
      }
      const items = await task(request.signal, (signal) =>
        service.getRecent!({
          limit: settings.recentLimit,
          posts,
          base: site.data.base,
          signal,
        }),
      );
      request.signal.throwIfAborted();
      const shown = items
        .flatMap((comment) => {
          const post = posts.find((post) => post.key === comment.key);
          return post ? [{ comment, post }] : [];
        })
        .slice(0, settings.recentLimit);
      for (const panel of panels()) {
        const list = panel.querySelector("[data-comments-recent-list]")!;
        const fragment = document.createDocumentFragment();
        for (const { comment, post } of shown) {
          const authorName = comment.author || say('comments', 'guest');
          const item = document.createElement("mdui-list-item");
          item.setAttribute("rounded", "");
          item.setAttribute(
            "href",
            post.url +
              (service.capabilities.locate
                ? "#comment-" + encodeURIComponent(comment.id)
                : ""),
          );
          const avatar = document.createElement("mdui-avatar");
          avatar.className = "comment-avatar";
          avatar.setAttribute("slot", "icon");
          avatar.setAttribute("aria-label", authorName);
          avatar.textContent = Array.from(authorName)[0] || "?";
          const imageUrl = publicUrl(comment.avatar);
          if (imageUrl) {
            const img = new Image();
            img.src = imageUrl;
            img.alt = "";
            img.loading = "lazy";
            img.referrerPolicy = "no-referrer";
            img.addEventListener("error", () => img.remove(), { once: true });
            avatar.append(img);
          }
          const copy = document.createElement("div");
          copy.className = "comment-copy";
          const byline = document.createElement("div");
          byline.className = "comment-byline";
          const author = document.createElement("strong");
          author.textContent = authorName.slice(0, 80);
          const time = document.createElement("time");
          const date = new Date(comment.createdAt);
          if (Number.isFinite(date.getTime())) {
            time.dateTime = date.toISOString();
            time.textContent = commentTime(date);
          }
          byline.append(author, time);
          const excerpt = document.createElement("p");
          excerpt.className = "comment-excerpt";
          excerpt.textContent = String(comment.excerpt || "").slice(0, 240);
          const title = document.createElement("p");
          title.className = "comment-post";
          title.textContent = post.title;
          copy.append(byline, excerpt, title);
          item.append(avatar, copy);
          fragment.append(item);
        }
        list.replaceChildren(fragment);
      }
      recentCached = Date.now();
      recentState(shown.length ? say('comments', 'recentReady') : say('comments', 'recentEmpty'));
    } catch {
      if (!request.signal.aborted) recentState(say('comments', 'recentFailed'), true);
    } finally {
      if (recentController === request) recentController = undefined;
    }
  }
  function checkRecent() {
    if (recentVisible()) void loadRecent();
    else if (recentController) {
      recentController.abort();
      recentController = undefined;
      recentState(say('comments', 'recentIdle'));
    }
  }
  if (panels().length) {
    document
      .querySelectorAll(".sidebar-tabs")
      .forEach((tabs) => tabs.addEventListener("change", checkRecent));
    site.drawer.addEventListener("opened", checkRecent);
    site.drawer.addEventListener("closed", checkRecent);
    matchMedia("(max-width: 1119px)").addEventListener("change", checkRecent);
    document.addEventListener("click", (event) => {
      if ((event.target as Element).closest("[data-comments-recent-retry]"))
        void loadRecent(true);
    });
    requestAnimationFrame(checkRecent);
  }
  function enterPage(signal: AbortSignal, navigationType?: string) {
    const section = document.querySelector<HTMLElement>(
      "[data-comments-section]",
    );
    if (!section) return;
    const path = location.pathname;
    const post = posts.find((post) => post.id === section.dataset.commentsId);
    if (!post) return;
    const mount = section.querySelector<HTMLElement>("[data-comments-mount]")!,
      status = section.querySelector<HTMLElement>("[data-comments-status]")!,
      retry = section.querySelector<HTMLElement>("[data-comment-retry]")!,
      count = section.querySelector<HTMLElement>("[data-comment-count]")!;
    let locateAfterMount = navigationType !== "traverse";
    let session: AbortController | undefined,
      instance: CommentInstance | undefined,
      busy = false,
      observer: IntersectionObserver | undefined;
    const setStatus = (state: string, text: string) => {
      section.dataset.state = state;
      status.textContent = text;
      retry.hidden = state !== "error";
      mount.setAttribute("aria-busy", String(state === "loading"));
    };
    const publishCount = (value: number) => {
      if (
        !settings.counts ||
        session?.signal.aborted ||
        signal.aborted ||
        !Number.isFinite(value) ||
        value < 0
      )
        return;
      count.textContent = say('comments', 'count', { count: Math.floor(value) });
      count.hidden = false;
    };
    const locate = () => {
      if (!isCommentHash(location.hash) || !instance?.locate) return;
      try {
        const id = decodeURIComponent(location.hash.slice(9));
        const target = instance;
        void Promise.resolve()
          .then(() => target.locate!(id))
          .catch(() => {});
      } catch {
        /* Ignore malformed hashes. */
      }
    };
    function disposeSession() {
      session?.abort();
      if (active === instance) active = undefined;
      if (instance) {
        const old = instance;
        void Promise.resolve()
          .then(() => old.destroy())
          .catch(() => {});
      }
      instance = undefined;
      mount.replaceChildren();
    }
    async function start() {
      if (busy || instance || signal.aborted) return;
      observer?.disconnect();
      disposeSession();
      session = new AbortController();
      const request = session;
      busy = true;
      count.hidden = true;
      setStatus("loading", say('comments', 'loading'));
      try {
        const service = await task(request.signal, async () => adapter());
        signal.throwIfAborted();
        request.signal.throwIfAborted();
        const mounted = await task(
          request.signal,
          async (scoped) => {
            const result = await service.mount({
              container: mount,
              post: post!,
              theme: theme(),
              base: site.data.base,
              signal: scoped,
              onCount: (value) => {
                if (
                  service.capabilities.count === "live" &&
                  session === request &&
                  !request.signal.aborted
                )
                  publishCount(value);
              },
              onError: () => {
                if (
                  session === request &&
                  !signal.aborted &&
                  !request.signal.aborted
                ) {
                  disposeSession();
                  setStatus("error", say('comments', 'failed'));
                }
              },
            });
            if (!result || typeof result.destroy !== "function")
              throw new Error("适配器必须返回可销毁的评论实例");
            if (scoped.aborted || signal.aborted) {
              await result.destroy();
              scoped.throwIfAborted();
              signal.throwIfAborted();
            }
            if (
              service.capabilities.theme &&
              typeof result.setTheme !== "function"
            ) {
              await result.destroy();
              throw new Error("适配器未实现主题更新");
            }
            if (
              service.capabilities.locate &&
              typeof result.locate !== "function"
            ) {
              await result.destroy();
              throw new Error("适配器未实现评论定位");
            }
            return result;
          },
          true,
        );
        if (request.signal.aborted || signal.aborted) {
          await mounted.destroy();
          return;
        }
        instance = mounted;
        active = service.capabilities.theme ? mounted : undefined;
        if (service.capabilities.theme)
          await task(request.signal, async () => {
            await mounted.setTheme!(theme());
          });
        if (request.signal.aborted || signal.aborted) return;
        setStatus("ready", "");
        if (locateAfterMount) locate();
        if (
          settings.counts &&
          service.capabilities.count === "query" &&
          service.getCount
        ) {
          task(request.signal, (scoped) =>
            service.getCount!({
              post: post!,
              base: site.data.base,
              signal: scoped,
            }),
          )
            .then((value) => {
              if (session === request && !request.signal.aborted)
                publishCount(value);
            })
            .catch(() => {
              /* Widget remains usable when a separate count query fails. */
            });
        }
      } catch {
        if (session === request && !signal.aborted && !request.signal.aborted) {
          disposeSession();
          setStatus("error", say('comments', 'failed'));
        }
      } finally {
        busy = false;
      }
    }
    retry.addEventListener("click", () => void start(), { signal });
    const hashChanged = () => {
      if (location.pathname === path && isCommentHash(location.hash)) {
        locateAfterMount = true;
        if (instance) locate();
        else void start();
      }
    };
    locateCurrent = hashChanged;
    window.addEventListener("hashchange", hashChanged, { signal });
    window.addEventListener("popstate", hashChanged, { signal });
    signal.addEventListener(
      "abort",
      () => {
        observer?.disconnect();
        if (locateCurrent === hashChanged) locateCurrent = undefined;
        mount.style.minHeight = mount.getBoundingClientRect().height + "px";
        disposeSession();
      },
      { once: true },
    );
    if (locateAfterMount && isCommentHash(location.hash))
      section.scrollIntoView({ behavior: "instant", block: "start" });
    if (
      !settings.lazy ||
      isCommentHash(location.hash) ||
      !("IntersectionObserver" in window)
    )
      void start();
    else {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) void start();
        },
        { rootMargin: "180px 0px" },
      );
      observer.observe(section);
    }
  }
  return { enterPage };
}
