import { defineConfig } from "astro/config";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

// https://astro.build/config
export default defineConfig({
  // This is a user site (stanosphere.github.io), so it's served from the
  // domain root — no `base` needed. If you ever move to a project repo,
  // set `base: "/<repo-name>"`.
  site: "https://stanosphere.github.io",
  markdown: {
    // remark-math parses $inline$ and $$display$$; rehype-katex renders them.
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
    // Shiki ships with Astro — code highlighting works out of the box.
    shikiConfig: {
      theme: "github-dark",
      wrap: false,
    },
  },
});
