import { readFileSync } from 'node:fs';
import defaultConfig from '../../site.config.json' with { type: 'json' };

export const rawConfig = process.env.NEKOMI_CONFIG ? JSON.parse(readFileSync(process.env.NEKOMI_CONFIG, 'utf8')) : defaultConfig;
const options = rawConfig.publishing || {};
const address = process.env.SITE_URL ?? options.url ?? '';
let origin = '';
if (address) {
  const url = new URL(address);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('SITE_URL / publishing.url must be an HTTP(S) origin; set the path separately with SITE_BASE / publishing.base.');
  origin = url.origin;
}
const path = process.env.SITE_BASE ?? options.base ?? '/';
if (!/^\/(?:[\w-]+\/)*$/.test(path)) throw new Error('SITE_BASE / publishing.base must start and end with /, e.g. /Nekomi/.');
const pageSize = options.pageSize ?? 6;
if (!Number.isInteger(pageSize) || pageSize < 2 || pageSize > 24) throw new Error('publishing.pageSize must be an integer from 2 to 24.');
const language = new Intl.Locale(options.language || 'zh-CN');
export const publishing = {
  url: origin, base: path, pageSize,
  language: language.toString(),
  ogLocale: language.region ? language.language + '_' + language.region : '',
  indexing: options.indexing === true && Boolean(origin) && rawConfig.demo === false,
  author: options.author || rawConfig.site.name,
  authorUrl: options.authorUrl || '',
  socialImage: options.socialImage || '',
};
