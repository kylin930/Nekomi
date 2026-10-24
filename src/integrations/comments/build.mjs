import { existsSync, realpathSync, statSync } from "node:fs";
import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
export function commentsIntegration(settings) {
  return {
    name: "nekomi-comments",
    hooks: {
      "astro:config:setup": ({ injectRoute, updateConfig }) => {
        if (
          ["waline", "twikoo", "giscus", "artalk"].includes(settings.provider)
        )
          injectRoute({
            pattern: "/__nekomi/comments/",
            entrypoint: fileURLToPath(
              new URL("./Frame.astro", import.meta.url),
            ),
            prerender: true,
          });
        if (settings.items.some((item) => !item.demo))
          console.warn(
            "[Nekomi] comments.items is deprecated: only explicit demo rows are rendered. Configure a dynamic provider for recent comments.",
          );
        const id = "virtual:nekomi-comment-adapter";
        let module;
        if (settings.provider === "custom") {
          const path = resolve(settings.custom.module);
          if (
            !existsSync(path) ||
            !statSync(path).isFile() ||
            !realpathSync(path).startsWith(realpathSync(process.cwd()) + sep)
          )
            throw new Error(
              "comments.custom.module must name an existing module inside this project.",
            );
          module = path.split(sep).join("/");
        }
        updateConfig({
          vite: {
            plugins: [
              {
                name: "nekomi-custom-comments",
                resolveId(source) {
                  if (source === id) return "\0" + id;
                },
                load(source) {
                  if (source !== "\0" + id) return;
                  return module
                    ? `export { default } from ${JSON.stringify(module)};`
                    : "export default null;";
                },
              },
            ],
          },
        });
      },
    },
  };
}
