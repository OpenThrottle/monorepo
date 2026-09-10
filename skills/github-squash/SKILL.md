---
name: github-squash
description: 'Squash branch commits into one conventional commit via soft reset to main (retain issue refs like Closes #123). USE WHEN the user runs /github-squash, wants a clean single commit before merge, or needs to consolidate multiple task commits. Prompts for force-push confirmation.'
disable-model-invocation: false
---

Your job is to take the `n` commits on this branch and perform a rebase. We want to squash the commits down to `single commit`. For commits where the sum of lines over 15 lines, we want to create a new consise line item. We can fully remove any lines that are otherwise "garbage commits". Lastly, please retain references any OpenThrottle Plan or Task ID's in the process.

## Rules

- **ALWAYS** If there are unstaged commits run `/github-commit` first
- **ALWAYS** When rebasing we're comparing to `main` and not the `last push`
- **ALWAYS** check we're rebasing the correct number of commits
- When rebasing we must use `git reset` to soft reset to the base commit and then create a new commit with all the changes
- Once rebased prompt the user to `force push` the existing branch

## Safety

- **ALWAYS REQUIRE** human confirmation before the `rebase`, and again before the `force push`
- **NEVER** push directly to `main`
- **NEVER** bypass the Husky hooks, and **never** use `--no-verify` — stop and raise an error instead
- **ALWAYS** use **conventional commits** notation for the squashed message, and carry no `Co-authored-by` or other attribution line into it. Only conventional-commit footers survive: `BREAKING CHANGE:`, `Closes #123`, `Plan-Id:`, `Task-Id:`. See [`github-commit`](../github-commit/SKILL.md).

**Verify what the soft reset actually captured.** `git reset --soft` onto a stale
`origin/main` silently reverts commits that landed after your last fetch. Fetch first, and
diff-stat the result against the pre-squash tree before you force-push.
