import { rawConfig } from './publishing.mjs';
import type { z } from 'astro/zod';
import type { configSchema } from './schema.mjs';
export type SiteConfig = z.infer<typeof configSchema>;
export const config: SiteConfig = rawConfig;
export const mainTabs = config.navigation.tabs.filter(t => t.enabled && (t.id !== 'tags' || config.content.tags) && (t.id !== 'categories' || config.content.categories));
export const readingOptions = (overrides: Partial<SiteConfig['reading']> = {}) => ({ ...config.reading, ...overrides });
