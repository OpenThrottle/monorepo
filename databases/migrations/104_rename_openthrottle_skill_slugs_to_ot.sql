-- Rename the last three OpenThrottle skill slugs onto the ot-* prefix across
-- slug-keyed tables:
--
--   openthrottle-folders    -> ot-folders
--   openthrottle-generators -> ot-generators
--   openthrottle-stack      -> ot-stack
--
-- Disk already lives at skills/ot-folders, skills/ot-generators and
-- skills/ot-stack. Without this migration, agent-asset ingest would insert
-- fresh ot-* rows and set orphaned_at on the old rows (migration 093),
-- dropping the tags seeded by migration 094:
--
--   ot-folders     {openthrottle}
--   ot-generators  {nx,openthrottle}
--   ot-stack       {backend,database,frontend,openthrottle}
--
-- Same shape as migration 103 (skill-sync -> ot-skill-sync), generalized to a
-- pair list so the three renames share one code path.
--
-- Intentionally UPDATED (live references must resolve to the new slug):
--   - project_skills.slug (+ source_path, clear orphaned_at)
--   - tasks.skill_slug (lifecycle hooks that point at the skill)
--   - skill_availability_rules.slug_allow / slug_deny (array members)
--   - custom_prompts.title / file_path (ingest key for the SKILL.md; path-keyed
--     sibling of the slug rename — without it the prompt row would orphan)
--
-- Intentionally LEFT at the historical value (telemetry / history):
--   - skill_usage_events.skill_name
--   - skill_usage_outcomes.skill_name
-- Unlike the 103 rename these tables hold ZERO rows for the three old slugs, so
-- docs/monorepo/skill-usage-telemetry-scope.md needs no new annotation. The
-- exclusion is stated here so a later reader does not assume it was an
-- oversight.
--
-- Never edit migration 094. Idempotent: a second apply finds no openthrottle-*
-- rows and is a no-op. Collision on uq_project_skills_project_slug: keep the
-- tagged row (prefer the old slug when both tagged or both empty), merge tags,
-- delete the duplicate, then rename any remaining old row.

DO $$
DECLARE
  pair RECORD;
  r RECORD;
  old_id UUID;
  new_id UUID;
  old_tags TEXT[];
  new_tags TEXT[];
  merged_tags TEXT[];
  keep_old BOOLEAN;
  old_path TEXT;
  new_path TEXT;
BEGIN
  FOR pair IN
    SELECT *
    FROM (
      VALUES
        ('openthrottle-folders'::text, 'ot-folders'::text),
        ('openthrottle-generators', 'ot-generators'),
        ('openthrottle-stack', 'ot-stack')
    ) AS t (old_slug, new_slug)
  LOOP
    -- -----------------------------------------------------------------------
    -- project_skills: resolve (project_id) collisions before the slug UPDATE
    -- -----------------------------------------------------------------------
    FOR r IN
      SELECT project_id
      FROM project_skills
      WHERE slug IN (pair.old_slug, pair.new_slug)
      GROUP BY project_id
      HAVING bool_or(slug = pair.old_slug)
         AND bool_or(slug = pair.new_slug)
    LOOP
      SELECT id, tags INTO old_id, old_tags
      FROM project_skills
      WHERE project_id = r.project_id AND slug = pair.old_slug;

      SELECT id, tags INTO new_id, new_tags
      FROM project_skills
      WHERE project_id = r.project_id AND slug = pair.new_slug;

      -- Keep tagged row; tie-break prefer the old slug (update-in-place path).
      keep_old := NOT (
        (old_tags IS NULL OR old_tags = '{}'::text[])
        AND new_tags IS NOT NULL
        AND new_tags <> '{}'::text[]
      );

      IF keep_old THEN
        SELECT COALESCE(
          ARRAY(
            SELECT DISTINCT t
            FROM unnest(COALESCE(old_tags, '{}'::text[]) || COALESCE(new_tags, '{}'::text[])) AS t
            ORDER BY t
          ),
          '{}'::text[]
        )
        INTO merged_tags;

        UPDATE project_skills
        SET
          tags = merged_tags,
          source_path = replace(source_path, '/' || pair.old_slug || '/', '/' || pair.new_slug || '/'),
          orphaned_at = NULL,
          updated_at = NOW()
        WHERE id = old_id;

        DELETE FROM project_skills WHERE id = new_id;
      ELSE
        DELETE FROM project_skills WHERE id = old_id;
      END IF;
    END LOOP;

    UPDATE project_skills
    SET
      slug = pair.new_slug,
      source_path = replace(source_path, '/' || pair.old_slug || '/', '/' || pair.new_slug || '/'),
      orphaned_at = NULL,
      updated_at = NOW()
    WHERE slug = pair.old_slug;

    -- -----------------------------------------------------------------------
    -- tasks.skill_slug — hook bodies that reference the skill by slug
    -- -----------------------------------------------------------------------
    UPDATE tasks
    SET skill_slug = pair.new_slug
    WHERE skill_slug = pair.old_slug;

    -- -----------------------------------------------------------------------
    -- skill_availability_rules — replace slug in allow/deny arrays and dedupe
    -- -----------------------------------------------------------------------
    UPDATE skill_availability_rules
    SET
      slug_allow = COALESCE(
        (
          SELECT ARRAY(
            SELECT DISTINCT s
            FROM unnest(array_replace(slug_allow, pair.old_slug, pair.new_slug)) AS s
            ORDER BY s
          )
        ),
        '{}'::text[]
      ),
      updated_at = NOW()
    WHERE pair.old_slug = ANY (slug_allow);

    UPDATE skill_availability_rules
    SET
      slug_deny = COALESCE(
        (
          SELECT ARRAY(
            SELECT DISTINCT s
            FROM unnest(array_replace(slug_deny, pair.old_slug, pair.new_slug)) AS s
            ORDER BY s
          )
        ),
        '{}'::text[]
      ),
      updated_at = NOW()
    WHERE pair.old_slug = ANY (slug_deny);

    -- -----------------------------------------------------------------------
    -- custom_prompts — path/title keyed to the skill directory (ingest sibling)
    -- -----------------------------------------------------------------------
    old_path := '.agents/skills/' || pair.old_slug || '/SKILL.md';
    new_path := '.agents/skills/' || pair.new_slug || '/SKILL.md';

    -- Collision on unique (file_path, prompt_type): drop the old path row when
    -- the new path already exists for the same prompt_type.
    FOR r IN
      SELECT o.id AS dup_id
      FROM custom_prompts o
      INNER JOIN custom_prompts n
        ON n.file_path = new_path
       AND n.prompt_type = o.prompt_type
       AND n.id <> o.id
      WHERE o.file_path = old_path
    LOOP
      DELETE FROM custom_prompts WHERE id = r.dup_id;
    END LOOP;

    UPDATE custom_prompts
    SET
      title = CASE WHEN title = pair.old_slug THEN pair.new_slug ELSE title END,
      file_path = replace(file_path, '/' || pair.old_slug || '/', '/' || pair.new_slug || '/'),
      updated_at = NOW()
    WHERE file_path LIKE '%/' || pair.old_slug || '/%'
       OR title = pair.old_slug;
  END LOOP;
END
$$;
