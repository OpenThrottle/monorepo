-- Collapse duplicated git_commit artifacts to one row per commit, moving the
-- losers' plan/task attribution onto the survivor rather than discarding it
-- (OT plan 75e8cd5c, task 2f3d5006).
--
-- WHY THERE ARE DUPLICATES
--
-- uq_work_artifacts_session_type_key is scoped to (session_id, type,
-- external_key), so the same commit recorded under a different session is a new
-- row, not an upsert. The commit_links backfill (069) minted one session per
-- commit-link, so a commit closing N plan/task links became N artifacts. At the
-- time of writing that is 116 duplicated external_keys spanning 983 rows; the
-- worst single commit has 67 copies, then 57, 35, 34.
--
-- THE MODEL THIS RESTORES (M1)
--
-- One artifact per commit; plans and tasks attach as SUBJECTS of the artifact's
-- session. work_session_subjects is already many-to-many by design, so a commit
-- closing 10 plans is correctly 1 artifact + 10 subject rows — not 10 artifacts.
--
-- THIS IS NOT A PLAIN DEDUPE. Of the 116 duplicated keys, 93 map to exactly one
-- plan but 23 map to several — worst case 10 plans and 57 distinct tasks on a
-- single commit. Those are real many-to-many links, not corruption: commits on
-- main genuinely carry two Plan-Id: trailers. A delete-the-losers migration
-- would silently destroy them, which is exactly what this one must not do.
--
-- SURVIVOR CHOICE, in order:
--
--   1. A row carrying payload.landedSha. Only 38 rows have one and they are the
--      only truthful rows in the table — the backfill never wrote one. An
--      age-based rule would be actively wrong here: the legacy rows are OLDER,
--      so "earliest wins" would systematically select the lie over the truth.
--   2. A row whose session holds no OTHER commit. See the attribution note
--      below for why this matters.
--   3. verified before unverified, then earliest produced_at, then id, so the
--      choice is deterministic and a re-run cannot pick differently.
--
-- Both statements below derive the survivor with the same ORDER BY, so they
-- cannot disagree about who lives.
--
-- SAFETY
--
-- Subjects are copied BEFORE any delete, and the copy is additive and
-- conflict-tolerant, so a run interrupted between the two statements loses
-- nothing and re-running completes it. Subjects are copied onto the survivor's
-- session; the losers' sessions and their subject rows are left untouched,
-- because a session can hold other artifacts that still need them.
--
-- THE INVARIANT IS PAIRS, NOT ROWS. Correctness here is measured as
--   (external_key, plan_id) pairs, and likewise (external_key, task_id).
-- The artifact row count is SUPPOSED to fall (1065 -> 198 when this was
-- written). Asserting on row counts would either fail on success or pass on
-- data loss.
--
-- Verified against a copy of real data before shipping:
--   plan pairs lost 0, task pairs lost 0   <- the hard gate
--   distinct external_keys 198 before and after, 0 duplicated keys remaining
--   35 keys carrying a landedSha before and after (38 rows over 35 keys: three
--   keys held two truthful rows each, so collapsing them loses no truth)
--   re-run is a clean no-op (INSERT 0, DELETE 0)
--
-- RESIDUAL, stated rather than hidden: 4 (commit, plan) and 33 (commit, task)
-- pairs are GAINED. Attribution is session-scoped, so when a survivor's session
-- also holds some other commit, subjects copied onto that session for this
-- commit also attach to that other one. Preference 2 above removes this
-- wherever a candidate on an unshared session exists; 45 of the 116 keys have
-- no such candidate. Driving the gain to zero would mean giving each survivor a
-- fabricated session of its own — inventing work_sessions rows that assert an
-- actor did work in a session that never happened, to fix an over-link between
-- commits that already share a session. That is a worse lie than the one it
-- fixes. Nothing is destroyed: pairs lost is 0, which is the property the
-- many-to-many keys actually need.
--
-- Idempotent: once collapsed there are no duplicated keys left, so both
-- statements match nothing on a re-run.

-- 1. Carry every loser's plan/task attribution onto the survivor's session.
INSERT INTO work_session_subjects (session_id, plan_id, task_id)
SELECT DISTINCT
    survivor.session_id,
    subject.plan_id,
    subject.task_id
FROM (
    SELECT DISTINCT ON (artifact.external_key)
        artifact.external_key,
        artifact.session_id
    FROM work_artifacts artifact
    WHERE artifact.type = 'git_commit'
      AND artifact.external_key IN (
          SELECT external_key
          FROM work_artifacts
          WHERE type = 'git_commit'
          GROUP BY external_key
          HAVING count(*) > 1
      )
    ORDER BY
        artifact.external_key,
        ((artifact.payload ->> 'landedSha') IS NULL),
        EXISTS (
            SELECT 1
            FROM work_artifacts other
            WHERE other.session_id = artifact.session_id
              AND other.id <> artifact.id
              AND other.external_key <> artifact.external_key
        ),
        (artifact.verification <> 'verified'),
        artifact.produced_at,
        artifact.id
) AS survivor
JOIN work_artifacts AS duplicate
  ON duplicate.type = 'git_commit'
 AND duplicate.external_key = survivor.external_key
JOIN work_session_subjects AS subject
  ON subject.session_id = duplicate.session_id
ON CONFLICT (
    session_id,
    plan_id,
    COALESCE(task_id, '00000000-0000-0000-0000-000000000000'::uuid)
) DO NOTHING;

-- 2. Drop every copy that is not the survivor for its key.
DELETE FROM work_artifacts
WHERE type = 'git_commit'
  AND external_key IN (
      SELECT external_key
      FROM work_artifacts
      WHERE type = 'git_commit'
      GROUP BY external_key
      HAVING count(*) > 1
  )
  AND id NOT IN (
      SELECT DISTINCT ON (artifact.external_key)
          artifact.id
      FROM work_artifacts artifact
      WHERE artifact.type = 'git_commit'
        AND artifact.external_key IN (
            SELECT external_key
            FROM work_artifacts
            WHERE type = 'git_commit'
            GROUP BY external_key
            HAVING count(*) > 1
        )
      ORDER BY
          artifact.external_key,
          ((artifact.payload ->> 'landedSha') IS NULL),
          EXISTS (
              SELECT 1
              FROM work_artifacts other
              WHERE other.session_id = artifact.session_id
                AND other.id <> artifact.id
                AND other.external_key <> artifact.external_key
          ),
          (artifact.verification <> 'verified'),
          artifact.produced_at,
          artifact.id
  );
