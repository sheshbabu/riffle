# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

Riffle is a photo culling tool: import photos from a camera or phone, review and rate them, then export the keepers to a main photo library (Immich, PhotoPrism, Google Photos, iCloud Photos, etc.). Go backend with SQLite, React frontend bundled by esbuild.

**Out of scope:** Face recognition, sharing features, photo editing, mobile upload. These are handled by downstream photo management tools.

## Core rules (always apply)
- Keep code simple and readable; prefer the smallest change that solves the request
- Use descriptive variable names and consistent formatting
- Avoid complex language features unless necessary
- Prefer standard libraries over external dependencies
- Don't add unnecessary comments
- Don't modify unrelated files, dependencies, or CI unless asked

## Build & run
- `make build` - Build production binary
- `make dev` - Run development server
- `make watch` - Run with file watching (requires air)
- `make test` - Run Go and JS unit tests (`go test` and `node --test`, no extra dependencies)

## Progressive disclosure: load only what you need
Do not read every documentation file at the start of a task.

- **Product workflow and features (import, curate, library, trash, albums, calendar, stats, settings, export, bursts, duplicates, EXIF, dates, folder layout)**
  → Read `.claude/docs/features.md`
- **Tech stack, feature layout, background operations, env vars**
  → Read `.claude/docs/architecture.md`
- **Go handlers, errors, API endpoints, structs, logging**
  → Read `.claude/docs/backend.md`
- **SQLite tables, migrations, queries, transactions**
  → Read `.claude/docs/database.md`
- **React components, state, API client, modals, event handling**
  → Read `.claude/docs/frontend.md`
- **CSS, class naming, design tokens**
  → Read `.claude/docs/styling.md` (and `assets/index.css` for token values)

If the task is a simple typo, rename, or small local fix, you usually need none of the above files.
