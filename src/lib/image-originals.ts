import { getImage } from 'astro:assets';
import { relative, sep } from 'node:path';
import type { ImageMetadata } from 'astro';

// Reading a raw imported metadata.src tells Astro to retain that original asset.
// getImage intentionally passes an untracked copy to image services, so accessing
// options.src.src alone would leave a URL which Astro deletes after optimization.
const sources = import.meta.glob<{ default: ImageMetadata }>(
  '/src/**/*.{png,jpg,jpeg,webp,avif,gif}',
  { eager: true },
);
export async function originalAsset(
  metadata: ImageMetadata,
  sourceFile?: string,
) {
  // Vite can deduplicate identical files to one URL; compare authored paths,
  // rather than accidentally referencing a different metadata.src getter.
  const key = sourceFile
    ? '/' + relative(process.cwd(), sourceFile).split(sep).join('/')
    : '';
  const source = sources[key];
  if (source) return source.default.src;
  // Resources authored outside src/ get a same-format full-resolution asset.
  return (
    await getImage({
      src: metadata,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      quality: 100,
    })
  ).src;
}
