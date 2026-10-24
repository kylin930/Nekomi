import sharpService from 'astro/assets/services/sharp';
import type { LocalImageService } from 'astro';

export default {
  ...sharpService,
  async getHTMLAttributes(options, ...args) {
    const attributes = await sharpService.getHTMLAttributes!(options, ...args);
    const lightbox = attributes['data-nekomi-original'];
    const sourceFile = attributes['data-nekomi-source'];
    delete attributes['data-nekomi-original'];
    delete attributes['data-nekomi-source'];
    if (!lightbox) return attributes;
    let original =
      typeof options.src === 'object' ? options.src.src : options.src;
    if (typeof options.src === 'object') {
      // The transform-only build worker need not load Astro's rendering context.
      const { originalAsset } = await import('./image-originals');
      original = await originalAsset(
        options.src,
        typeof sourceFile === 'string' ? sourceFile : undefined,
      );
    }
    return {
      ...attributes,
      'data-original-src': original,
      ...(typeof options.src === 'object'
        ? {
            'data-original-width': options.src.width,
            'data-original-height': options.src.height,
          }
        : {}),
    };
  },
} satisfies LocalImageService;
