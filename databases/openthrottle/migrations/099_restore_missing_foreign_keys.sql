-- Restore the 15 foreign keys that earlier migrations declare but the live
-- schema lost, and clean the orphan rows their absence allowed
-- (OT plan 70239a50, task 92f82126).
--
-- WHY THEY WENT MISSING
-- Every constraint restored below is written as an inline `REFERENCES` in the
-- migration that created its table (003, 004, 005, 007, 020, 025, 034, 035, 036,
-- 037), inside a `CREATE TABLE IF NOT EXISTS` or `ADD COLUMN IF NOT EXISTS`.
-- Those guards are all-or-nothing: on a database where the table or column
-- already existed -- an early bootstrap, a seed image predating the migration, a
-- pg_dump restore that dropped constraints -- the guard skips the WHOLE
-- statement. The column lands, nothing looks wrong, and the constraint never
-- exists. The schema_migrations ledger then records the migration as applied and
-- nothing ever reconciles. An audit of declared vs live foreign keys found 47
-- live against 62 declared for tables that still exist.
--
-- `scripts/check-migration-hygiene.ts` (in check:local) now fails on this
-- pattern, so this is a one-time repair rather than a recurring one. See
-- databases/README.md § Foreign keys in migrations for the correct shape.
--
-- WHY ROWS ARE DELETED
-- Part 1 is destructive and was explicitly authorised by the repository owner.
-- Every row it removes would ALREADY have been removed by the `ON DELETE
-- CASCADE` its own migration declared, had the constraint existed. They survived
-- only because the constraint did not, and they are unreachable today: a task
-- whose plan no longer exists cannot be listed, opened or run. The deletion
-- restores the state the schema always intended rather than discarding live
-- data.
--
-- Measured on the audited database immediately before authoring:
--   deleted   178 tasks              (plan_id -> a plan that no longer exists)
--              68 plan_embeddings    (same)
--              50 plan_output_stream (same)
--               6 user_roles         (user_id -> a user that no longer exists)
--              38 task_embeddings    ) hanging off those 178 tasks
--              25 task_tags          )
--   nulled     12 plans.project_id   (declared ON DELETE SET NULL)
--              91 tasks.project_id   (same)
--               3 plan_output_stream.task_id (via the existing live FK)
--
-- SAFETY / IDEMPOTENCY
-- Every repair statement is predicated on `NOT EXISTS (parent)`, so on a healthy
-- database each matches zero rows and is a no-op -- including a re-run of this
-- migration, and including a fresh database that never had the drift. Part 2
-- guards on pg_constraint by (table, column) rather than by constraint name, so
-- it is equally a no-op on a fresh database, where CREATE TABLE already produced
-- the constraint under its default `<table>_<column>_fkey` name.
--
-- Constraints are added NOT VALID and then validated: ADD CONSTRAINT ... NOT
-- VALID takes a brief lock without scanning the table, and VALIDATE CONSTRAINT
-- scans under SHARE UPDATE EXCLUSIVE, which does not block concurrent reads or
-- writes.
--
-- DELIBERATELY NOT RESTORED: commit_links (dropped in 075) and
-- workspace_local_repositories (dropped in 078). Both declare foreign keys, but
-- the tables no longer exist, so those declarations are dead letters rather than
-- drift.

-- ---------------------------------------------------------------------------
-- Part 1 -- repair orphans, children before parents.
-- ---------------------------------------------------------------------------

-- Nullable `ON DELETE SET NULL` columns: point dangling references at NULL,
-- which is exactly what the constraint would have done when the project was
-- deleted. No row is lost.
UPDATE plans SET project_id = NULL
 WHERE project_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = plans.project_id);

UPDATE tasks SET project_id = NULL
 WHERE project_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = tasks.project_id);

UPDATE custom_prompts SET project_id = NULL
 WHERE project_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = custom_prompts.project_id);

UPDATE custom_prompts SET user_id = NULL
 WHERE user_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = custom_prompts.user_id);

-- NOT NULL `ON DELETE CASCADE` columns: the row cannot be re-homed, so it goes.
--
-- Embeddings for doomed tasks are removed FIRST and explicitly. task_embeddings
-- has no live foreign key either, so deleting the tasks would otherwise strand
-- them as a fresh set of orphans -- and the constraint added in part 2 would
-- then fail to validate.
DELETE FROM task_embeddings te
 WHERE NOT EXISTS (SELECT 1 FROM tasks t WHERE t.id = te.task_id);

DELETE FROM task_embeddings te
 WHERE EXISTS (
   SELECT 1 FROM tasks t
    WHERE t.id = te.task_id
      AND NOT EXISTS (SELECT 1 FROM plans p WHERE p.id = t.plan_id)
 );

-- Cascades to task_tags and NULLs plan_output_stream.task_id through the foreign
-- keys those two already have live.
DELETE FROM tasks t
 WHERE NOT EXISTS (SELECT 1 FROM plans p WHERE p.id = t.plan_id);

DELETE FROM plan_embeddings pe
 WHERE NOT EXISTS (SELECT 1 FROM plans p WHERE p.id = pe.plan_id);

DELETE FROM plan_output_stream pos
 WHERE NOT EXISTS (SELECT 1 FROM plans p WHERE p.id = pos.plan_id);

DELETE FROM custom_prompt_embeddings cpe
 WHERE NOT EXISTS (SELECT 1 FROM custom_prompts cp WHERE cp.id = cpe.custom_prompt_id);

DELETE FROM documentation_embeddings de
 WHERE NOT EXISTS (SELECT 1 FROM documentation d WHERE d.id = de.documentation_id);

DELETE FROM subscriptions s
 WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = s.user_id);

DELETE FROM user_roles ur
 WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = ur.user_id);

DELETE FROM user_roles ur
 WHERE NOT EXISTS (SELECT 1 FROM roles r WHERE r.id = ur.role_id);

DELETE FROM role_permissions rp
 WHERE NOT EXISTS (SELECT 1 FROM roles r WHERE r.id = rp.role_id);

DELETE FROM role_permissions rp
 WHERE NOT EXISTS (SELECT 1 FROM permissions p WHERE p.id = rp.permission_id);

-- ---------------------------------------------------------------------------
-- Part 2 -- add the missing constraints, each matching the ON DELETE semantics
-- its declaring migration specified.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  spec RECORD;
  fk_name TEXT;
  restored INTEGER := 0;
BEGIN
  FOR spec IN
    SELECT *
      FROM (
        VALUES
          -- child table, child column, parent table, parent column, ON DELETE
          ('tasks',                    'plan_id',          'plans',          'id', 'CASCADE'),  -- 003
          ('tasks',                    'project_id',       'projects',       'id', 'SET NULL'), -- 025
          ('plan_embeddings',          'plan_id',          'plans',          'id', 'CASCADE'),  -- 004
          ('task_embeddings',          'task_id',          'tasks',          'id', 'CASCADE'),  -- 005
          ('plan_output_stream',       'plan_id',          'plans',          'id', 'CASCADE'),  -- 007
          ('documentation_embeddings', 'documentation_id', 'documentation',  'id', 'CASCADE'),  -- 020
          ('plans',                    'project_id',       'projects',       'id', 'SET NULL'), -- 025
          ('user_roles',               'user_id',          'users',          'id', 'CASCADE'),  -- 034
          ('user_roles',               'role_id',          'roles',          'id', 'CASCADE'),  -- 034
          ('role_permissions',         'role_id',          'roles',          'id', 'CASCADE'),  -- 034
          ('role_permissions',         'permission_id',    'permissions',    'id', 'CASCADE'),  -- 034
          ('subscriptions',            'user_id',          'users',          'id', 'CASCADE'),  -- 035
          ('custom_prompts',           'user_id',          'users',          'id', 'SET NULL'), -- 036
          ('custom_prompts',           'project_id',       'projects',       'id', 'SET NULL'), -- 036
          ('custom_prompt_embeddings', 'custom_prompt_id', 'custom_prompts', 'id', 'CASCADE')   -- 037
      ) AS t (child_table, child_column, parent_table, parent_column, on_delete)
  LOOP
    -- Skip when either table is absent (a partially migrated database).
    CONTINUE WHEN to_regclass(spec.child_table) IS NULL
                OR to_regclass(spec.parent_table) IS NULL;

    -- Skip when ANY single-column foreign key already covers this column,
    -- whatever it is named. Keyed on the column rather than the name so a fresh
    -- database -- where CREATE TABLE already produced `<table>_<column>_fkey` --
    -- is a clean no-op, as is a re-run of this migration.
    CONTINUE WHEN EXISTS (
      SELECT 1
        FROM pg_constraint con
        JOIN pg_attribute a
          ON a.attrelid = con.conrelid
         AND a.attnum = con.conkey[1]
       WHERE con.contype = 'f'
         AND con.conrelid = to_regclass(spec.child_table)
         AND cardinality(con.conkey) = 1
         AND a.attname = spec.child_column
    );

    fk_name := format('%s_%s_fkey', spec.child_table, spec.child_column);

    EXECUTE format(
      'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I (%I) ON DELETE %s NOT VALID',
      spec.child_table, fk_name, spec.child_column,
      spec.parent_table, spec.parent_column, spec.on_delete
    );

    EXECUTE format('ALTER TABLE %I VALIDATE CONSTRAINT %I', spec.child_table, fk_name);

    restored := restored + 1;
    RAISE NOTICE 'restored foreign key %', fk_name;
  END LOOP;

  RAISE NOTICE '097: % foreign key(s) restored', restored;
END
$$;
