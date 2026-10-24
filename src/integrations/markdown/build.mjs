import { fileURLToPath } from 'node:url';
export function markdownPages(settings) {
  return {
    name: 'nekomi-content-pages',
    hooks: {
      'astro:config:setup': ({ injectRoute }) => {
        if (settings.enabled)
          injectRoute({
            pattern: '/friends/',
            entrypoint: fileURLToPath(
              new URL('../../pages-internal/Friends.astro', import.meta.url),
            ),
            prerender: true,
          });
      },
    },
  };
}
