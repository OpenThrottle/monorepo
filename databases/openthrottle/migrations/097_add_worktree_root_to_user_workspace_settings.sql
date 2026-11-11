-- Workspace-level worktree root: the one directory every agent (Claude, Cursor, Ralph,
-- the BullMQ plans worker) creates git worktrees under. NULL means "use the default"
-- (a sibling openthrottle-worktrees directory, resolved by scripts/create_worktree.sh).
-- See docs/openthrottle/plan-run-worktrees.md.

ALTER TABLE user_workspace_settings
ADD COLUMN IF NOT EXISTS worktree_root TEXT;

COMMENT ON COLUMN user_workspace_settings.worktree_root IS
'Absolute directory every git worktree is created under, forwarded to scripts/create_worktree.sh as OT_WORKTREE_ROOT. NULL = the default sibling openthrottle-worktrees directory.';
