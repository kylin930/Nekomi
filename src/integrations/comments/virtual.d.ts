declare module "virtual:nekomi-comment-adapter" {
  const factory: import("./types").CommentAdapterFactory | null;
  export default factory;
}
