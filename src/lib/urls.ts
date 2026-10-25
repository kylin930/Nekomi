export const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
export const withBase = (path = '') => base + path.replace(/^\//, '');
export const postUrl = (id: string) => withBase('posts/' + encodeURIComponent(id) + '/');
export const pageUrl = (page: number) => withBase(page === 1 ? '' : 'page/' + page + '/');
export const facetUrl = (kind: string, slug = '') => withBase(kind + '/' + (slug ? encodeURIComponent(slug) + '/' : ''));
export const filterUrl = (term: string) => withBase('') + '?q=' + encodeURIComponent(term) + '#recent';
export function externalUrl(value: string) {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
}
export function assetUrl(value: string) {
  if (!value || !value.trim()) return '';
  if (/^[a-z][a-z\d+.-]*:/i.test(value) || value.startsWith('//')) return externalUrl(value.startsWith('//') ? 'https:' + value : value);
  return value.startsWith(base) && base !== '/' ? value : withBase(value);
}
export { dateLabel } from './format';

export const navigationUrl = (url: string) => url.startsWith('/') ? assetUrl(url) : url;
