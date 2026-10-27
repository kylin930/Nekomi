export function validScriptSource(value) {
  if (typeof value !== 'string' || !value || value.length > 2048 || /[\s\\<>#]/.test(value)) return false;
  try {
    if (value.startsWith('https://')) {
      const url = new URL(value);
      return !url.username && !url.password;
    }
    if (value.startsWith('//') || /^[a-z][\w+.-]*:/i.test(value)) return false;
    const path = decodeURIComponent(value.split('?')[0]);
    return !path.split('/').some(part => part === '.' || part === '..') && !/[\x00-\x20\\:]/.test(path) && /\.m?js$/i.test(path);
  } catch { return false; }
}
export function validScriptPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || !value.endsWith('/') || /[\s?#\\]/.test(value) || value.includes('//')) return false;
  try { return !decodeURIComponent(value).split('/').some(part => part === '.' || part === '..'); } catch { return false; }
}
export function scriptSourceKey(value) { return value.startsWith('https://') ? new URL(value).href : value.replace(/^\//, ''); }
