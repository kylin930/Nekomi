import type { CommentCapabilities } from "./types";
export const builtinCapabilities = {
  waline: { theme: true, count: "query", recent: true, locate: false },
  twikoo: { theme: true, count: "query", recent: true, locate: false },
  artalk: { theme: true, count: "query", recent: true, locate: false },
  giscus: { theme: true, count: "live", recent: false, locate: false },
} satisfies Record<string, CommentCapabilities>;
