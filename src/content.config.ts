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

// One YAML file per talk. The slides themselves live in public/talks/<id>/,
// where <id> is the YAML file's name.
const talks = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/talks" }),
  schema: z.object({
    title: z.string(),
    event: z.string(),
    // Shown as "date TBC" until filled in.
    date: z.coerce.date().optional(),
    // id of a related blog post, if there is one.
    post: z.string().optional(),
  }),
});

export const collections = { blog, talks };
