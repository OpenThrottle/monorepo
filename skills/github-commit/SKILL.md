---
name: github-commit
description: Stage all changes and create a conventional commit from the current diff. USE WHEN the user runs /github/commit, asks to commit changes, or needs a commit message derived from staged/unstaged work per github.mdc. Requires user confirmation before pushing.
disable-model-invocation: true
source: openthrottle
---

Your job is to create a good commit message from the current diff.

## Rules

- **ALWAYS** follow the rules in `.cursor/rules/commands/github.mdc`
- **ALWAYS** add and stage any files on the current branch
- **ALWAYS** require confirmation from the user before pushing any commits
