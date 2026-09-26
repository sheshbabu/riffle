---
name: commit-message
description: Generate a concise commit message for the current staged or unstaged changes, written in the user's own style learned from git history. Use when the user asks for a commit message, or invokes /commit-message.
---

# Commit message

Write a commit message for the current changes that reads like the user wrote it.
Only output the message. Don't stage, commit, or run any git command that changes state.

## 1. Collect the changes

- Run `git diff --cached --stat` and `git diff --cached`.
- If nothing is staged, use `git diff --stat` and `git diff` instead, and say the message covers unstaged changes.
- Include untracked files from `git status --short` when nothing is staged, since new files are usually part of the change.
- Ignore `assets/bundle.js` and `assets/bundle.css` and their source maps, since they are build output.
- For large diffs, read the stat first and then only the hunks needed to understand intent.

## 2. Learn the style from history

Run `git log --format='%s%n%b---' -n 50` and match what you see.
If the history disagrees with the defaults below, follow the history.

Defaults observed in the user's history:

- A single subject line, no body. Median length is around 25 characters.
- Starts with a past tense verb, capitalized: Added, Updated, Implemented, Fixed, Improved, Removed, Tweaked, Refactored, Consolidated, Switched, Made.
- Describes the outcome from the user's or reader's point of view, not the mechanics. "Fixed lightbox image size", not "Changed max-height calculation in Lightbox.css".
- No conventional commit prefixes (`feat:`, `fix:`), no scopes, no emoji, no trailing period, no ticket numbers.
- Two unrelated changes are joined with `; ` or `and`, each part starting with its own verb: `Consolidated progress datastructure and implemented global operation lock`.
- A short clause may explain intent: `Added stopPropagation to prevent wrong behaviour`.
- A body is only used for large, multi-part changes, as a blank line then `- ` bullets, one short fact per line.
- No `Co-Authored-By` or other trailers.
- Don't use em dashes.

## 3. Write the message

- Name the main user-visible change. Leave out incidental edits such as formatting, docs updates, or small refactors unless they are the whole change.
- Prefer one clause. Use `; ` for a second unrelated change, and a bullet body only when three or more significant changes can't fit a subject line.
- Keep the subject under about 70 characters when possible.

## 4. Output

Print the message in a fenced code block so it can be copied as is.
If the changes look like they belong in separate commits, say so in one line after the block and suggest a message for each.
