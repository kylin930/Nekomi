// Only this compatibility boundary knows the legacy Chinese sentinel.
/** @param {string | null | undefined} value @param {string} [fallback] */
export function normalizeCategory(value, fallback = '未分类') {
  const key = value?.trim();
  return { category: !key || key === '未分类' ? fallback : key, categoryKey: !key || key === '未分类' ? null : key };
}
export function relatedCategoryKey(data) {
  return Object.hasOwn(data, 'categoryKey') ? data.categoryKey : normalizeCategory(data.category).categoryKey;
}
/** @param {string} category @param {Record<string, string>} [colors] */
export function categoryRole(category, colors = {}) {
  const value = Object.hasOwn(colors, category) ? colors[category] : 'primary';
  return value.startsWith('#') ? 'category-' + value.slice(1).toLowerCase() : value;
}
/** @param {Record<string, string>} [colors] */
export function categoryColors(colors = {}) {
  return [...new Set(Object.values(colors).filter(value => value.startsWith('#')).map(value => value.toLowerCase()))].map(value => ({ name: 'category-' + value.slice(1), value }));
}
