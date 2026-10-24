import { builtinCapabilities } from "../capabilities";
import type { CommentAdapterFactory } from "../types";
import { mountFrame, openFrame } from "../frame-client";
import { object, recentComment, timestamp } from "../data";
const createTwikoo: CommentAdapterFactory = (settings) => ({
  id: "twikoo",
  capabilities: builtinCapabilities.twikoo,
  mount: (context) => mountFrame(settings, context),
  async getCount(query) {
    const result = await openFrame(
      "count",
      { settings, post: query.post },
      query,
    );
    if (typeof result !== "number" || !Number.isFinite(result))
      throw new Error("评论数暂不可用");
    return result;
  },
  async getRecent(query) {
    const result = await openFrame(
      "recent",
      { settings, limit: query.limit },
      query,
    );
    if (!Array.isArray(result)) throw new Error("最新评论暂不可用");
    return result.flatMap((raw) => {
      const c = object(raw);
      const normalized = recentComment({
        id: String(c.id ?? ""),
        key: String(c.url ?? ""),
        author: String(c.nick || "访客"),
        excerpt: String(c.commentText || c.comment || ""),
        createdAt: timestamp(c.created),
        avatar: String(c.avatar || ""),
      });
      return normalized ? [normalized] : [];
    });
  },
});
export default createTwikoo;
