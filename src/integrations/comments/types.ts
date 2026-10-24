/** Public extension contract. No server credentials belong in these browser contexts. */
export type CommentTheme = {
  mode: "light" | "dark" | "auto";
  dark: boolean;
  tokens?: { color: string; primary: string; font: string };
};
export interface CommentPost {
  id: string;
  key: string;
  url: string;
  title: string;
  comments?: boolean;
}
export interface RecentComment {
  id: string;
  key: string;
  author: string;
  excerpt: string;
  createdAt: string;
  avatar?: string;
}
export interface CommentCapabilities {
  theme: boolean;
  /** query = public query API; live = metadata only after mounting the current discussion. */
  count: false | "query" | "live";
  recent: boolean;
  locate: boolean;
}
export interface CommentContext {
  container: HTMLElement;
  post: CommentPost;
  theme: CommentTheme;
  signal: AbortSignal;
  base: string;
  /** A live provider may publish an authoritative count here. */
  onCount(count: number): void;
  onError(error: Error): void;
}
export interface CommentInstance {
  setTheme?(theme: CommentTheme): void | Promise<void>;
  destroy(): void | Promise<void>;
  /** Only expose when locating a concrete comment is actually implemented. */
  locate?(id: string): void | Promise<void>;
}
export interface CommentQuery {
  signal: AbortSignal;
  base: string;
}
export interface CommentAdapter {
  readonly id: string;
  readonly capabilities: Readonly<CommentCapabilities>;
  mount(context: CommentContext): Promise<CommentInstance>;
  getCount?(query: CommentQuery & { post: CommentPost }): Promise<number>;
  getRecent?(
    query: CommentQuery & { limit: number; posts: readonly CommentPost[] },
  ): Promise<RecentComment[]>;
}
export type CommentSettings =
  import("../../config/site").SiteConfig["comments"];
export type CommentAdapterFactory = (
  settings: CommentSettings,
) => CommentAdapter;
