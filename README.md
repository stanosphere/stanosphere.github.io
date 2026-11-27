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

## Writing an Advent of Code post

These live apart from the main posts, in `src/content/aoc/<year>/day-NN.md`,
and are served at `/aoc/<year>/day-NN/`.

Start each one from [`AoC-template.md`](AoC-template.md), which has the
frontmatter and section headings:

```bash
mkdir -p src/content/aoc/2026
cp AoC-template.md src/content/aoc/2026/day-01.md
```

Frontmatter:

```yaml
---
title: "Advent of Code 2020 Day 9"
description: "Optional one-liner for the /aoc/ page; meta description falls back to the title."
year: 2020
day: 9
draft: true
pubDate: 2026-12-01
---
```

## Deploy

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and
deploys to GitHub Pages.

> **One-time setup:** in the repo on GitHub, go to
> **Settings → Pages → Build and deployment → Source** and set it to
> **GitHub Actions**. Without this the workflow can't publish.

## TODO

- add favicon
- add share preview
