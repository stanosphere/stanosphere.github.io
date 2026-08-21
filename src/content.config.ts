import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    // Drafts are excluded from the index until you flip this to false.
    draft: z.boolean().default(true),
    pubDate: z.coerce.date().optional(),
  }),
});

export const collections = { blog };
