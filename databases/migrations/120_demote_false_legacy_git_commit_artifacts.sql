-- Demote the legacy git_commit artifacts that claim to be verified and landed
-- without ever having been checked, so the existing verifier can re-derive the
-- truth about them (OT plan 75e8cd5c, task 9511f786).
--
-- THE FINDING
--
-- Every source='legacy' git_commit artifact asserts a commit that landed on the
-- default branch and was verified. Not one of those claims is true. Of the 162
-- distinct legacy shas carrying no landedSha:
--
--   reachable from origin/main                        0
--   exist locally but are not ancestors of main     115
--   do not exist locally at all                      47
--
-- They are pre-squash branch commits. Migration 069 stamped all of them
-- verification='verified', lifecycle='landed' wholesale, without asking GitHub
-- anything. And because the verifier's work queue is `lifecycle <> 'landed'`,
-- every one of them sits permanently outside it: nothing will ever re-examine a
-- row that already claims to be finished.
--
-- So the ledger's git half is not merely incomplete. It is wrong, and wrong in
-- the direction that makes it look finished — 1017 verified-landed claims, none
-- of them true.
--
-- WHAT THIS DOES
--
-- Sets verification='unverified', lifecycle='created', verified_at=NULL on
-- exactly those rows, which puts them back into the verifier's queue. No new
-- code: this reuses machinery that currently has almost nothing to verify.
-- From there the verifier decides, per row, using GitHub rather than assertion:
--
--   * a commit whose squash merge it can resolve is promoted back to 'landed'
--     WITH a real landedSha — a true claim this time
--   * a commit GitHub can no longer find ages out to 'orphaned' after
--     WORK_LEDGER_VERIFY_ORPHAN_GRACE_HOURS (7 days)
--
-- Both outcomes are better than the status quo, because both are derived.
--
-- SCOPE, deliberately narrow. Only source='legacy' rows with NO landedSha are
-- touched. A row carrying a landedSha was verified for real and keeps its state;
-- agent-sourced rows are not the backfill's doing and are left alone.
--
-- DEPENDS ON 118 AND 119. Running before the dedupe would push all 1017 rows
-- through the verifier only to discover that 116 keys among them are duplicates
-- of each other — ~850 wasted GitHub round trips. After 118 these 1017 rows are
-- already collapsed to their ~162 distinct commits, which is a single verifier
-- sweep rather than an 80-minute drain.
--
-- DEPENDS ON TASK 1 (trigger suppression), which is the reason this is safe to
-- run at all. Every row the verifier promotes to 'landed' would otherwise fire
-- refine-tagging once per subject plan, and these rows have the most subjects in
-- the table — up to 10 plans and 57 tasks on a single commit. Suppression keys
-- off source, and 'legacy' is on the suppressed list precisely so this migration
-- cannot turn into a bill for ~1k LLM calls.
--
-- Idempotent: the WHERE clause excludes rows already demoted, so a re-run
-- matches nothing. It is also safe to re-run after the verifier has promoted
-- some rows back to landed — those now carry a landedSha and no longer match.

UPDATE work_artifacts
SET verification = 'unverified',
    lifecycle    = 'created',
    verified_at  = NULL
WHERE type = 'git_commit'
  AND source = 'legacy'
  AND payload ->> 'landedSha' IS NULL
  AND (verification = 'verified' OR lifecycle = 'landed');
