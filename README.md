# stanosphere.github.io

My blog. Built with [Astro](https://astro.build/), deployed to GitHub Pages.
Served at <https://stanosphere.github.io>.

## Run locally

Prerequisite: Node 18+ (this was built on Node 22).

```bash
npm install
npm run dev
```

Then open <http://localhost:4321> in a browser. The dev server hot-reloads as
you edit and unlike the published site **shows draft posts**.

But we can still check what the public site would look like by doing this

```bash
npm run build
npm run preview
```

## Writing a post

Posts are markdown files in `src/content/blog/`. Frontmatter:

```yaml
---
title: "Post title"
description: "One-line summary for the index + meta description."
draft: true # drafts are hidden in the built site, visible in `npm run dev`
pubDate: 2026-06-01
---
```

Features wired up:

- **Math** — `$inline$` and `$$display$$` via remark-math + KaTeX.
- **Code highlighting** — fenced code blocks, via Shiki (built into Astro).
- **Images** — put files in `public/img/...`, reference as `/img/...`.

To publish a draft: set `draft: false` and give it a `pubDate`.

## Deploy

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and
deploys to GitHub Pages.

> **One-time setup:** in the repo on GitHub, go to
> **Settings → Pages → Build and deployment → Source** and set it to
> **GitHub Actions**. Without this the workflow can't publish.

## TODO

- add favicon
- add share preview
