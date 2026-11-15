# Building the footer block

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
   A commitless task from an _earlier_ branch whose id that branch's squash dropped is re-included
   here; keep it, that repairs the ledger. `BLOCKED` / `SKIPPED` are deliberately excluded.

3. **Cross-check against git:**

   ```bash
   git log --format='%b' <base>..HEAD | grep -E '^(Plan-Id|Task-Id|Closes|BREAKING CHANGE):' | sort -u
   ```

   - **In OT, not in git** — a task that shipped no commit. Include it.
   - **In git, not `COMPLETED` in OT** — a status flip that never happened, usually a task left
     `IN_PROGRESS`. **Stop**, fix the OT status, then re-run step 2. Never drop the id to make the
     sets agree.
   - **In git, but subtracted in step 2** — this branch did more work on a task that already landed.
     Include it.

4. **Fallback — git only.** Take this path, without stopping, in two cases:
   - **Not OT work** (`PLAN_IDS=none`): carry over whatever `Closes #123` / `BREAKING CHANGE:`
     footers the step-3 command finds and skip steps 1–3. No note is needed.
   - **OT unreachable** (the branch names a plan, but the openthrottle-mcp tools are missing or its
     `health` call fails): use the step-3 command as the source and tell the user in one line, e.g.
     _"OT unreachable — footers come from git only, so any task that shipped no commit is
     missing."_ Never invent an id to fill a gap you suspect.

The squashed message then carries:

- **one** `Plan-Id:` — deduplicate it;
- **every** `Task-Id:` in the reconciled set, one per line, in the order the tasks ran (`sortOrder`
  from the OT list);
- any `Closes #123` / `BREAKING CHANGE:` the range contained.

Nothing else. **The self-check:** count the `Task-Id:` lines in your message against the reconciled
set from step 2, before you commit. Comparing against the `sort -u` output alone proves nothing —
a commitless task is missing from both sides and the check passes.

Carrying one `Plan-Id:` forward is **not** compliance. The footers are the only machine-readable link
from the landed commit back to the work.

**Whatever the squash message omits is gone.** In pre-push mode the per-task commits are orphaned by
the soft reset and nothing on the remote references them — which is why SKILL.md makes a backup
ref first. A footer you fail to carry forward cannot be recovered by re-reading history later.
