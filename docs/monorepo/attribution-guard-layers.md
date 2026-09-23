# The four attribution guards, and why only some of them fail

`AGENTS.md` § No agent attribution is enforced in four places. They deliberately do not behave the
same way: two rewrite, two refuse. This page records which is which and why, so the split reads as a
decision rather than as an inconsistency.

Decided for OT plan `40838811-e230-4c3b-a36a-04029792ddd4` task `f80c530d`. The pattern set itself
lives in exactly one file, [`.husky/lib/attribution-patterns.sh`](../../.husky/lib/attribution-patterns.sh),
and every layer below sources it rather than restating it.

## The layers

| layer                             | when                               | behavior                |
| --------------------------------- | ---------------------------------- | ----------------------- |
| `.husky/commit-msg`               | as a commit message is written     | **strips**, and says so |
| `.husky/pre-push`                 | before a push leaves the machine   | **fails the push**      |
| `scripts/check-pr-attribution.sh` | before `gh pr create`/`gh pr edit` | **fails locally**       |
| `attribution-guard` (CI)          | after the PR exists                | **fails the PR**        |

The dividing line is **publication**. Text that is still local and still rewritable gets rewritten.
Text that is about to become someone else's — or already has — gets refused.

## Why `commit-msg` strips instead of failing

The obvious reading of PR #554 is that the silent strip caused it, so the strip should become a
failure. That is the wrong conclusion, and acting on it would make the problem worse.

Several agent harnesses inject `Co-Authored-By:` into every commit they make, and the agent often
cannot suppress it upstream — the instruction arrives from the harness, not from the author. A hook
that hard-failed on it would block nearly every agent commit in the repo. The predictable response to
a hook that fails constantly is `--no-verify`, and `--no-verify` is precisely how the one line that
reached CI on #554 got there. Failing here would not have prevented that commit; it would have
manufactured more like it.

So the strip stays. What changes is that it stops being silent.

## Why it now says what it removed

The strip used to run with no output at all. Three commits on #554's branch were quietly rewritten,
so the author had no reason to believe the rule existed — and wrote the fourth, the `--no-verify`
squash, without care. The failure was ignorance, not inability.

`.husky/commit-msg` now prints the removed line, names the rule, and says explicitly that the commit
is fine and there is nothing to redo. That last part matters: an author who sees a warning and does
not know whether their commit survived will go looking, and the guard should not cost more attention
than the thing it is guarding against.

This is the cheapest available fix for the actual cause. It costs a few lines of output on the
commits that would have been silently rewritten anyway, and nothing at all on the rest.

## Why `pre-push` now has a gate of its own

`commit-msg` only runs when the commit-msg hook runs. `git commit --no-verify` skips it entirely,
and nothing downstream of that point was local any more — the next thing to look at the text was CI,
against a PR that already existed.

`.husky/pre-push` closes that window. It scans every commit the push would add and refuses the push
if any carries an attribution line, pointing at `git rebase -i` as the fix. A push is the last moment
the history is still private and still cheap to rewrite, which is exactly where a refusal belongs.

The gate lives in [`.husky/lib/attribution-push-gate.sh`](../../.husky/lib/attribution-push-gate.sh)
and is _sourced_ by the hook so its `exit 1` aborts the push — the same arrangement
`component-shape-gate.sh` already uses for the primitive-shape audit.

Two implementation notes that are easy to get wrong:

- **The push refs are read once, at the top of the hook.** Git hands them to `pre-push` on stdin, and
  stdin can only be consumed once. The hook reads them into `OT_PUSH_REFS` before sourcing any gate,
  so a gate that needs them does not starve the next one.
- **A new branch has no range to diff.** Git reports the all-zero remote sha for a branch the remote
  has never seen, so the gate falls back to `git rev-list <head> --not --remotes` rather than
  assuming a base branch it may not have forked from.

`--no-verify` on the push itself still bypasses this, as it bypasses every hook. That is what the
remaining two layers are for, and it is why none of them was removed.

## Why the PR-body guard fails rather than strips

A PR body is the first artifact in this chain that cannot be quietly fixed. `gh pr create --body-file`
publishes whatever it is handed, and once published the text is visible to anyone watching the repo —
there is no equivalent of rewriting a commit message before anyone sees it.

So [`scripts/check-pr-attribution.sh`](../../scripts/check-pr-attribution.sh) refuses, naming the rule
and the offending line, and the author edits the draft. It checks the title with the unanchored
pattern and the body with the anchored one, matching the CI job's own split, so a local pass and a CI
pass mean the same thing.

## Why CI still checks all of it

The three local layers are all skippable — by `--no-verify`, by an agent that never loads the
`github-pull-request` skill, by a PR opened in the GitHub web UI. CI is the only one nobody can route
around, and it is also the only one that sees the **squash-merge commit**, whose message GitHub
composes server-side from the branch commits. Two commits (`0e009e5f`/#499 and `463616df`/#497)
landed on `main` carrying `Co-authored-by:` through exactly that path.

The local layers exist to make the common case never reach CI, not to replace it.

## See also

- [`openthrottle/ot-loop-ci-gate.md`](../openthrottle/ot-loop-ci-gate.md) — the CI signal `ot-loop`
  waits on before it settles and tears down, which is the other half of the same plan.
- [`CI-quality-gates.md`](./CI-quality-gates.md) — the gate priority levels and the full gate table.
