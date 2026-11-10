-- Correct three closed sets of skill-usage rows that were recorded wrong
-- (OT plan 25f11313). Each was root-caused before this was written; none is a
-- rule about future rows, so every predicate is pinned to a closed window or a
-- closed id list and cannot reach a row written after the fix.
--
-- 1. Stale-hook successes mis-stamped `reported_v1`  (skill_usage_outcomes)
--    Migration 124 attached DEFAULT 'reported_v1' to capture_model, and it hit
--    the shared local database on 2026-09-14, three days before #537 replaced
--    the Stop hook's hardcoded `success` with `session_ended`. Checkouts and
--    long-lived sessions running the pre-#537 bundle kept posting `success`
--    with a load-to-session-end duration through 2026-10-29, and the column
--    default labelled every one as a measured outcome. 116 rows, received
--    2026-09-14 02:11Z → 2026-10-29 19:13Z. No deliberate reporter was wired
--    anywhere in that window, so none of them is a quality claim: they get the
--    label migration 124 gave the identical pre-cutoff rows.
--
-- 2. Personal skills recorded before the `personal` scope existed  (both tables)
--    ot-beta-loop / ot-beta-loop-review live under the personal skills root,
--    but were captured 2026-09-11 → 09-17, before migration 114 added
--    `personal`, so they could only land in `third-party`.
--
-- 3. In-repo skills scored against the wrong directory  (both tables)
--    Four sessions launched from a directory that is not a git checkout (a
--    desktop-app scratch workspace) ran the user-scoped plugin's hooks, which
--    judged scope against that launch directory: github-squash /
--    github-pull-request were stamped `third-party` with an empty branch
--    (2026-10-30 → 11-01) although every tool call ran inside the repo. They
--    are authored under skills/, so they are `ours`. The capture hook now
--    resolves the checkout from the payload cwd. Pinned by session id; the
--    one other row of that shape is a foreign workspace, handled by 154.
--
-- Rows NOT touched: OT skills injected into foreign workspaces (migration
-- 154), and slugs that are not skills of ours at all (e.g. ot-telemetry).
--
-- Idempotent: every UPDATE filters on the value it replaces, so a re-run
-- matches nothing.

UPDATE skill_usage_outcomes
   SET capture_model = 'legacy_assumed_success'
 WHERE outcome = 'success'
   AND capture_model = 'reported_v1'
   AND received_at < TIMESTAMPTZ '2026-10-30 00:00:00+00';

UPDATE skill_usage_events
   SET scope = 'personal'
 WHERE scope = 'third-party'
   AND skill_name IN ('ot-beta-loop', 'ot-beta-loop-review')
   AND received_at < TIMESTAMPTZ '2026-09-18 00:00:00+00';

UPDATE skill_usage_outcomes
   SET scope = 'personal'
 WHERE scope = 'third-party'
   AND skill_name IN ('ot-beta-loop', 'ot-beta-loop-review')
   AND received_at < TIMESTAMPTZ '2026-09-18 00:00:00+00';

UPDATE skill_usage_events
   SET scope = 'ours'
 WHERE scope = 'third-party'
   AND skill_name IN ('github-pull-request', 'github-squash')
   AND session_id IN (
       '16861fca-b1c7-4ca2-b320-b3fcffa22bf3',
       '4577d7e8-6bbc-48b5-938e-a018093965ac',
       '4d55ae33-3fc9-4097-be18-88293874e89f',
       'aa349e89-a32b-4201-b8df-021881551f16'
   );

UPDATE skill_usage_outcomes
   SET scope = 'ours'
 WHERE scope = 'third-party'
   AND skill_name IN ('github-pull-request', 'github-squash')
   AND session_id IN (
       '16861fca-b1c7-4ca2-b320-b3fcffa22bf3',
       '4577d7e8-6bbc-48b5-938e-a018093965ac',
       '4d55ae33-3fc9-4097-be18-88293874e89f',
       'aa349e89-a32b-4201-b8df-021881551f16'
   );
