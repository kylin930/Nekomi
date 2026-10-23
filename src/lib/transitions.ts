import type { TransitionDirectionalAnimations } from 'astro';
const timing = { duration: '360ms', easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fillMode: 'both' as const };
export const pageTransition: TransitionDirectionalAnimations = {
  forwards: { old: { name: 'nekomi-out', duration: '160ms', fillMode: 'both' }, new: { name: 'nekomi-in', ...timing } },
  backwards: { old: { name: 'nekomi-out-back', duration: '160ms', fillMode: 'both' }, new: { name: 'nekomi-in-back', ...timing } },
};
