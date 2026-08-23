-- Rename the OpenThrottle infra skill slug skill-sync → ot-skill-sync across
-- slug-keyed tables. Disk already lives at skills/ot-skill-sync; without this
-- migration, agent-asset ingest would insert a fresh ot-skill-sync row and set
-- orphaned_at on the tagged skill-sync row (migration 093), dropping the tags
-- seeded by migration 094.
--
-- Intentionally UPDATED (live references must resolve to the new slug):
--   - project_skills.slug (+ source_path, clear orphaned_at)
--   - tasks.skill_slug (lifecycle hooks that point at the skill)
--   - skill_availability_rules.slug_allow / slug_deny (array members)
--   - custom_prompts.title / file_path (ingest key for the SKILL.md; path-keyed
--     sibling of the slug rename — without it the prompt row would orphan)
--
-- Intentionally LEFT at the historical value skill-sync (telemetry / history):
--   - skill_usage_events.skill_name
--   - skill_usage_outcomes.skill_name
-- See docs/monorepo/skill-usage-telemetry-scope.md (annotated pre-rename rows).
--
-- Never edit migration 094. Idempotent: a second apply finds no skill-sync rows
-- and is a no-op. Collision on uq_project_skills_project_slug: keep the tagged
-- row (prefer skill-sync when both tagged or both empty), merge tags, delete
-- the duplicate, then rename any remaining skill-sync row.

-- ---------------------------------------------------------------------------
-- project_skills: resolve (project_id) collisions before the slug UPDATE
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  old_id UUID;
  new_id UUID;
  old_tags TEXT[];
  new_tags TEXT[];
  merged_tags TEXT[];
  keep_old BOOLEAN;
BEGIN
  FOR r IN
    SELECT project_id
    FROM project_skills
    WHERE slug IN ('skill-sync', 'ot-skill-sync')
    GROUP BY project_id
    HAVING bool_or(slug = 'skill-sync')
       AND bool_or(slug = 'ot-skill-sync')
  LOOP
    SELECT id, tags INTO old_id, old_tags
    FROM project_skills
    WHERE project_id = r.project_id AND slug = 'skill-sync';

    SELECT id, tags INTO new_id, new_tags
    FROM project_skills
    WHERE project_id = r.project_id AND slug = 'ot-skill-sync';

    -- Keep tagged row; tie-break prefer skill-sync (update-in-place path).
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
        source_path = replace(source_path, '/skill-sync/', '/ot-skill-sync/'),
        orphaned_at = NULL,
        updated_at = NOW()
      WHERE id = old_id;

      DELETE FROM project_skills WHERE id = new_id;
    ELSE
      DELETE FROM project_skills WHERE id = old_id;
    END IF;
  END LOOP;
END
$$;

UPDATE project_skills
SET
  slug = 'ot-skill-sync',
  source_path = replace(source_path, '/skill-sync/', '/ot-skill-sync/'),
  orphaned_at = NULL,
  updated_at = NOW()
WHERE slug = 'skill-sync';

-- ---------------------------------------------------------------------------
-- tasks.skill_slug — hook bodies that reference the skill by slug
-- ---------------------------------------------------------------------------
UPDATE tasks
SET skill_slug = 'ot-skill-sync'
WHERE skill_slug = 'skill-sync';

-- ---------------------------------------------------------------------------
-- skill_availability_rules — replace slug in allow/deny arrays and dedupe
-- ---------------------------------------------------------------------------
UPDATE skill_availability_rules
SET
  slug_allow = COALESCE(
    (
      SELECT ARRAY(
        SELECT DISTINCT s
        FROM unnest(array_replace(slug_allow, 'skill-sync', 'ot-skill-sync')) AS s
        ORDER BY s
      )
    ),
    '{}'::text[]
  ),
  updated_at = NOW()
WHERE 'skill-sync' = ANY (slug_allow);

UPDATE skill_availability_rules
SET
  slug_deny = COALESCE(
    (
      SELECT ARRAY(
        SELECT DISTINCT s
        FROM unnest(array_replace(slug_deny, 'skill-sync', 'ot-skill-sync')) AS s
        ORDER BY s
      )
    ),
    '{}'::text[]
  ),
  updated_at = NOW()
WHERE 'skill-sync' = ANY (slug_deny);

-- ---------------------------------------------------------------------------
-- custom_prompts — path/title keyed to the skill directory (ingest sibling)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  old_path TEXT := '.agents/skills/skill-sync/SKILL.md';
  new_path TEXT := '.agents/skills/ot-skill-sync/SKILL.md';
BEGIN
  -- Collision on unique (file_path, prompt_type): drop the old path row when the
  -- new path already exists for the same prompt_type.
  FOR r IN
    SELECT o.id AS old_id
    FROM custom_prompts o
    INNER JOIN custom_prompts n
      ON n.file_path = new_path
     AND n.prompt_type = o.prompt_type
     AND n.id <> o.id
    WHERE o.file_path = old_path
  LOOP
    DELETE FROM custom_prompts WHERE id = r.old_id;
  END LOOP;

  UPDATE custom_prompts
  SET
    title = CASE WHEN title = 'skill-sync' THEN 'ot-skill-sync' ELSE title END,
    file_path = replace(file_path, '/skill-sync/', '/ot-skill-sync/'),
    updated_at = NOW()
  WHERE file_path LIKE '%/skill-sync/%'
     OR title = 'skill-sync';
END
$$;
