import { builtinCapabilities } from "../capabilities";
import type { CommentAdapterFactory } from "../types";
import { mountFrame } from "../frame-client";
import { endpoint, json, object, recentComment } from "../data";
const createArtalk: CommentAdapterFactory = (settings) => ({
  id: "artalk",
  capabilities: builtinCapabilities.artalk,
  mount: (context) => mountFrame(settings, context),
  async getCount(query) {
    const url = endpoint(settings.artalk.server, "api/v2/stats/page_comment");
    url.search = new URLSearchParams({
      site_name: settings.artalk.site,
      page_keys: query.post.key,
    }).toString();
    const result = object(await json(url, query));
    const counts = object(result.data);
    const count = counts[query.post.key];
    if (typeof count !== "number" || !Number.isFinite(count))
      throw new Error("评论数暂不可用");
    return count;
  },
  async getRecent(query) {
    const url = endpoint(
      settings.artalk.server,
      "api/v2/stats/latest_comments",
    );
    url.search = new URLSearchParams({
      site_name: settings.artalk.site,
      limit: String(query.limit),
    }).toString();
    const result = object(await json(url, query));
    if (!Array.isArray(result.data)) throw new Error("最新评论暂不可用");
    return result.data.flatMap((raw) => {
      const c = object(raw);
      const normalized = recentComment({
        id: String(c.id ?? ""),
        key: String(c.page_key ?? ""),
        author: String(c.nick || "访客"),
        excerpt: String(c.content || ""),
        createdAt: String(c.date || ""),
      });
      return normalized ? [normalized] : [];
    });
  },
});
export default createArtalk;
