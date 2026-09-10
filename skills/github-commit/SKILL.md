---
name: github-commit
description: Stage all changes and create a conventional commit from the current diff. USE WHEN the user runs /github-commit, asks to commit changes, or needs a commit message derived from staged/unstaged work. Requires user confirmation before pushing.
disable-model-invocation: true
---

Your job is to create a good commit message from the current diff.

## Rules

- **ALWAYS** add and stage any files on the current branch
- **ALWAYS** require confirmation from the user before pushing any commits
- **ALWAYS** use the GitHub CLI (`gh`) when interacting with GitHub

## Commit messages

- **ALWAYS** use **conventional commits** notation for the title and body. Use more than one line when needed, but stay within the conventional-commits standard — commitlint + Husky enforce it.
- **NEVER** add `Co-authored-by` lines, to the title or the body. This applies to every commit, including ones created by agents, by `/github-commit`, or by automation.
- The **only** allowed footer lines are conventional-commit footers: `BREAKING CHANGE:`, `Closes #123`, `Plan-Id:`, `Task-Id:`. No other co-author or attribution line of any kind.
- **NEVER** attribute the commit to anyone other than the logged-in GitHub user.
- **NEVER** append "Made with Cursor", a link to cursor.com, or any other tool attribution — in commit messages, PR descriptions, or any other output. No exceptions; do not suggest it either.

When committing work for an OpenThrottle plan or task, include `Plan-Id: <uuid>` and
`Task-Id: <uuid>` in the body or footer — that is what keeps the commit traceable to its
plan (see [`ot-plans`](../ot-plans/SKILL.md)). Commit after each task rather than letting
uncommitted work pile up.

## Safety

- **NEVER** push directly to `main`
- **NEVER** bypass the Husky hooks, and **never** use `--no-verify` — stop and raise an error instead
- **ALWAYS REQUIRE** human confirmation before a `rebase`
- **ALWAYS REQUIRE** human confirmation before a `force push`
- **ALWAYS** return a clickable link to the existing Pull Request, if there is one
