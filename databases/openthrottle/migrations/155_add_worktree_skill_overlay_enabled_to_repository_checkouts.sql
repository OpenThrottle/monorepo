-- Per-checkout opt-out for the ot-worktree skill overlay. Worktrees created for a
-- foreign repository (one that is not the OpenThrottle monorepo) get OpenThrottle's
-- worktree provisioning layered over them by default; this flag lets a user turn
-- that off for a checkout. Like foreign_skill_injection_enabled (migration 090) it
-- lives on repository_checkouts, the per-user table (unique on
-- (user_id, filesystem_path)), NOT on the shared `repositories` identity row.
--
-- Default TRUE = opt-out: every existing and new checkout keeps the overlay unless
-- the user explicitly disables it. Additive + idempotent; existing rows backfill to
-- TRUE through the column default.
-- Number 155 (not 154): open PRs #708 and #710 both claim 153.

ALTER TABLE repository_checkouts
  ADD COLUMN IF NOT EXISTS worktree_skill_overlay_enabled BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN repository_checkouts.worktree_skill_overlay_enabled IS 'True (default, opt-out) when the ot-worktree skill overlay is applied to worktrees of this foreign checkout. Set FALSE to opt out: worktree provisioning then falls back to the server''s SSOT scripts instead of the overlay, and worktrees keep working. Only meaningful for foreign checkouts (not the OpenThrottle repo itself).';
