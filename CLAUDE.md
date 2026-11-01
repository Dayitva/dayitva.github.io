# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Jekyll-based digital garden (personal site at `dayitva.github.io`) built on the Simply Jekyll theme. Content is authored in Markdown with Obsidian-style `[[wiki links]]`, and deployed via GitHub Pages.

## Commands

Local dev (native Ruby). macOS system Ruby (2.6) is too old; use Homebrew Ruby:

```
export PATH="/opt/homebrew/opt/ruby/bin:$PATH"
bundle install
bundle exec jekyll serve --livereload    # http://localhost:4000
```

The Gemfile pins `bigdecimal`, `csv`, `base64`, `logger` explicitly because Ruby 3.4+ removed them from default gems and Jekyll 3.10 / Liquid 4.0 still require them. If you bump Ruby and `bundle exec jekyll` errors with `cannot load such file -- bigdecimal`, that's why.

Local dev (Docker):

```
docker-compose up           # serves on 0.0.0.0:4000
```

Production build (what GitHub Pages runs):

```
bundle exec jekyll build    # outputs to _site/
```

There are no tests and no linter. Do not commit the `_site/` or `.jekyll-cache/` directories (already gitignored).

## Architecture

### Content collections

Three content types, each with a distinct URL scheme (see `_config.yml` `defaults` + `collections`):

- **`_posts/`** → "Projects" — uses `layout: Post`, permalink `/project/:title`, `content-type: post`. Long-form projects only; hackathon work lives as data in `_data/hackathons.yml`.
- **`_notes/Public/`** → the notes collection — uses `layout: Post`, permalink `/note/:title`, `content-type: notes`. Only `Public/` is published; `_notes/000 Inbox`, `_notes/200 Private`, `_notes/300 Templates` are excluded in `_config.yml`.
- **`pages/`** → static feed/index pages (`index.md`, `notes.md`, `posts.md`, `lists.md`, `404.md`, plus `about.md`, `hackathons.md`, `hacker-houses.md`). Feed pages set `feedformat: card`; section pages set `content-type: section` + a `section:` key that selects which data source to render.

### Data-driven sections

Structured content lives in `_data/` so new entries are one-line YAML edits, not HTML:

- `_data/about.yml` — `name`, `tagline`, `bio`, `about` (all hand-authored copy for homepage + /about).
- `_data/social.yml` — the link row on the homepage and /about.
- `_data/work.yml` — work experience (rendered on /about via `SectionFeed.html` with `kind="work"`).
- `_data/volunteering.yml` — volunteering list (same include, `kind="volunteering"`).
- `_data/hackathons.yml` — rendered on /hackathons and as "Recent builds" on the homepage.
- `_data/hacker_houses.yml` — rendered on /hacker-houses.
- `_data/books.yml` — rendered on /books. Generated, not hand-edited: export your Goodreads library as CSV to `utilities/goodreads_library_export.csv` (gitignored) and run `python3 utilities/import_goodreads_csv.py`. The older RSS fetcher, `utilities/fetch_books.py`, has returned 404 since Nov 2026.
- `_data/projects.yml` — side projects, rendered on /projects/ (`kind="project"`). Standalone apps live as plain static files under `projects/<slug>/` (no front matter, so Jekyll copies them untouched) and the data entry links to them. `/projects/` has a trailing slash on purpose: `_layouts/Post.html` has a legacy branch keyed on the exact permalink `/projects` that renders the empty `_posts` feed.

`_includes/SectionFeed.html` is the single dispatcher — it takes `data=` and `kind=` and branches per kind. To add a new section type, add a new `when` clause there + a matching block in the `content-type: section` branch of `_layouts/Post.html`.

Per-file front matter controls rendering:
- `feed: show|hide` — whether it appears in the notes feed.
- `format: list|card` — picks a style branch in `_layouts/Post.html`.
- `permalink:` — overrides the collection default (e.g., `Credits.md` sets `/credits`).

### Layout dispatch

`_layouts/Post.html` is the single layout; it branches on `page.permalink`, `page.feedformat`, `page.content-type`, `page.section`, and `page.format` to render homepage vs. feed vs. note vs. post vs. static vs. data-backed section. When editing page rendering, look for the matching `{% if %}` block rather than creating a new layout. The `content-type: section` branch uses `page.section` (a string like `"hackathons"`) to pick the data source fed into `SectionFeed.html`.

### Wiki links & backlinks (the non-obvious part)

`_includes/Content.html` rewrites `[[Title]]` and `[[label::url]]` at build time by scanning `site.notes`, `site.posts`, and `site.pages` for a matching title. Unresolved internal links become a "stale" tooltip driven by `site.privatelinks`. Because lookup is by exact title, renaming a note's `title:` front matter silently breaks inbound `[[links]]` — grep the repo before renaming.

`_includes/Backlinks.html` computes inbound links by scanning all notes/posts/pages for the literal string `[page.title]` (note: single brackets, matching the first half of `[[title]]`). This is O(n²) across content but fine at current scale.

Site-wide toggles for wiki links, page-preview tooltips, backlinks, search, and the custom homepage live under `preferences:` in `_config.yml`.

### Assets & search

- `assets/js/Search.js` is the client-side search implementation, fed by `SearchData.json` at the repo root (regenerated by Jekyll as part of the build — do not hand-edit).
- `autocomplete.txt` at the repo root is consumed by the optional VS Code autocomplete plugin whose source lives in `utilities/Autocomplete.ts`. That `.ts` file is **not** part of the site build; it's a standalone reference implementation meant to be dropped into a VS Code extension template.
- MathJax + KaTeX are both wired up (`mathjax: true`, `math_engine: katex` in `_config.yml`); `$...$` and `$$...$$` delimiters work in Markdown.

### Kramdown + GFM

Markdown is parsed as GFM via kramdown (`kramdown.input: GFM`), with Rouge syntax highlighting and smart quotes enabled. When adding new content, prefer fenced code blocks and standard GFM tables.

### Math (LaTeX)

Math is rendered **client-side by KaTeX auto-render** (loaded from jsdelivr in `_layouts/Post.html`). Delimiters: `$...$` for inline, `$$...$$` for display. Although `_config.yml` sets `math_engine: katex` for kramdown, the kramdown-katex pre-renderer is not reliably available in the GitHub Pages gem set, so the raw LaTeX passes through unchanged and the client-side script renders it at page load. Do not re-add MathJax — the old `cdn.mathjax.org/mathjax/latest` URL is dead and the gzipped `kramdown-math-katex` path silently drops the math.

### Design language (November 2026: Swiss)

The site matches the deck at `/deck` (`presentation.html`): Swiss / Bauhaus style. Inter only (JetBrains Mono for code), heavy lowercase headings with a red trailing period, red / blue / yellow primaries on a light-gray ground, and hard-edged white cards with a 3px ink border and a 6px offset shadow that turns red on hover. Dark mode swaps the ground and ink; the primaries stay.

All of it lives in `assets/css/swiss.css`, loaded last in `_layouts/Post.html`. It re-skins the older manuscript styles at the bottom of `assets/css/style.css` instead of editing them, and points the old `--paper-*` / `--color-*` tokens at its own `--sw-*` tokens so unrestyled pages still match. When adding components, use the `--sw-*` tokens; a new hex color is almost always a mistake.

Key partials:
- `_includes/Homepage.html` — hero: giant lowercase name, plus the deck's three shapes (red disc, yellow square, blue bar) with the same cursor parallax.
- `_includes/Ornament.html` — section divider: those three shapes in miniature.
- `_includes/RingMarker.html` — the small red square bullet before feed rows (the name is historical).
- `_includes/Sigil.html` — the old concentric-rings hero; no longer included anywhere.

Section headings (`.manuscript-numbered .section-heading`) render as big red lowercase words with a `01`, `02`… counter. These are opt-in per page.

Work-experience logos use Simple Icons via jsdelivr (`cdn.jsdelivr.net/npm/simple-icons@v11/icons/<slug>.svg`) or files in `assets/img/logos/`; companies without a logo fall back to a single-letter monogram tile (`.row-emblem.monogram`).

Volunteering entries that repeat across years use a `cohorts:` list (year, dates, certificate) instead of separate entries; `SectionFeed.html` renders each year as a chip, linked when a certificate exists.
