import { builtinCapabilities } from "../capabilities";
import type { CommentAdapterFactory } from "../types";
import { mountFrame } from "../frame-client";
import { endpoint, json, object, recentComment, timestamp } from "../data";
const createWaline: CommentAdapterFactory = (settings) => ({
  id: "waline",
  capabilities: builtinCapabilities.waline,
  mount: (context) => mountFrame(settings, context),
  async getCount(query) {
    const url = endpoint(settings.waline.serverURL, "api/comment");
    url.search = new URLSearchParams({
      type: "count",
      url: query.post.key,
      lang: settings.waline.lang,
    }).toString();
    const result = object(await json(url, query));
    if (
      result.errno ||
      !Array.isArray(result.data) ||
      typeof result.data[0] !== "number"
    )
      throw new Error("评论数暂不可用");
    return result.data[0];
  },
  async getRecent(query) {
    const url = endpoint(settings.waline.serverURL, "api/comment");
    url.search = new URLSearchParams({
      type: "recent",
      count: String(query.limit),
      lang: settings.waline.lang,
    }).toString();
    const result = await json(url, query);
    if (!Array.isArray(result)) throw new Error("最新评论暂不可用");
    return result.flatMap((raw) => {
      const c = object(raw);
      const normalized = recentComment({
        id: String(c.objectId ?? ""),
        key: String(c.url ?? ""),
        author: String(c.nick || ""),
        excerpt: String(c.comment || c.orig || ""),
        createdAt: timestamp(c.time),
        avatar: String(c.avatar || ""),
      });
      return normalized ? [normalized] : [];
    });
  },
});
export default createWaline;
