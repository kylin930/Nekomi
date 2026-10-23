import type { TransitionDirectionalAnimations } from 'astro';
const spatial = { duration: '500ms', easing: 'cubic-bezier(0.38, 1.21, 0.22, 1)', fillMode: 'both' as const };
const effects = { duration: '200ms', easing: 'cubic-bezier(0.34, 0.8, 0.34, 1)', fillMode: 'both' as const };
export const pageTransition: TransitionDirectionalAnimations = {
  forwards: {
    old: [{ name: 'nekomi-out', ...spatial }, { name: 'nekomi-fade-out', ...effects }],
    new: [{ name: 'nekomi-in', ...spatial }, { name: 'nekomi-fade-in', ...effects }],
  },
  backwards: {
    old: [{ name: 'nekomi-out-back', ...spatial }, { name: 'nekomi-fade-out', ...effects }],
    new: [{ name: 'nekomi-in-back', ...spatial }, { name: 'nekomi-fade-in', ...effects }],
  },
};
