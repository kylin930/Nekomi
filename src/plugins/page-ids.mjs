import { rehypeHeadingIds } from '@astrojs/markdown-remark';
import { resolve, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';

// A page may also be embedded in the home Tabs. Its IDs must never collide with
// another page's headings, content Tabs or author-provided HTML controls.
export function rehypePageIds() {
  return (tree, file) => {
    const folder = resolve(process.env.NEKOMI_PAGES_DIR || './src/content/pages');
    const path = resolve(file.path || '.');
    if (!path.startsWith(folder + sep)) return;
    rehypeHeadingIds()(tree, file);
    const prefix = 'np-' + createHash('sha256').update(relative(folder, path).split(sep).join('/')).digest('hex').slice(0, 12) + '-';
    const ids = new Map();
    const nodes = [];
    function walk(node) { if (node.type === 'element') nodes.push(node); node.children?.forEach(walk); }
    walk(tree);
    for (const node of nodes) if (typeof node.properties.id === 'string') {
      const old = node.properties.id;
      if (ids.has(old)) throw new Error(`Duplicate HTML ID "${old}" in ${file.path}.`);
      ids.set(old, prefix + old);
      node.properties.id = prefix + old;
    }
    for (const node of nodes) {
      for (const key of ['ariaControls', 'ariaLabelledBy', 'ariaDescribedBy', 'htmlFor']) {
        const value = node.properties[key];
        if (Array.isArray(value)) node.properties[key] = value.map(id => ids.get(id) || id);
        else if (typeof value === 'string') node.properties[key] = value.split(/\s+/).map(id => ids.get(id) || id).join(' ');
      }
      const href = node.properties.href;
      if (typeof href === 'string' && href.startsWith('#')) {
        try { const id = ids.get(decodeURIComponent(href.slice(1))); if (id) node.properties.href = '#' + encodeURIComponent(id); } catch { /* Keep malformed authored URLs inert. */ }
      }
    }
  };
}
