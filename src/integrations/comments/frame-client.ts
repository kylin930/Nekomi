import { say } from '../../scripts/ui';
import type {
  CommentContext,
  CommentInstance,
  CommentQuery,
  CommentSettings,
  CommentTheme,
} from "./types";
export type FrameMode = "mount" | "recent" | "count";
interface FrameRequest {
  settings: CommentSettings;
  post?: CommentContext["post"];
  theme?: CommentTheme;
  limit?: number;
}
export function openFrame(
  mode: FrameMode,
  request: FrameRequest,
  query: CommentQuery,
  container?: HTMLElement,
  onCount?: (count: number) => void,
  onError?: (error: Error) => void,
): Promise<CommentInstance | unknown> {
  return new Promise((resolve, reject) => {
    const frame = document.createElement("iframe");
    frame.className = "comment-frame";
    frame.title = say('comments', 'frameTitle');
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    // Resource/style isolation, not a security boundary against a trusted SDK.
    frame.setAttribute(
      "sandbox",
      "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox",
    );
    if (!container) frame.hidden = true;
    const channel =
      crypto.randomUUID?.() || Math.random().toString(36).slice(2);
    let settled = false,
      removed = false;
    const timer = setTimeout(
      () => fail(new Error("评论加载超时，请重试")),
      request.settings.timeout,
    );
    const send = (type: string, value?: unknown) =>
      frame.contentWindow?.postMessage(
        { nekomiComments: channel, type, value },
        location.origin,
      );
    function cleanup() {
      if (removed) return;
      removed = true;
      clearTimeout(timer);
      window.removeEventListener("message", receive);
      query.signal.removeEventListener("abort", aborted);
      try {
        frame.contentWindow?.dispatchEvent(
          new Event("nekomi:comments-dispose"),
        );
      } catch {
        /* A vendor login may have navigated the child cross-origin. */
      }
      frame.remove();
    }
    function fail(error: unknown) {
      cleanup();
      if (!settled) {
        settled = true;
        reject(error);
      } else if (!query.signal.aborted)
        onError?.(error instanceof Error ? error : new Error("评论加载失败"));
    }
    function aborted() {
      fail(query.signal.reason || new DOMException("Aborted", "AbortError"));
    }
    function receive(event: MessageEvent) {
      if (
        event.origin !== location.origin ||
        event.source !== frame.contentWindow ||
        !event.data ||
        typeof event.data !== "object"
      )
        return;
      if (event.data.type === "nekomi:comments-ready") {
        send("initialize", {
          mode,
          ...request,
          base: new URL(query.base, location.origin).href,
        });
        return;
      }
      if (event.data.nekomiComments !== channel || removed) return;
      const { type, value } = event.data;
      if (
        type === "height" &&
        typeof value === "number" &&
        Number.isFinite(value)
      )
        frame.style.height = Math.min(24000, Math.max(180, value)) + "px";
      if (
        type === "count" &&
        typeof value === "number" &&
        value >= 0 &&
        Number.isFinite(value)
      )
        onCount?.(value);
      if (type === "error") fail(new Error("评论服务暂时无法加载，请稍后重试"));
      if (type === "result" && !settled) {
        settled = true;
        clearTimeout(timer);
        if (mode !== "mount") {
          cleanup();
          resolve(value);
        } else
          resolve({
            setTheme(theme: CommentTheme) {
              request.theme = theme;
              if (!removed) send("theme", theme);
            },
            destroy: cleanup,
          } satisfies CommentInstance);
      }
    }
    window.addEventListener("message", receive);
    query.signal.addEventListener("abort", aborted, { once: true });
    if (query.signal.aborted) {
      aborted();
      return;
    }
    frame.src = new URL(
      "__nekomi/comments/",
      new URL(query.base, location.origin),
    ).href;
    (container || document.body).append(frame);
  });
}
export const mountFrame = (
  settings: CommentSettings,
  context: CommentContext,
) =>
  openFrame(
    "mount",
    { settings, post: context.post, theme: context.theme },
    context,
    context.container,
    context.onCount,
    context.onError,
  ) as Promise<CommentInstance>;
