import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { readingSchema } from './config/schema.mjs';

const posts = defineCollection({
  // Previews can build copied frontmatter fixtures without changing authored posts.
  loader: glob({ pattern: '**/*.md', base: process.env.NEKOMI_CONTENT_DIR || './src/content/posts' }),
  schema: z.object({
    title: z.string().min(1),
    excerpt: z.string().optional(),
    description: z.string().optional(),
    author: z.string().optional(),
    pinned: z.boolean().default(false),
    draft: z.boolean().default(false),
    commentsUrl: z.url({ protocol: /^https?$/ }).optional(),
    reading: readingSchema.optional(),
    date: z.iso.date(),
    updated: z.iso.date().optional(),
    category: z.string().default('未分类'),
    tags: z.array(z.string()).default([]),
    cover: z.string().default(''),
    coverAlt: z.string().default(''),
    demo: z.boolean().default(false),
  }),
});
export const collections = { posts };
