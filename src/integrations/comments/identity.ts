/** Independent of title, domain and deployment base. Preserve commentPath for legacy threads. */
export function commentKey(
  post: { id: string; data: { commentId?: string; commentPath?: string } },
  prefix: string,
): string {
  return (
    post.data.commentPath ||
    prefix + encodeURIComponent(post.data.commentId || post.id) + "/"
  );
}
