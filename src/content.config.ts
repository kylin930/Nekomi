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
    comments: z.boolean().default(true),
    commentId: z.string().min(1).max(200).optional(),
    commentPath: z.union([z.string().regex(/^\/(?!\/)[^?#\s]*$/), z.url({ protocol: /^https?$/ })]).optional(),
    commentsUrl: z.url({ protocol: /^https?$/ }).optional(),
    reading: readingSchema.optional(),
    readingTime: z.union([z.boolean(), z.number().int().min(1).max(10000)]).optional(),
    markdown: z.strictObject({ math: z.boolean().optional(), mermaid: z.boolean().optional(), components: z.boolean().optional() }).optional(),
    date: z.iso.date(),
    updated: z.iso.date().optional(),
    category: z.string().nullish(),
    tags: z.array(z.string()).default([]),
    cover: z.string().default(''),
    coverAlt: z.string().default(''),
    demo: z.boolean().default(false),
  }),
});
export const collections = { posts };
