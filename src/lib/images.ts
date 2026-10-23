import type { ImageMetadata } from 'astro';
import { assetUrl, base } from './urls';

// Config keeps portable images/... URLs. Only authored assets are imported;
// arbitrary external URLs and the random wallpaper stay runtime resources.
const images = import.meta.glob<{ default: ImageMetadata }>('../assets/**/*.{png,jpg,jpeg,webp,avif,gif}', { eager: true });
export function localImage(src: string) {
  const path = base !== '/' && src.startsWith(base) ? src.slice(base.length) : src;
  const key = '../assets/' + path.replace(/^\//, '').replace(/^src\/assets\//, '');
  return images[key]?.default;
}
export function imageSource(src: string) { return localImage(src) || assetUrl(src); }
