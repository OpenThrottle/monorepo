-- Final removal of the deprecated commit_links table (work-ledger epic 3b798682, G4 endgame).
-- The work ledger (migration 068) is now the sole home for git_commit provenance; migration 069
-- backfilled every valid commit_links row into a work_artifacts git_commit artifact. All writers and
-- readers moved to the ledger (retire-commit_links 1/6-5c/6); the linkCommit mutation, the
-- CommitLink entity (both DataSources), and the commit-links GraphQL module have been removed.
--
-- Idempotent: no-op if the table is already gone. Before dropping, assert parity — every commit_links
-- row whose plan (and task, when set) still exists is represented by a git_commit ledger artifact in
-- its ledger-migration session. Orphaned links (plan/task since deleted) were intentionally NOT
-- backfilled by 069 and are excluded here, matching 069's validity filter. Aborts the drop (no data
-- loss) if any droppable row is unrepresented.

DO $$
DECLARE
    unrepresented bigint;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'commit_links'
    ) THEN
        SELECT COUNT(*) INTO unrepresented
        FROM commit_links cl
        WHERE EXISTS (SELECT 1 FROM plans p WHERE p.id = cl.plan_id)
          AND (cl.task_id IS NULL OR EXISTS (SELECT 1 FROM tasks t WHERE t.id = cl.task_id))
          AND NOT EXISTS (
              SELECT 1
              FROM work_sessions ws
              JOIN work_artifacts a ON a.session_id = ws.id
              WHERE ws.external_ref = 'ledger-migration:' || cl.plan_id || ':' || COALESCE(cl.task_id::text, 'plan')
                AND a.type = 'git_commit'
                AND a.external_key = 'github:' || cl.repo || '@' || cl.sha
          );

        IF unrepresented > 0 THEN
            RAISE EXCEPTION
                'Refusing to drop commit_links: % row(s) have no work-ledger git_commit artifact. Re-run migration 069 (backfill) first.',
                unrepresented;
        END IF;
    END IF;
END $$;

DROP TABLE IF EXISTS commit_links;
