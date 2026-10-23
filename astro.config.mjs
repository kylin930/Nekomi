import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import rehypeRaw from 'rehype-raw';
import sitemap from '@astrojs/sitemap';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { publishing, rawConfig } from './src/config/publishing.mjs';
import { remarkPost, rehypeLocalImages, rehypeArticle } from './src/plugins/markdown.mjs';

const base = publishing.base;
const output = resolve(process.env.ASTRO_OUT_DIR || './dist');
const documents = new Map();
function builtPage(url) {
  if (documents.has(url)) return documents.get(url);
  const pathname = decodeURIComponent(new URL(url).pathname);
  const file = resolve(output, pathname.slice(base.length), 'index.html');
  let html = '';
  if (file.startsWith(output + '/')) { try { html = readFileSync(file, 'utf8'); } catch { /* Non-HTML endpoints are not indexed. */ } }
  documents.set(url, html); return html;
}
export default defineConfig({
  // An unconfigured preview deliberately has no public canonical URL.
  site: publishing.url || 'http://localhost:4321',
  base,
  integrations: rawConfig.features.sitemap ? [sitemap({
    filter: url => publishing.indexing && Boolean(builtPage(url)) && !/name="robots" content="noindex/.test(builtPage(url)),
    serialize(item) {
      const updated = builtPage(item.url).match(/property="article:modified_time" content="([^"]+)"/);
      if (updated) item.lastmod = updated[1];
      return item;
    },
  })] : [],
  output: 'static',
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  trailingSlash: 'always',
  outDir: process.env.ASTRO_OUT_DIR || './dist',
  cacheDir: process.env.ASTRO_CACHE_DIR || './node_modules/.astro',
  markdown: {
    syntaxHighlight: 'shiki',
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
      transformers: [{ pre(node) { node.properties['data-language'] = this.options.lang; } }],
    },
    processor: unified({ smartypants: false, remarkPlugins: [[remarkPost, { base }]], rehypePlugins: [rehypeRaw, [rehypeLocalImages, { base }], rehypeArticle] }),
  },
});
