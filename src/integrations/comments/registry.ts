import type { CommentAdapter, CommentSettings } from "./types";
export async function selectAdapter(
  settings: CommentSettings,
): Promise<CommentAdapter> {
  let adapter: CommentAdapter;
  switch (settings.provider) {
    case "waline":
      adapter = (await import("./adapters/waline")).default(settings);
      break;
    case "twikoo":
      adapter = (await import("./adapters/twikoo")).default(settings);
      break;
    case "giscus":
      adapter = (await import("./adapters/giscus")).default(settings);
      break;
    case "artalk":
      adapter = (await import("./adapters/artalk")).default(settings);
      break;
    case "custom": {
      const { default: factory } = await import(
        "virtual:nekomi-comment-adapter"
      );
      if (!factory) throw new Error("未配置自定义评论适配器");
      adapter = factory(settings);
      break;
    }
    default:
      throw new Error("评论服务未启用");
  }
  if (
    !adapter ||
    typeof adapter.id !== "string" ||
    !adapter.id ||
    typeof adapter.mount !== "function" ||
    !adapter.capabilities ||
    typeof adapter.capabilities.theme !== "boolean" ||
    typeof adapter.capabilities.recent !== "boolean" ||
    typeof adapter.capabilities.locate !== "boolean" ||
    ![false, "query", "live"].includes(adapter.capabilities.count) ||
    (adapter.capabilities.recent && typeof adapter.getRecent !== "function") ||
    (adapter.capabilities.count === "query" &&
      typeof adapter.getCount !== "function")
  )
    throw new Error("评论适配器的能力声明与实现不一致");
  return adapter;
}
