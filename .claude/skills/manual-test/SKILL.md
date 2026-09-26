---
name: manual-test
description: Generate a manual regression test checklist for the current changes, written from the user's point of view so they can click through the app themselves. Use when the user asks for manual test cases, a test plan, or invokes /manual-test.
---

# Manual test

Write a checklist the user can follow by hand to confirm the app still works after the current changes.
Don't run Playwright, a browser, or computer use, the user runs the tests.
Don't edit code while doing this.

## 1. Work out what changed

- Read `git diff --cached --stat`, falling back to `git diff --stat` and untracked files from `git status --short`.
- Read the hunks that matter. For each change, work out which screens and actions a user would reach it through.
- Look for changes with wide reach even when the diff is small: file moves and renames on disk, the global operation lock and progress polling, shared photo queries and filters, migrations, EXIF and date parsing, thumbnail generation, the API client, keyboard shortcuts, and shared components like Lightbox and the grid.
- If `$ARGUMENTS` narrows the scope (for example "just the lightbox", or "include the API"), follow it.

## 2. Decide what to test

- Test from the user's point of view: screens, clicks, keys, what they should see. Skip the API unless asked, and when API checks are asked for, give copy-pasteable `curl` commands.
- Cover the features the change touches directly, plus the features that share the code it touched.
- For keyboard changes, check each mode the shortcut works in: grid, lightbox, and compare.
- Add an upgrade section when there's a migration or a change to library or thumbnail paths: run the new build on an existing database and library.
- Leave out features the change can't affect. Say so in one line rather than listing them.

## 3. Write the checklist

- Start with setup: back up `riffle.db`, and use a copy of the import, library and export folders when the change touches import, export, or file deletion, since those move or delete real files.
- Group by feature area with short numbered headings, and order groups from riskiest to least risky.
- Each item is a `- [ ]` checkbox: the action, then the expected result. One line each.
- Mark the checks most likely to catch a regression, and say in a sentence why they're risky.
- Include edge cases the change makes likely: empty states, photos without EXIF or dates (`Unknown/`), HEIC and video files, exact duplicates, bursts, trashed photos, and starting a second long-running operation while one is running.
- End with one or two sentences on where a failure would most likely come from, so the user knows where to look first.

Keep it tight: a checklist, not a report. Don't use em dashes.
