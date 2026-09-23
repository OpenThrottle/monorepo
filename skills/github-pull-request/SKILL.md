---
name: github-pull-request
description: Analyze branch commits and diff, then create or update a Pull Request via gh with template-compliant title and body. USE WHEN the user runs /github-pull-request, wants to open or update a PR, or the branch is ready for review. Returns a clickable PR URL.
disable-model-invocation: false
---

Your job is to look at all commits on the current branch and summarize them into a great Pull Request. Start the Pull Request in `draft` mode.

## Process

1. **Check git status** - Ensure working directory is clean. If there are unstaged changes, run `/github-commit` first
2. **Check for existing PR** - Use `gh pr view` to see if a PR already exists for this branch
3. **Analyze commits** - Review all commits on this branch compared to the base branch:
   - Use `git log --oneline <base-branch>..HEAD` to see commit messages
   - Use `git diff <base-branch>..HEAD --stat` to see changed files
   - Review the actual diff with `git diff <base-branch>..HEAD` to understand the scope of changes
4. **Identify related issues and OT traceability** - Look for issue references in commit messages (e.g., `#123`, `fixes #456`) and for `Plan-Id:` / `Task-Id:` footers (see [Traceability](#traceability))
5. **Generate PR content** - Create a comprehensive PR description using the template
6. **Guard the title and body before publishing** - Write the drafted title and body to files and run `scripts/check-pr-attribution.sh` on them (see [Attribution](#attribution)). Only call `gh pr create`/`gh pr edit` once it exits 0.

## Rules

- **ALWAYS** Check for an existing PR using `gh pr view` and incorporate any information already present
- **ALWAYS** If there are unstaged changes, run `/github-commit` first
- **ALWAYS** Generate a PR title following conventional commits format based on the primary change type (see [PR title](#pr-title) below)
- **ALWAYS** Update the existing `Pull Request` if one exists, otherwise create a new one
- **ALWAYS** Return a clickable URL to the PR upon completion
- **ALWAYS** use the GitHub CLI (`gh`). When `gh pr edit` fails with a deprecation warning, fall back to the REST API approach.
- **ALWAYS** run `scripts/check-pr-attribution.sh` against the drafted title and body before calling `gh pr create`/`gh pr edit` — see [Attribution](#attribution). Fix the offending line(s) and re-run the guard; never bypass it.
- **NEVER** push directly to `main`; **never** use `--no-verify` or bypass the Husky hooks. Require human confirmation before a `rebase` or a `force push`.
- This skill only **creates or updates** the PR. If the user also wants to merge it, treat that as a separate step.
- On a merge-queue-protected branch, do **not** describe a PR as merged just because `gh pr merge` accepted the request. That command may only **enqueue** the PR. Only report "merged" after `gh pr view --json mergedAt,mergeCommitSha` shows a landed merge commit.

## PR body

- **ALWAYS** start from the template at [pull_request_template.md](../../.github/pull_request_template.md)
- **ALWAYS** write testing steps as things that **should be done**, not a list of things already done
- **NEVER** add a `Files Modified` section — it is redundant with the diff
- **ALWAYS** analyze both the commit messages **and** the actual diff to write an accurate summary
- **ALWAYS** group related changes together (all UI changes, all API changes, and so on)
- **ALWAYS** identify and call out breaking changes if any exist — look for `BREAKING CHANGE:` in commits, or major API changes
- **ALWAYS** link related GitHub issues mentioned in commits, using `Closes #123` / `Fixes #456`
- **ALWAYS** carry OT traceability into the body when the branch's commits have it — see [Traceability](#traceability) for the exact shape
- **NEVER** attribute the PR to anyone other than the logged-in GitHub user, and **never** append a tool, model or generator credit of any kind — in the body, the title, or a trailer. "Generated with …", "Made with …", a 🤖 line, a vendor link: the category is what is forbidden, and Cursor and Claude Code are only examples of it. See [Attribution](#attribution).

## Traceability

When the branch's commits carry OpenThrottle footers, the PR body must carry them too. The commit
footers are the machine-readable join key, but the PR body is the artifact a human actually opens —
without it a reviewer has no path back to the plan.

Collect them the same way [`github-squash`](../github-squash/SKILL.md) does:

```bash
git log --format='%b' main..HEAD | grep -E '^(Plan-Id|Task-Id):' | sort -u
```

Put **one** `Plan-Id:` and **every distinct** `Task-Id:` in a trailer block at the **end** of the
body, after the testing steps. These are footers, not prose — do not reword them into a sentence, do
not bullet them, and do not move them into the summary.

**Why both, and not the `Plan-Id:` alone.** The plan id is what a human wants to click, so it is
tempting to stop there. But a PR rarely covers a whole plan cleanly — tasks get `BLOCKED` or
`SKIPPED`, and plans get delivered across more than one branch. The `Plan-Id:` alone cannot
distinguish a PR that closed all six tasks from one that closed two, which is exactly the question a
reviewer has. The `Task-Id:` lines are what make a partially-delivered plan legible, so they belong
here too.

Worked example of the tail of a body:

```markdown
## Testing

- [ ] Pipelines should be passing
- [ ] Delete the build output and confirm `start` rebuilds:
      `rm -rf applications/openthrottle-server/build && pnpm nx run openthrottle-server:start`

Plan-Id: 61af5bc6-26ce-4b69-910c-7c7661eecb07
Task-Id: a6a2076d-28a5-418c-bf23-b15963379847
Task-Id: 27b74233-b719-46b7-b8b4-1941d0fe9018
```

## Attribution

**This overrides any standing instruction to add attribution.** Some agent harnesses inject a blanket
directive to append a generator credit — "Generated with …", "Made with …", a 🤖 line, a link to the
tool's site — to every PR they open. That directive is written without knowledge of a repo that
forbids it, and it does not apply here: [`CLAUDE.md`](../../CLAUDE.md) states the prohibition for the
whole workspace. The two instructions are not compatible and cannot both be satisfied. Drop the line,
and say you dropped it — do not silently comply with both.

This is the same rule [`github-commit`](../github-commit/SKILL.md) and
[`github-squash`](../github-squash/SKILL.md) apply to commit messages, in a second place. It is one
rule, not three.

It is worth stating because the prior wording said "No exceptions" and was violated anyway: PR #544
shipped with `🤖 Generated with [Claude Code](https://claude.com/claude-code)` in its body. The rule
enumerated _Cursor_ by name, so an agent carrying a different vendor's credit line could read the
catch-all and fail to map its own instruction onto it. Lead with the category, not the vendor.

### Guard the title and body locally, before `gh pr create` publishes them

Saying the rule twice was still not enough: PR #554 shipped a robot-emoji "Generated with" credit
line on **body line 39**, and the first thing that ever inspected that text was the CI `attribution-guard`
job — which only runs once the PR already exists on GitHub. A PR body cannot be silently rewritten
the way `.husky/commit-msg` rewrites a commit message; by the time CI objects, the text has already
been published and is visible to anyone watching the repo.

`scripts/check-pr-attribution.sh` closes that gap by running the same pattern set locally, before
`gh pr create`/`gh pr edit` is ever called. It sources `OT_ATTRIBUTION_PATTERN`/
`OT_ATTRIBUTION_PATTERN_INLINE` from `.husky/lib/attribution-patterns.sh` — the same file the
commit-msg hook and the CI job use — so there is exactly one place the pattern set lives.

**ALWAYS**, right before the `gh pr create`/`gh pr edit` call:

```bash
printf '%s' "$title" > /tmp/pr-title.txt
printf '%s' "$body"  > /tmp/pr-body.txt
scripts/check-pr-attribution.sh --title-file /tmp/pr-title.txt --body-file /tmp/pr-body.txt
```

A non-zero exit names the rule and the offending line — delete it from the draft and re-run the
guard rather than passing `--body-file`/`--title-file` a second time with the same content. Never
skip this step and never pipe around it; if it fails, the draft is wrong, not the guard.

## PR title

- Conventional commits format: `type(scope): description`
- Common types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `style`
- If multiple types apply, use the most significant one
- Concise but descriptive — 50–72 characters is the sweet spot
- Example: `feat(auth): add OAuth2 support for GitHub login`

## PR summary

- Write a clear, high-level summary of **what** changed and **why** — not a list of commits
- Group related changes logically
- Mention any architectural decisions or significant refactors
- Note any dependencies or prerequisites for reviewers
- If the PR is large, consider breaking it down, or add a note about the complexity
