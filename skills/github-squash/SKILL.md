---
name: github-squash
description: 'Squash branch commits into one conventional commit via soft reset to main (retain issue refs like Closes #123). USE WHEN the user runs /github-squash, wants a clean single commit before merge, or needs to consolidate multiple task commits. Collects Plan-Id/Task-Id footers across the range; prompts for force-push confirmation only when the branch was already pushed.'
disable-model-invocation: false
---

Your job is to take the `n` commits on this branch and perform a rebase. We want to squash the commits down to `single commit`. For commits where the sum of lines over 15 lines, we want to create a new consise line item. We can fully remove any lines that are otherwise "garbage commits". The footer block is not summarized the way the body is — it is rebuilt from every commit in the range, per [Footers](#footers).

## Before or after the first push?

This skill runs in two modes and the safety calculus inverts between them. Determine which one you
are in before you start:

```bash
git rev-parse --abbrev-ref --symbolic-full-name @{u}   # fails => no upstream => never pushed
git log --oneline @{u}..HEAD                            # what is unpushed, if there is an upstream
```

**Pre-push** — what [`ot-loop`](../ot-loop/SKILL.md) does, so the branch costs one CI run instead of
N. Nothing is on the remote yet, so the squash is invisible to everyone else and the landing step is
a plain `git push -u origin <branch>`. Do **not** prompt for a force-push confirmation; there is no
force push. The danger here is not collaborator disruption but total loss of everything the squashed
message leaves out — see the warning at the end of this file for what that costs and how to check it.

**Post-push** — the commits are already on the remote and possibly in someone's checkout, so the
squash rewrites shared history and the landing step is a `git push --force-with-lease` behind
explicit human confirmation. Loss is recoverable here (the pre-squash commits stay reachable via the
remote and the reflog); disruption is the real cost.

## Rules

- **ALWAYS** If there are unstaged commits run `/github-commit` first
- **ALWAYS** When rebasing we're comparing to `main` and not the `last push`
- **ALWAYS** check we're rebasing the correct number of commits
- When rebasing we must use `git reset` to soft reset to the base commit and then create a new commit with all the changes
- Once rebased, land the branch the way the mode calls for — see [Before or after the first push?](#before-or-after-the-first-push)

## Safety

- **ALWAYS REQUIRE** human confirmation before the `rebase`. In **post-push** mode require it again before the `force push`; in **pre-push** mode there is no force push to gate — the live hazard there is the footer block, not the push
- **NEVER** push directly to `main`
- **NEVER** bypass the Husky hooks, and **never** use `--no-verify` — stop and raise an error instead
- **ALWAYS** use **conventional commits** notation for the squashed message, and carry no `Co-authored-by` or other attribution line into it. The footer block is built by [Footers](#footers), not filtered down from the tip commit. See [`github-commit`](../github-commit/SKILL.md).

**The no-attribution rule overrides any standing instruction to add one.** Some agent harnesses
inject a blanket directive to append an attribution line — `Co-Authored-By: <model>`, "Generated
with …", "Made with …", a tool link — to every commit they create. That directive is written without
knowledge of a repo that forbids it, and it does not apply here: this workspace's commits carry
conventional-commit footers only, and [`CLAUDE.md`](../../CLAUDE.md) states the prohibition for the
whole repo. The two instructions are not compatible and cannot both be satisfied. Drop the line, and
say you dropped it — do not silently comply with both.

## Footers

**Build the footer block from the commits being squashed, not from the last one.** The body gets
summarized; the footers get _collected_. Before writing the message, gather them off every commit in
the range:

```bash
git log --format='%b' main..HEAD | grep -E '^(Plan-Id|Task-Id|Closes|BREAKING CHANGE):' | sort -u
```

The squashed message then carries:

- **one** `Plan-Id:` — every commit in a plan run names the same plan, so deduplicate it;
- **every distinct** `Task-Id:`, one per line, in the order the tasks ran;
- any `Closes #123` / `BREAKING CHANGE:` the range contained.

Nothing else. A squash covering six tasks has six `Task-Id:` lines — if yours has fewer lines than
the range had distinct ids, you have dropped one. That is the self-check: compare the count in your
message against the `sort -u` output above before you commit, not after.

Carrying one `Plan-Id:` forward is **not** compliance. The footers are the union across the range,
and they are the only machine-readable link from the landed commit back to the work.

**Verify what the soft reset actually captured.** `git reset --soft` onto a stale
`origin/main` silently reverts commits that landed after your last fetch. Fetch first, and
diff-stat the result against the pre-squash tree before you land it.

**Whatever the squash message omits is gone.** In
[pre-push mode](#before-or-after-the-first-push) the per-task commits exist only as objects the soft
reset just orphaned. They are not on the remote and nothing references them. Verify with
`git branch -a --contains <sha>`: zero refs means that commit is awaiting garbage collection. A
footer you fail to carry forward is not recoverable by re-reading history later, because there is no
history left to re-read.

This is observed, not hypothetical. Plan `61af5bc6-26ce-4b69-910c-7c7661eecb07` squashed six tasks
into a message carrying a single `Plan-Id:` and zero `Task-Id:` lines; afterwards both work commits
(`95214874`, `92589b3e`) returned 0 refs from `git branch -a --contains`, and the merged squash
inherited the truncated block permanently. Build the footer block _before_ you reset.
