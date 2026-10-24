import { rawConfig } from '../config/publishing.mjs';
import { existsSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';

// Preserve established heading IDs and base-aware links in otherwise standard Markdown.
export function remarkPost({ base = '/' } = {}) {
  const prefix = '/' + base.split('/').filter(Boolean).join('/');
  const url = value => value.startsWith('/') && !value.startsWith('//') ? (prefix === '/' ? '' : prefix) + value : value;
  return (tree, file) => {
    function walk(node) {
      if (node.type === 'heading') {
        const last = node.children.at(-1);
        const match = last?.type === 'text' && last.value.match(/\s*\{#([^}]+)\}$/);
        if (match) {
          last.value = last.value.slice(0, -match[0].length);
          node.data = { ...node.data, hProperties: { ...node.data?.hProperties, id: match[1] } };
        }
      }
      if (node.type === 'image' && node.url.startsWith('images/')) {
        const asset = resolve('src/assets', node.url);
        node.url = existsSync(asset) ? relative(dirname(file.path), asset).split('\\').join('/') : '/' + node.url;
      }
      if (node.type === 'link' || node.type === 'image') node.url = url(node.url);
      if (node.type === 'html') node.value = node.value.replace(/\b(href|src)="(\/[^"/][^"]*)"/g, (_, attr, value) => `${attr}="${url(value)}"`);
      node.children?.forEach(walk);
    }
    walk(tree);
  };
}
const element = (tagName, properties = {}, children = []) => ({ type: 'element', tagName, properties, children });
const text = value => ({ type: 'text', value });
// Feed authored assets (including existing HTML figures) into Astro's own
// Markdown image pipeline. Missing/public/external URLs keep their normal fallback.
export function rehypeLocalImages({ base = '/' } = {}) {
  return (tree, file) => {
    function walk(node) {
      if (node.tagName === 'img' && typeof node.properties.src === 'string') {
        let src = node.properties.src;
        const logical = src.startsWith(base) ? src.slice(base.length) : src.replace(/^\//, '');
        const asset = resolve('src/assets', logical);
        if (!URL.canParse(src) && logical.startsWith('images/')) {
          const original = src;
          file.data.astro.localImagePaths = file.data.astro.localImagePaths.filter(path => path !== original && path !== logical);
          if (existsSync(asset)) {
            src = relative(dirname(file.path), asset).split('\\').join('/');
            file.data.astro.localImagePaths.push(src);
          } else src = base + logical;
          node.properties.src = src;
        }
        // Astro resolves normal relative Markdown images as well.
        if (file.data.astro.localImagePaths.includes(src)) {
          Object.assign(node.properties, { 'data-nekomi-source': resolve(dirname(file.path), src), widths: [320, 640, 960, 1440], sizes: '(min-width: 824px) 696px, calc(100vw - 72px)', format: 'webp' });
        }
      }
      node.children?.forEach(walk);
    }
    walk(tree);
  };
}
export function rehypeArticle() {
  return (tree, file) => {
    const copy = file.data.astro?.frontmatter?.reading?.copyCode ?? rawConfig.reading.copyCode;
    const lightbox = file.data.astro?.frontmatter?.reading?.lightbox ?? rawConfig.reading.lightbox;
    function walk(node) {
      if (!node.children) return;
      node.children = node.children.map(child => {
        walk(child);
        if (child.type !== 'element') return child;
        if (/^h[2-6]$/.test(child.tagName)) child.properties.tabIndex = -1;
        if (child.tagName === 'img') Object.assign(child.properties, { loading: 'lazy', decoding: 'async', ...(lightbox ? { 'data-nekomi-original': true, 'data-original-src': child.properties.src } : {}) });
        if (child.tagName === 'table') {
          const caption = child.children.find(n => n.tagName === 'caption');
          const label = caption?.children.filter(n => n.type === 'text').map(n => n.value).join('') || '文章表格';
          return element('div', { className: ['table-scroll'], tabIndex: 0, role: 'region', ariaLabel: label + '，可横向滚动' }, [child]);
        }
        if (child.tagName === 'pre') {
          const code = child.children.find(n => n.tagName === 'code');
          const language = child.properties.dataLanguage || child.properties['data-language'] || code?.properties.className?.find(n => n.startsWith('language-'))?.slice(9) || 'text';
          Object.assign(child.properties, { tabIndex: 0, role: 'region', ariaLabel: language.toUpperCase() + ' 代码，可横向滚动' });
          return element('figure', { className: ['code-block'] }, [
            element('div', { className: ['code-header'] }, [element('span', {}, [text(language.toUpperCase())]),
              ...(copy ? [element('mdui-button', { variant: 'text', className: ['copy-code'], ariaLabel: '复制 ' + language.toUpperCase() + ' 代码' }, [text('复制')])] : [])]), child,
          ]);
        }
        return child;
      });
    }
    walk(tree);
  };
}
