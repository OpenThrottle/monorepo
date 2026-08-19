---
name: github-pull-request
description: Analyze branch commits and diff, then create or update a Pull Request via gh with template-compliant title and body. USE WHEN the user runs /github/pull-request, wants to open or update a PR, or the branch is ready for review. Returns a clickable PR URL.
disable-model-invocation: false
---

Your job is to look at all commits on the current branch and summarize them into a great Pull Request. Start the Pull Request in `draft` mode.

## Process

1. **Check git status** - Ensure working directory is clean. If there are unstaged changes, run `/github/commit` first
2. **Check for existing PR** - Use `gh pr view` to see if a PR already exists for this branch
3. **Analyze commits** - Review all commits on this branch compared to the base branch:
   - Use `git log --oneline <base-branch>..HEAD` to see commit messages
   - Use `git diff <base-branch>..HEAD --stat` to see changed files
   - Review the actual diff with `git diff <base-branch>..HEAD` to understand the scope of changes
4. **Identify related issues** - Look for issue references in commit messages (e.g., `#123`, `fixes #456`)
5. **Generate PR content** - Create a comprehensive PR description using the template

## Rules

- **ALWAYS** follow the rules in `.cursor/rules/commands/github.mdc`
- **ALWAYS** Check for an existing PR using `gh pr view` and incorporate any information already present
- **ALWAYS** If there are unstaged changes, run `/github/commit` first
- **ALWAYS** Generate a PR title following conventional commits format based on the primary change type (see rules for guidelines)
- **ALWAYS** Update the existing `Pull Request` if one exists, otherwise create a new one
- **ALWAYS** Return a clickable URL to the PR upon completion
- This skill only **creates or updates** the PR. If the user also wants to merge it, treat that as a separate step.
- On a merge-queue-protected branch, do **not** describe a PR as merged just because `gh pr merge` accepted the request. That command may only **enqueue** the PR. Only report "merged" after `gh pr view --json mergedAt,mergeCommitSha` shows a landed merge commit.
