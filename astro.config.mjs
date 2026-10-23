import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import rehypeRaw from 'rehype-raw';
import { remarkPost, rehypeLocalImages, rehypeArticle } from './src/plugins/markdown.mjs';

const base = process.env.SITE_BASE || '/';
export default defineConfig({
  site: 'https://kylin930.github.io',
  base,
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
