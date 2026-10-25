import { say } from './ui';
import PhotoSwipe from 'photoswipe';
import photoSwipeCSS from 'photoswipe/style.css?inline';
import lightboxCSS from '../styles/lightbox.css?inline';
const safe = (value) => {
  try {
    const url = new URL(value, location.href);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
};
export function openLightbox(body, image, signal, onDestroy) {
  const pictures = [...body.querySelectorAll('img')].filter(
    (img) =>
      !img.closest('a') &&
      img.isConnected &&
      img.complete &&
      img.naturalWidth > 0 &&
      safe(img.dataset.originalSrc || img.currentSrc || img.src),
  );
  const index = pictures.indexOf(image);
  if (index < 0 || signal.aborted) return;
  const dataSource = pictures.map((img) => ({
    src: safe(img.dataset.originalSrc || img.currentSrc || img.src),
    width: Number(img.dataset.originalWidth) || img.naturalWidth,
    height: Number(img.dataset.originalHeight) || img.naturalHeight,
    alt: img.alt,
    caption:
      img.closest('figure')?.querySelector('figcaption')?.textContent ||
      img.title ||
      img.alt ||
      '',
    msrc: img.currentSrc || img.src,
  }));
  const style = document.createElement('style');
  style.dataset.nekomiLightbox = '';
  style.textContent = photoSwipeCSS + lightboxCSS;
  document.head.append(style);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const viewer = new PhotoSwipe({
    dataSource,
    index,
    mainClass: 'nekomi-lightbox',
    bgOpacity: 0.96,
    wheelToZoom: true,
    secondaryZoomLevel: (level) => Math.min(2, level.fit * 2),
    maxZoomLevel: (level) => Math.max(2, level.fit * 4),
    trapFocus: true,
    returnFocus: true,
    showAnimationDuration: reduced ? 0 : 250,
    hideAnimationDuration: reduced ? 0 : 200,
    zoomAnimationDuration: reduced ? 0 : 250,
    closeTitle: say('common', 'close'),
    zoomTitle: say('lightbox', 'zoom'),
    arrowPrevTitle: say('lightbox', 'previous'),
    arrowNextTitle: say('lightbox', 'next'),
    errorMsg: say('lightbox', 'error'),
  });
  viewer.on('uiRegister', () => {
    viewer.ui.registerElement({
      name: 'caption',
      order: 9,
      isButton: false,
      appendTo: 'root',
      onInit: (element) => {
        element.className += ' nekomi-lightbox-caption';
        const caption = document.createElement('span'),
          original = document.createElement('a');
        original.textContent = say('lightbox', 'original');
        original.target = '_blank';
        original.rel = 'noopener noreferrer';
        element.append(caption, original);
        viewer.on('change', () => {
          const item = viewer.currSlide.data;
          caption.textContent = item.caption;
          original.href = item.src;
        });
      },
    });
  });
  const dispose = () => viewer.destroy();
  signal.addEventListener('abort', dispose, { once: true });
  viewer.on('destroy', () => {
    style.remove();
    signal.removeEventListener('abort', dispose);
    onDestroy?.();
    if (!signal.aborted && image.isConnected)
      image.focus({ preventScroll: true });
  });
  viewer.init();
  const root = document.querySelector('.nekomi-lightbox');
  root?.setAttribute('aria-label', say('lightbox', 'title'));
  root?.setAttribute('aria-modal', 'true');
  return viewer;
}
