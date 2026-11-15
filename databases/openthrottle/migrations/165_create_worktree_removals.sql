-- Server-side audit trail of worktree removals performed by ot-worktree's destroy.sh.
--
-- destroy.sh already appends one JSON line per invocation to ~/.openthrottle/logs/worktree-removals.log
-- (skills/ot-worktree/scripts/removal-log.sh). That log dies with the laptop, so the post-removal
-- deregisterWorktreeCheckout call now carries the same fields and the server keeps them here — a
-- removal can then be attributed from the server alone, and the repositories page can show it.
--
-- Append-only: one row per deregister call that carried an audit payload, whatever the server's
-- outcome (a worktree OpenThrottle never registered is still a removal worth recording). The
-- pre-removal active-run probe sends no audit and writes nothing.
--
-- checkout_id has no foreign key on purpose: a PRUNED deregistration deletes that checkout row in
-- the same request, and the id is kept as history. repository_id is resolved from the checkout
-- before the prune and is SET NULL if the repository is ever deleted.
--
-- Idempotent: table and indexes are IF NOT EXISTS; FKs are added in pg_constraint-guarded
-- statements (an inline REFERENCES under IF NOT EXISTS can silently never land).

CREATE TABLE IF NOT EXISTS worktree_removals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    repository_id UUID,
    checkout_id UUID,
    filesystem_path TEXT NOT NULL,
    outcome TEXT NOT NULL,
    result TEXT,
    branch TEXT,
    probe TEXT,
    pid INTEGER,
    ppid INTEGER,
    parent_command TEXT,
    ancestry TEXT,
    agent_session TEXT,
    removed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'worktree_removals_user_id_fkey') THEN
    ALTER TABLE worktree_removals ADD CONSTRAINT worktree_removals_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'worktree_removals_repository_id_fkey') THEN
    ALTER TABLE worktree_removals ADD CONSTRAINT worktree_removals_repository_id_fkey
      FOREIGN KEY (repository_id) REFERENCES repositories (id) ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_worktree_removals_user_path_created
    ON worktree_removals (user_id, filesystem_path, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_worktree_removals_repository_created
    ON worktree_removals (repository_id, created_at DESC);

COMMENT ON TABLE worktree_removals IS 'Append-only audit of worktree removals reported by ot-worktree destroy.sh through the post-removal deregisterWorktreeCheckout call: what was removed, by which process and agent session, and what the server did with the checkout record. Mirrors the local ~/.openthrottle/logs/worktree-removals.log line so a removal stays attributable after the laptop log is lost. Every client-supplied value is untrusted, truncated server-side and may be NULL.';

COMMENT ON COLUMN worktree_removals.id IS 'Surrogate primary key.';

COMMENT ON COLUMN worktree_removals.user_id IS 'Human user the removal is attributed to, resolved server-side from the authenticated principal (a service account via its acting_user_id); never accepted from the client. FK users(id), ON DELETE CASCADE.';

COMMENT ON COLUMN worktree_removals.repository_id IS 'Repository of the checkout registered at the path, resolved before the prune. NULL when no checkout was registered there. FK repositories(id), ON DELETE SET NULL.';

COMMENT ON COLUMN worktree_removals.checkout_id IS 'repository_checkouts id that was registered at the path when the call arrived, kept as history. No FK: a PRUNED outcome deletes that row in the same request. NULL when none was registered.';

COMMENT ON COLUMN worktree_removals.filesystem_path IS 'Absolute worktree path as the teardown sent it (the registered path when a checkout matched).';

COMMENT ON COLUMN worktree_removals.outcome IS 'What the server did with the checkout record: pruned, not-found, skipped-active-run, skipped-live or skipped-primary (PruneWorktreeCheckoutOutcome).';

COMMENT ON COLUMN worktree_removals.result IS 'destroy.sh''s own result for the invocation, e.g. removed. Free text from the client.';

COMMENT ON COLUMN worktree_removals.branch IS 'Branch the worktree had checked out, as destroy.sh saw it.';

COMMENT ON COLUMN worktree_removals.probe IS 'Outcome of destroy.sh''s pre-removal active-run probe (disabled, unavailable, no-outcome or a server outcome).';

COMMENT ON COLUMN worktree_removals.pid IS 'destroy.sh process id on the client machine.';

COMMENT ON COLUMN worktree_removals.ppid IS 'Parent process id of destroy.sh on the client machine.';

COMMENT ON COLUMN worktree_removals.parent_command IS 'Command line of the parent process, truncated.';

COMMENT ON COLUMN worktree_removals.ancestry IS 'A few levels of "pid command" above the parent, joined by " <- ", truncated. The direct parent is usually a pnpm or sh wrapper; the real caller sits further up.';

COMMENT ON COLUMN worktree_removals.agent_session IS 'Calling agent''s session id when its harness exports one (Claude Code: CLAUDE_CODE_SESSION_ID). Still names the session after its transcript is deleted.';

COMMENT ON COLUMN worktree_removals.removed_at IS 'Client-side timestamp of the removal (the log line''s ts). NULL when absent or unparseable; created_at is the server''s receipt time.';

COMMENT ON COLUMN worktree_removals.created_at IS 'When the server recorded the row.';
