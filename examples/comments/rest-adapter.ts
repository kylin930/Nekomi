/** Example only: replace this API contract with your own public service. */
import {
  normalizeRecentComment,
  type CommentAdapterFactory,
} from "../../src/integrations/comments";
const createAdapter: CommentAdapterFactory = (settings) => {
  const base = String(settings.custom.options.endpoint || "");
  let endpoint: URL;
  try {
    endpoint = new URL(base);
  } catch {
    throw new Error(
      "REST example requires comments.custom.options.endpoint to be a public HTTP(S) URL.",
    );
  }
  if (
    !["http:", "https:"].includes(endpoint.protocol) ||
    endpoint.username ||
    endpoint.password
  )
    throw new Error(
      "comments.custom.options.endpoint must be a public HTTP(S) URL.",
    );
  const fetchJSON = async (path: string, signal: AbortSignal) => {
    const response = await fetch(
      new URL(path, base.endsWith("/") ? base : base + "/"),
      { signal, credentials: "omit", headers: { Accept: "application/json" } },
    );
    if (!response.ok) throw new Error("评论服务暂时不可用");
    return response.json();
  };
  return {
    id: "rest-example",
    capabilities: { theme: true, count: "query", recent: true, locate: true },
    async getRecent({ limit, signal }) {
      const result: unknown = await fetchJSON("recent?limit=" + limit, signal);
      if (!Array.isArray(result))
        throw new Error("Expected a recent comments array");
      return result.flatMap((item) => {
        const comment = normalizeRecentComment(item);
        return comment ? [comment] : [];
      });
    },
    async getCount({ post, signal }) {
      const data = await fetchJSON(
        "count?key=" + encodeURIComponent(post.key),
        signal,
      );
      if (
        typeof data.count !== "number" ||
        !Number.isFinite(data.count) ||
        data.count < 0
      )
        throw new Error("Expected an authoritative non-negative comment count");
      return data.count;
    },
    async mount(context) {
      const { container, signal, post } = context;
      const data: { id: string; author: string; text: string }[] =
        await fetchJSON("comments?key=" + encodeURIComponent(post.key), signal);
      signal.throwIfAborted();
      const list = document.createElement("div");
      list.className = "custom-comment-list";
      const caption = document.createElement("p");
      caption.textContent = data.length ? "留言" : "还没有留言。";
      list.append(caption);
      for (const comment of data) {
        const item = document.createElement("article");
        item.id = "comment-" + comment.id;
        item.tabIndex = -1;
        const author = document.createElement("strong");
        author.textContent = comment.author;
        const text = document.createElement("p");
        text.textContent = comment.text;
        item.append(author, text);
        list.append(item);
      }
      container.append(list);
      function setTheme(theme: typeof context.theme) {
        list.dataset.theme = theme.dark ? "dark" : "light";
      }
      setTheme(context.theme);
      return {
        setTheme,
        destroy() {
          list.remove();
        },
        locate(id) {
          const target = [
            ...list.querySelectorAll<HTMLElement>("article"),
          ].find((item) => item.id === "comment-" + id);
          if (target) {
            target.focus({ preventScroll: true });
            target.scrollIntoView({ block: "center", behavior: "instant" });
          }
        },
      };
    },
  };
};
export default createAdapter;
