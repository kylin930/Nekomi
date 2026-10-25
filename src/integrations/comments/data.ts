import type { CommentQuery, RecentComment } from "./types";
export const publicUrl = (value: unknown): string => {
  if (typeof value !== "string") return "";
  try {
    const u = new URL(value);
    return ["http:", "https:"].includes(u.protocol) &&
      !u.username &&
      !u.password
      ? u.href
      : "";
  } catch {
    return "";
  }
};
/** Inert parsing, then textContent only. Never insert provider HTML into the site. */
export function plainText(value: unknown): string {
  if (typeof value !== "string") return "";
  const template = document.createElement("template");
  template.innerHTML = value; // Inert template content is never adopted into the document.
  template.content
    .querySelectorAll("script,style,iframe,object")
    .forEach((node) => node.remove());
  return (template.content.textContent || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}
export function recentComment(
  value: Partial<RecentComment>,
): RecentComment | undefined {
  if (!value || typeof value !== "object") return;
  const date = new Date(value.createdAt || "");
  if (!value.id || !value.key || !Number.isFinite(date.getTime())) return;
  return {
    id: String(value.id),
    key: String(value.key),
    author: plainText(String(value.author || "")).slice(0, 80),
    excerpt: plainText(value.excerpt),
    createdAt: date.toISOString(),
    avatar: publicUrl(value.avatar) || undefined,
  };
}
export async function json(url: URL, query: CommentQuery): Promise<unknown> {
  const response = await fetch(url, {
    signal: query.signal,
    credentials: "omit",
    headers: { Accept: "application/json" },
    referrerPolicy: "strict-origin-when-cross-origin",
  });
  if (!response.ok) throw new Error("评论服务暂时不可用");
  return response.json();
}
export const endpoint = (server: string, path: string) =>
  new URL(path, server.replace(/\/?$/, "/"));
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("评论服务返回了无效数据");
  return value as Record<string, unknown>;
}

export function timestamp(value: unknown): string {
  const date = new Date(
    typeof value === "number" ? value : String(value || ""),
  );
  return Number.isFinite(date.getTime()) ? date.toISOString() : "";
}
