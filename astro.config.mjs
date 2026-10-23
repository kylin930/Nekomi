import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import rehypeRaw from 'rehype-raw';
import { remarkPost, rehypeArticle } from './src/plugins/markdown.mjs';

const base = process.env.SITE_BASE || '/';
export default defineConfig({
  site: 'https://kylin930.github.io',
  base,
  output: 'static',
  trailingSlash: 'always',
  outDir: process.env.ASTRO_OUT_DIR || './dist',
  markdown: {
    syntaxHighlight: false,
    processor: unified({ smartypants: false, remarkPlugins: [[remarkPost, { base }]], rehypePlugins: [rehypeRaw, rehypeArticle] }),
  },
});
