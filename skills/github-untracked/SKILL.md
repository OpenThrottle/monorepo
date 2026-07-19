---
name: github-untracked
description: Preview and remove untracked files with git clean after user confirmation. USE WHEN the user runs /github/untracked, wants to clean dangling untracked files, or the workspace has clutter outside git tracking. Always runs git clean -n before git clean -f.
disable-model-invocation: true
source: openthrottle
---

Your job is to clean up dangling file using `git clean`.

## Rules

- **ALWAYS** follow the rules in `.cursor/rules/commands/github.mdc`
- **ALWAYS** run `git clean -n` and get the users confirmation that we're ok removing these files.
- **ALWAYS** if the user confirms we can remove the files with `git clean -f`
- TODO: Wrap this up...
