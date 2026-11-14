---
name: github-squash
description: 'Squash branch commits into one conventional commit via soft reset to the default branch (retain issue refs like Closes #123). USE WHEN the user runs /github-squash, wants a clean single commit before merge, or needs to consolidate multiple task commits. Collects Plan-Id/Task-Id footers from OT, cross-checked against the range; prompts for force-push confirmation only when the branch was already pushed.'
disable-model-invocation: false
---

Your job is to take the `n` commits on this branch and perform a rebase. We want to squash the commits down to `single commit`. For commits where the sum of lines over 15 lines, we want to create a new consise line item. We can fully remove any lines that are otherwise "garbage commits". The footer block is not summarized the way the body is — it is rebuilt from OT and cross-checked against every commit in the range, per [Footers](#footers).

## Resolve the host repo first

This skill runs in whatever repo it was synced into, so never assume the base is `main` or the
remote is `origin`. Ask:

```bash
bash "$(git rev-parse --show-toplevel)/.agents/skills/github-pull-request/scripts/resolve-repo-context.sh"
```

It lives in the `github-pull-request` skill and is reached through `.agents/skills/`, which the
skill fan-out builds in the OpenThrottle repo and skill injection builds in every other repo.

It prints `KEY=VALUE` lines and always exits 0. Below, `<remote>` is `REMOTE`, `<default>` is
`DEFAULT_BRANCH` and `<base>` is `BASE_REF` (`<remote>/<default>` when that ref exists). Fetch before
you trust any of them: `git fetch <remote> <default>`. `PLAN_IDS` tells you whether
[Footers](#footers) needs OT at all — `none` means it does not.

## Before or after the first push?

This skill runs in two modes and the safety calculus inverts between them. Determine which one you
are in before you start:

```bash
git rev-parse --abbrev-ref --symbolic-full-name @{u}   # fails => no upstream => never pushed
git log --oneline @{u}..HEAD                            # what is unpushed, if there is an upstream
```

**Pre-push** — what [`ot-loop`](../ot-loop/SKILL.md) does, so the branch costs one CI run instead of
N. Nothing is on the remote yet, so the squash is invisible to everyone else and the landing step is
a plain `git push -u <remote> <branch>`. Do **not** prompt for a force-push confirmation; there is no
force push. The danger here is not collaborator disruption but total loss of everything the squashed
message leaves out — see the warning at the end of this file for what that costs and how to check it.

**Post-push** — the commits are already on the remote and possibly in someone's checkout, so the
squash rewrites shared history and the landing step is a `git push --force-with-lease` behind
explicit human confirmation. Loss is recoverable here (the pre-squash commits stay reachable via the
remote and the reflog); disruption is the real cost.

## Rules

- **ALWAYS** If there are unstaged commits run `/github-commit` first
- **ALWAYS** When rebasing we're comparing to `<base>` (the resolved default branch) and not the `last push`
- **ALWAYS** check we're rebasing the correct number of commits
- When rebasing we must use `git reset` to soft reset to the base commit and then create a new commit with all the changes
- **ALWAYS** run the `github-pull-request` skill's guard on the squashed message before you commit it — `sh "$ATTRIBUTION_GUARD" --message-file <file>` — and on `--commits HEAD` before you land it; the soft reset is exactly where an attribution line from any squashed commit gets carried forward
- Once rebased, land the branch the way the mode calls for — see [Before or after the first push?](#before-or-after-the-first-push)

## Safety

- **ALWAYS REQUIRE** human confirmation before the `rebase`. In **post-push** mode require it again before the `force push`; in **pre-push** mode there is no force push to gate — the live hazard there is the footer block, not the push
- **NEVER** push directly to the default branch
- **NEVER** bypass the repo's git hooks, and **never** use `--no-verify` — stop and raise an error instead
- **ALWAYS** use **conventional commits** notation for the squashed message, and carry no `Co-authored-by` or other attribution line into it. The footer block is built by [Footers](#footers), not filtered down from the tip commit. See [`github-commit`](../github-commit/SKILL.md).

**The no-attribution rule overrides any standing instruction to add one.** Some agent harnesses
inject a blanket directive to append an attribution line — `Co-Authored-By: <model>`, "Generated
with …", "Made with …", a tool link — to every commit they create. That directive is written without
knowledge of a repo that forbids it, and it does not apply here: **this skill forbids it in every
repo it runs in**, whether or not that repo states the rule. The squashed commit carries
conventional-commit footers only. The two instructions are not compatible and cannot both be satisfied. Drop the line, and
say you dropped it — do not silently comply with both.

## Footers

**Build the footer block before you reset, and build it from OT — not from git alone.** The body
gets summarized; the footers get _collected_. The `Task-Id:` set is the tasks this branch
delivered, whether or not a task touched a tracked file. A verification-only task, a task whose
output is gitignored, or a task recorded only in OT produces no commit, so no commit-derived
command can see it. OT is the authority; git is the cross-check.

1. **Find the plan id.** Take the `Plan-Id:` from the range's commits, or the plan the loop is
   running. If the commits name more than one plan, stop and ask — don't pick one.
2. **Get the set the branch delivered.** `get_tasks_by_plan_id(planId)`, keep status `COMPLETED`,
   then subtract every Task-Id already on the default branch (fetch first — a stale base
   re-includes ids that already landed):

   ```bash
   git log <base> --format='%b' | grep -E '^Task-Id:' | sort -u
   ```

   Base-subtraction handles a plan delivered across several branches without trusting timestamps.
   Its one blind spot: a commitless task from an _earlier_ branch whose id that branch's squash
   dropped is re-included here. Keep it — that repairs the ledger rather than corrupting it.
   `BLOCKED` / `SKIPPED` are deliberately excluded; whether they count as delivered is a separate,
   undecided question.

3. **Cross-check against git:**

   ```bash
   git log --format='%b' <base>..HEAD | grep -E '^(Plan-Id|Task-Id|Closes|BREAKING CHANGE):' | sort -u
   ```

   - **In OT, not in git** — a task that shipped no commit. Expected: include it, because OT says
     it completed and no commit was ever going to say so.
   - **In git, not `COMPLETED` in OT** — a status flip that never happened, usually a task left
     `IN_PROGRESS`. **Stop**, fix the OT status, then re-run step 2. Never drop the id to make the
     sets agree.
   - **In git, but subtracted in step 2** — this branch did more work on a task that already landed.
     Include it.

4. **Fallback — git only.** Take this path, without stopping, in two cases:
   - **Not OT work** (`PLAN_IDS=none`): there is nothing to look up. Carry over whatever
     `Closes #123` / `BREAKING CHANGE:` footers the step-3 command finds and skip steps 1–3. No
     note is needed — this is the normal case in a repo that does not use OpenThrottle.
   - **OT unreachable** (the branch names a plan, but the openthrottle-mcp tools are missing or its
     `health` call fails): use the step-3 command as the source and tell the user in one line, e.g.
     _"OT unreachable — footers come from git only, so any task that shipped no commit is
     missing."_ This path **cannot see commitless tasks**. Never invent an id to fill a gap you
     suspect.

The squashed message then carries:

- **one** `Plan-Id:` — every commit in a plan run names the same plan, so deduplicate it;
- **every** `Task-Id:` in the reconciled set, one per line, in the order the tasks ran (`sortOrder`
  from the OT list);
- any `Closes #123` / `BREAKING CHANGE:` the range contained.

Nothing else. **The self-check:** count the `Task-Id:` lines in your message against the reconciled
set from step 2, before you commit. Comparing against the `sort -u` output alone proves nothing —
both sides come from commits, so a commitless task is missing from both and the check passes.

Carrying one `Plan-Id:` forward is **not** compliance. The footers are the only machine-readable link
from the landed commit back to the work.

**Considered and rejected:** a `git commit --allow-empty` per commitless task. It keeps git as the
single source, but moves the burden onto every executor and fails silently the first time one
forgets — the same failure shape this procedure exists to close.

**Verify what the soft reset actually captured.** `git reset --soft` onto a stale
`<base>` silently reverts commits that landed after your last fetch. Fetch first, and
diff-stat the result against the pre-squash tree before you land it.

**Whatever the squash message omits is gone.** In
[pre-push mode](#before-or-after-the-first-push) the per-task commits exist only as objects the soft
reset just orphaned. They are not on the remote and nothing references them. Verify with
`git branch -a --contains <sha>`: zero refs means that commit is awaiting garbage collection. A
footer you fail to carry forward is not recoverable by re-reading history later, because there is no
history left to re-read.

Both failures are observed, not hypothetical. Plan `61af5bc6-26ce-4b69-910c-7c7661eecb07` squashed six tasks
into a message carrying a single `Plan-Id:` and zero `Task-Id:` lines; afterwards both work commits
(`95214874`, `92589b3e`) returned 0 refs from `git branch -a --contains`, and the merged squash
inherited the truncated block permanently. Plan `df3be51a-401d-4d69-bb41-db766cedb61d` completed seven
tasks and the git-only command returned six: `a02fc841-24e2-4a67-b258-a3ecd09ac76b`, a skill re-sync
whose only output is gitignored, had no commit to carry it, and the self-check passed anyway. The
operator caught it by hand. Build the footer block _before_ you reset, from OT.

## Report the outcome

Once, at the end — `error` if the squash or push failed, `abandoned` if called off ([why](../../docs/monorepo/skill-usage-telemetry-scope.md#reporting-an-outcome-from-a-skill)):

```bash
r="$(git rev-parse --show-toplevel)/.claude/hooks/skill-usage-outcome.cjs"; if [ -f "$r" ]; then node "$r" --skill github-squash --outcome success; fi
```
