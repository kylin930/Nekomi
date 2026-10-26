// Kept independent of Astro so routes/config validation share exactly one rule.
const reserved = new Set(['posts', 'page', 'friends', 'categories', 'tags', 'archive', '404', '404.html', 'article.html', 'rss.xml', 'robots.txt', 'sitemap.xml', 'sitemap-index.xml', '__nekomi', '_astro', '_image']);
export function validPageSlug(value) {
  return typeof value === 'string' && value.length <= 160 && /^[\p{L}\p{N}][\p{L}\p{N}_-]*(?:\/[\p{L}\p{N}][\p{L}\p{N}_-]*)*$/u.test(value) && !reserved.has(value.split('/')[0].toLowerCase());
}
export const pageTabId = slug => 'page-' + slug;
export function validatePages(entries, pageTabs = []) {
  const slugs = new Map();
  const pages = entries.map(entry => {
    const slug = (entry.data.slug || entry.id).normalize('NFC');
    if (!validPageSlug(slug)) throw new Error(`Invalid or reserved page slug "${slug}" in pages/${entry.id}. Use a non-reserved path such as about or projects/tool.`);
    const key = slug.toLowerCase();
    if (slugs.has(key)) throw new Error(`Duplicate page slug "${slug}": ${slugs.get(key)} and ${entry.id}.`);
    slugs.set(key, entry.id);
    return { ...entry, slug };
  });
  for (const tab of pageTabs.filter(tab => tab.enabled)) {
    const page = pages.find(page => page.slug === tab.slug);
    if (!page || page.data.draft) throw new Error(`navigation.pageTabs: enabled page "${tab.slug}" is missing or a draft.`);
  }
  return pages.filter(page => !page.data.draft);
}

/**
 * @typedef {{id: 'updates'|'friends'|'comments', display: 'tab'|'standalone', position?: 'above'|'below'}} SidebarSection
 * @param {{sidebarSections?: SidebarSection[]|null, sidebarTabs: ('updates'|'friends'|'comments')[]}} layout
 * @returns {SidebarSection[]}
 */
export function sidebarSections(layout) {
  return layout.sidebarSections ?? layout.sidebarTabs.map(id => ({ id, display: 'tab' }));
}
