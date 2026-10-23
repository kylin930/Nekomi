import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const posts = defineCollection({
  // Previews can build copied frontmatter fixtures without changing authored posts.
  loader: glob({ pattern: '**/*.md', base: process.env.NEKOMI_CONTENT_DIR || './src/content/posts' }),
  schema: z.object({
    title: z.string().min(1),
    excerpt: z.string(),
    date: z.iso.date(),
    category: z.string(),
    tags: z.array(z.string()),
    cover: z.string().default(''),
    coverAlt: z.string().default(''),
    demo: z.boolean().default(false),
  }),
});
export const collections = { posts };
