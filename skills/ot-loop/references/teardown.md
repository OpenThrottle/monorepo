# Teardown the worktree (only after a successful PR)

Loaded from [`ot-loop`](../SKILL.md) § Teardown the worktree, once the plan's PR is open.
"Step 6" below is that skill's § Finishing step 6 (settling the run row).

Once — and **only** once — the PR is confirmed open, tear down the isolated worktree. The branch now lives on the remote (via the PR), so removing the local worktree frees it to be checked out in the primary instance, letting the end-user easily pull the work for manual verification against a primary server.

1. **Confirm the PR is real first.** You must have the PR URL from the step above, and `git status` in the worktree must show the branch up to date with its remote and nothing uncommitted. If PR creation failed or anything is unpushed, **do not tear down** — leave the worktree intact and report the failure so no work is lost. Settle your run row `FAILED` in that case: the work is preserved but this run is over, and an unsettled row keeps the worktree marked busy for as long as it lives.
2. **Stop anything running in the worktree** — kill dev servers/watchers scoped to _this worktree's path only_. Never use a bare process-name pattern; that also kills the main checkout's server + OT MCP. You do **not** need to stop the worktree's containers by hand — OpenThrottle's `.worktree/teardown.sh` does that in step 3, scoped to this worktree's own compose project.
3. **Remove the worktree with [`ot-worktree`](../../ot-worktree/SKILL.md) destroy**, never a bare `git worktree remove` — destroy runs `.worktree/teardown.sh` first, which stops this worktree's docker compose project (a bare removal leaves those containers running, detached from any checkout), and it refuses removals that would eat work. Run it from inside the worktree (no argument) or pass the worktree path.

   It also deregisters this worktree's OpenThrottle checkout record once the directory is gone — best-effort, so it never blocks teardown. The server keeps that record while a run that has not been settled still points at it, which is one more reason step 6's settle comes first.

   It refuses the primary checkout, refuses a dirty tree, prunes admin dirs afterward, and preserves the branch by default — which is what you want here, since both the open PR and the end-user's verification checkout depend on it. Never pass `--delete-branch`. Add `--force` only if it reports a dirty tree _after_ you have already confirmed everything is committed and pushed; `--dry-run` first if you want to see exactly what it will do.

4. **Report** the PR link and note that the branch is now free to check out in the primary instance for manual verification (`git checkout <branch>`), or in a fresh isolated worktree via [`ot-worktree`](../../ot-worktree/SKILL.md) create.
