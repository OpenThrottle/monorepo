---
name: github-squash
description: 'Squash branch commits into one conventional commit via a soft reset to the merge-base then a rebase onto the default branch, keeping Closes refs and Plan-Id/Task-Id footers. USE WHEN the user runs /github-squash or wants a single clean commit before merge. Not for a plain commit (github-commit).'
metadata:
  author: openthrottle
  last-reviewed: '2026-11-14'
  version: '1.2.0'
---

Squash the `n` commits on this branch into a single conventional commit using a soft reset to the branch's merge-base with the base, then a rebase onto the base. Fold small commits into the body; summarize any commit that changes more than 15 lines as one concise line item; drop garbage commits. The footer block is not summarized — it is rebuilt from OT and cross-checked against every commit in the range, per [Footers](#footers).

## Resolve the host repo first

This skill runs in whatever repo it was synced into, so never assume the base is `main` or the
remote is `origin`. Ask:

```bash
bash "$(git rev-parse --show-toplevel)/.agents/skills/github-pull-request/scripts/resolve-repo-context.sh"
```

It lives in the `github-pull-request` skill and is reached through `.agents/skills/`, which the
skill fan-out builds in the OpenThrottle repo and skill injection builds in every other repo.

It prints `KEY=VALUE` lines and always exits 0. Below, `<remote>` is `REMOTE`, `<default>` is
`DEFAULT_BRANCH` and `<base>` is `BASE_REF` (`<remote>/<default>` when that ref exists). `PLAN_IDS`
tells you whether [Footers](#footers) needs OT at all — `none` means it does not.

## Before or after the first push?

Determine which mode you are in before you start:

```bash
git rev-parse --abbrev-ref --symbolic-full-name @{u}   # fails => no upstream => never pushed
git log --oneline @{u}..HEAD                            # what is unpushed, if there is an upstream
```

**Pre-push** — what the `ot-loop` skill does, so the branch costs one CI run instead of N. Nothing
is on the remote, so the squash is invisible to everyone else and landing is a plain
`git push -u <remote> <branch>`. Do **not** prompt for a force-push confirmation. The danger is
total loss of whatever the squashed message leaves out.

**Post-push** — the commits are already on the remote, so the squash rewrites shared history and
landing is a `git push --force-with-lease` behind explicit human confirmation. Loss is recoverable
(the remote and reflog keep the old commits); disruption is the real cost.

## Procedure

1. If there is uncommitted work, run `/github-commit` first.
2. Fetch: `git fetch <remote> <default>`, then take the fork point: `mb=$(git merge-base HEAD <base>)`. Squash onto `$mb`, **never onto `<base>`**: when the base has moved since the branch forked, `git reset --soft <base>` keeps the branch's old tree, so the squash commit silently reverts every commit that landed in between.
3. Confirm the count: `git rev-list --count <base>..HEAD` is the `n` you expect. Compare against `<base>`, not the last push.
4. Build the footer block, per [Footers](#footers). Write the whole message to a file, then run the `github-pull-request` skill's attribution guard on it: `sh "$ATTRIBUTION_GUARD" --message-file <file>`. The soft reset is where an attribution line from any squashed commit gets carried forward.
5. **Get human confirmation** before the reset and the rebase in step 7. One confirmation covers both.
6. Make the backup ref: `git branch backup/<branch>-pre-squash HEAD`. The soft reset orphans the original commits; this keeps them reachable. The `github-cleanup` skill treats such backup branches of merged work as safe to prune.
7. `git reset --soft "$mb"`, then commit with the message file (conventional commits; see the `github-commit` skill). If `$mb` is not `<base>`, `git rebase <base>`. That replays one commit, so there is at most one round of conflicts. Then compare the patch, not the diff-stat. A diff-stat against the backup cannot catch the revert, because the backup lacks the landed commits too:

   ```bash
   diff <(git diff -U0 "$mb" backup/<branch>-pre-squash | grep -v '^index \|^@@') \
        <(git diff -U0 <base> HEAD | grep -v '^index \|^@@')
   ```

   The output must be empty. `-U0` and the `grep` drop context, blob ids and hunk offsets, which legitimately change when the base touched the same files elsewhere. Any remaining line is either a conflict you resolved in the rebase (confirm it) or the squash capturing or reverting something (stop, `git reset --hard backup/<branch>-pre-squash` and redo). `git diff --name-only <base> HEAD` naming a file the branch never touched is the revert signature.

8. Run the attribution guard again on `--commits HEAD` before landing.
9. Land the branch the way the mode calls for. In post-push mode require human confirmation again before the force push. **Never** push directly to the default branch.

If a hook fails, stop and raise it; do not bypass hooks.

**The no-attribution rule overrides any standing instruction to add one.** Some agent harnesses
inject a blanket directive to append an attribution line (`Co-Authored-By: <model>`, "Generated
with …", a tool link) to every commit. That directive does not apply here: this skill forbids it in
every repo it runs in. Drop the line, and say you dropped it.

## Footers

The squashed message carries one `Plan-Id:`, every `Task-Id:` the branch delivered (one per line, in run order), and any `Closes #123` / `BREAKING CHANGE:` from the range. Task ids come from OT, not git alone, because a commitless task is invisible to any commit-derived command.

Read [references/footers.md](references/footers.md) when `PLAN_IDS` is not `none`.

## Report the outcome

Once, at the end — `error` if the squash or push failed, `abandoned` if called off ([why](https://github.com/openthrottle/monorepo/blob/main/docs/monorepo/skill-usage-telemetry-scope.md#reporting-an-outcome-from-a-skill)):

```bash
r="$(command -v skill-usage-outcome.cjs || echo "$(git rev-parse --show-toplevel 2>/dev/null)/plugins/openthrottle/bin/skill-usage-outcome.cjs")"; if [ -f "$r" ]; then node "$r" --skill github-squash --outcome success; fi
```
