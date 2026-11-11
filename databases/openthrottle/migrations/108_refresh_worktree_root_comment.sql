-- Refresh the user_workspace_settings.worktree_root comment: both facts in it are dead.
--
-- Migration 097 introduced the column and documented it against the world as it
-- was then. Two things have since changed:
--
--   1. `scripts/create_worktree.sh` no longer exists. Worktree create/heal/destroy
--      was extracted into the portable `ot-worktree` skill, so the script this
--      column is forwarded to is now `skills/ot-worktree/scripts/create.sh`.
--   2. The default is no longer "a sibling openthrottle-worktrees directory". It
--      is `~/worktrees/<repo-name>` — a single global root outside every repo,
--      namespaced by the base checkout's directory name.
--
-- Also worth recording here, because it is the part that surprises people: this
-- column reaches non-server callers (`pnpm run worktree:new`, the Claude
-- WorktreeCreate hook, Cursor) only via the user-global file
-- `~/.openthrottle/worktree-root`, which is written when the setting is SAVED.
-- Postgres is unreachable from a shell script, so that file is the only channel.
--
-- Comment-only: no schema change, no data touched. Idempotent by construction.

COMMENT ON COLUMN user_workspace_settings.worktree_root IS
'Absolute directory every git worktree is created under. Forwarded to skills/ot-worktree/scripts/create.sh as OT_WORKTREE_ROOT on server-driven runs, and mirrored to the user-global file ~/.openthrottle/worktree-root on save so the CLI, the Claude WorktreeCreate hook and Cursor resolve the same root. NULL = the default, ~/worktrees/<repo-name>. See docs/openthrottle/plan-run-worktrees.md.';
