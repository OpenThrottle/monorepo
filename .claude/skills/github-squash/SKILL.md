---
name: github-squash
description: Instructions
disable-model-invocation: true
---

# Instructions

Your job is to take the `n` commits on this branch and perform a rebase. We want to squash the commits down to `single commit`. For commits where the sum of lines over 15 lines, we want to create a new consise line item. We can fully remove any lines that are otherwise "garbage commits". Lastly, please retain references to any mentions of an issue #, eg: `CLOSES #0001`.

## Rules

- **ALWAYS** follow the rules in `.cursor/rules/commands/github.mdc`
- **ALWAYS** If there are unstaged commits run `/github/commit` first
- **ALWAYS** When rebasing we're comparing to `main` and not the `last push`
- **ALWAYS** check we're rebasing the correct number of commits
- When rebasing we must use `git reset` to soft reset to the base commit and then create a new commit with all the changes
- Once rebased prompt the user to `force push` the existing branch
