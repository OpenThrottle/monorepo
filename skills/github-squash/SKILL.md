---
name: github-squash
description: 'Squash branch commits into one conventional commit via soft reset to main (retain issue refs like Closes #123). USE WHEN the user runs /github-squash, wants a clean single commit before merge, or needs to consolidate multiple task commits. Prompts for force-push confirmation per github.mdc.'
disable-model-invocation: true
---

Your job is to take the `n` commits on this branch and perform a rebase. We want to squash the commits down to `single commit`. For commits where the sum of lines over 15 lines, we want to create a new consise line item. We can fully remove any lines that are otherwise "garbage commits". Lastly, please retain references any OpenThrottle Plan or Task ID's in the process.

## Rules

- **ALWAYS** follow the rules in `.cursor/rules/commands/github.mdc`
- **ALWAYS** If there are unstaged commits run `/github-commit` first
- **ALWAYS** When rebasing we're comparing to `main` and not the `last push`
- **ALWAYS** check we're rebasing the correct number of commits
- When rebasing we must use `git reset` to soft reset to the base commit and then create a new commit with all the changes
- Once rebased prompt the user to `force push` the existing branch
