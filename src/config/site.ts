import defaultConfig from '../../site.config.json';
import { readFileSync } from 'node:fs';
import { z } from 'astro/zod';

const picture = z.string().default('');
const schema = z.object({
  demo: z.boolean().default(true),
  demoNotice: z.string(),
  appearance: z.object({
    color: z.string(),
    wallpaper: z.object({
      enabled: z.boolean().default(true), light: picture, dark: picture,
      position: z.string().default('center'), fit: z.enum(['cover', 'contain']).default('cover'),
      lightOverlay: z.number().min(0).max(1).default(.64), darkOverlay: z.number().min(0).max(1).default(.68),
      lightSurface: z.number().min(.65).max(1).default(.9), darkSurface: z.number().min(.65).max(1).default(.92),
      cacheHours: z.number().min(0).max(168).default(24),
    }),
  }),
  site: z.object({ name: z.string(), tagline: z.string(), intro: z.string(), avatar: picture, avatarAlt: z.string(), avatarFallback: z.string() }),
  friends: z.array(z.object({ name: z.string(), url: z.string(), avatar: picture, description: z.string() })),
  comments: z.object({
    anchorsEnabled: z.boolean().default(false),
    items: z.array(z.object({ id: z.string(), author: z.string(), avatar: picture, excerpt: z.string(), postId: z.string(), createdAt: z.iso.datetime({ offset: true }), anchor: z.string().optional(), demo: z.boolean().default(false) })),
  }),
});
// Optional build-only configuration lets previews/tests exercise populated sidebars without changing the shipped defaults.
export const config = schema.parse(process.env.NEKOMI_CONFIG ? JSON.parse(readFileSync(process.env.NEKOMI_CONFIG, 'utf8')) : defaultConfig);
