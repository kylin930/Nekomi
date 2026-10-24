// Stable public surface for source-based custom adapters. Runtime remains framework-free.
export type * from "./types";
export {
  plainText as commentText,
  recentComment as normalizeRecentComment,
  publicUrl,
} from "./data";
