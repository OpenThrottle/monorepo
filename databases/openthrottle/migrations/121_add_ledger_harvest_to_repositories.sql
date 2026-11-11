-- Per-repo control and watermark for the work-ledger trailer harvest
-- (OT plan 75e8cd5c, task f2f9755e).
--
-- The harvest reads Plan-Id: trailers off each repo's default branch and adopts
-- the commits nobody recorded. It is the unattended backstop: the plans in the
-- backlog have no live session left to record anything, so nothing else can
-- close them, and a human who opens a PR outside the loop is never covered by
-- the settle-time path either.
--
-- OPT-OUT, NOT OPT-IN. `ledger_harvest_enabled` defaults TRUE deliberately. A
-- default-false flag would leave the harvester silently doing nothing on a
-- fresh install and on every repo added later — the same "looks fine, records
-- nothing" failure this plan exists to remove. Turning it off must be a
-- decision someone made, not the state you get by not making one.
--
-- WATERMARK. `ledger_harvest_cursor` is the last sha harvested on the default
-- branch; the next sweep pages until it sees that sha and stops. A NULL cursor
-- means "scan from the beginning", NOT "do nothing" — so a repo that has never
-- been harvested gets a full first pass rather than being skipped forever.
-- `ledger_harvested_at` is the last time a sweep completed for the repo, for
-- operator legibility only; nothing keys off it.
--
-- Eligibility beyond this flag is derived rather than stored: a repo needs a
-- parseable github.com/<owner>/<repo> URL and a non-empty default_branch. Two
-- of the eleven current rows fail that on their own (one has no remote, one has
-- an empty default branch), which is the point — derived eligibility cannot go
-- stale the way a second stored flag would.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS, no backfill. Existing rows take the
-- TRUE default and a NULL cursor, which together mean "harvest this fully on
-- the next sweep" — exactly right for a first run.

ALTER TABLE repositories
    ADD COLUMN IF NOT EXISTS ledger_harvest_enabled BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE repositories
    ADD COLUMN IF NOT EXISTS ledger_harvest_cursor TEXT;

ALTER TABLE repositories
    ADD COLUMN IF NOT EXISTS ledger_harvested_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN repositories.ledger_harvest_enabled IS
    'Whether the work-ledger trailer harvest sweeps this repo. Defaults TRUE (opt-out): a default-false flag would make the harvester silently do nothing on a fresh install. Set FALSE to exclude a repo deliberately. Eligibility also requires a parseable github.com/<owner>/<repo> URL and a non-empty default_branch, both derived rather than stored.';

COMMENT ON COLUMN repositories.ledger_harvest_cursor IS
    'Last commit sha harvested from this repo default branch. The next sweep pages until it sees this sha and stops, so only newly-landed commits are examined. NULL means scan from the beginning (never harvested), NOT skip.';

COMMENT ON COLUMN repositories.ledger_harvested_at IS
    'When the last work-ledger harvest sweep completed for this repo. Operator legibility only — the sweep keys off ledger_harvest_cursor, never off this timestamp.';
