-- One-shot: copy the retired skill-tag-overlays.json tag lists onto matching
-- project_skills rows whose tags are still empty, so curated classification is
-- not lost when that file is deleted. Idempotent: non-empty tags (already
-- ingested or edited in product) are left alone. Empty overlay entries omitted.

UPDATE project_skills SET tags = ARRAY['commit','openthrottle','planning']::text[] WHERE slug = 'agents-ralph' AND tags = '{}'::text[];
UPDATE project_skills SET tags = ARRAY['docs']::text[] WHERE slug = 'create-readme' AND tags = '{}'::text[];
UPDATE project_skills SET tags = ARRAY['frontend','ui']::text[] WHERE slug = 'frontend-design' AND tags = '{}'::text[];
UPDATE project_skills SET tags = ARRAY['git','github']::text[] WHERE slug = 'github-branch' AND tags = '{}'::text[];
UPDATE project_skills SET tags = ARRAY['commit','git','github']::text[] WHERE slug = 'github-commit' AND tags = '{}'::text[];
UPDATE project_skills SET tags = ARRAY['github']::text[] WHERE slug = 'github-create-issue' AND tags = '{}'::text[];
UPDATE project_skills SET tags = ARRAY['github']::text[] WHERE slug = 'github-my-pull-requests' AND tags = '{}'::text[];
UPDATE project_skills SET tags = ARRAY['git','github']::text[] WHERE slug = 'github-pull-request' AND tags = '{}'::text[];
UPDATE project_skills SET tags = ARRAY['commit','git','github']::text[] WHERE slug = 'github-squash' AND tags = '{}'::text[];
UPDATE project_skills SET tags = ARRAY['git','pr-review']::text[] WHERE slug = 'github-summarize' AND tags = '{}'::text[];
UPDATE project_skills SET tags = ARRAY['git']::text[] WHERE slug = 'github-untracked' AND tags = '{}'::text[];
UPDATE project_skills SET tags = ARRAY['git']::text[] WHERE slug = 'github-worktree' AND tags = '{}'::text[];
UPDATE project_skills SET tags = ARRAY['planning']::text[] WHERE slug = 'grill-me' AND tags = '{}'::text[];
UPDATE project_skills SET tags = ARRAY['planning']::text[] WHERE slug = 'grill-with-docs' AND tags = '{}'::text[];
UPDATE project_skills SET tags = ARRAY['planning']::text[] WHERE slug = 'grilling' AND tags = '{}'::text[];
UPDATE project_skills SET tags = ARRAY['docs']::text[] WHERE slug = 'handoff' AND tags = '{}'::text[];
UPDATE project_skills SET tags = ARRAY['planning']::text[] WHERE slug = 'improve' AND tags = '{}'::text[];
UPDATE project_skills SET tags = ARRAY['ci','nx']::text[] WHERE slug = 'monitor-ci' AND tags = '{}'::text[];
UPDATE project_skills SET tags = ARRAY['nx']::text[] WHERE slug = 'nx-generate' AND tags = '{}'::text[];
UPDATE project_skills SET tags = ARRAY['nx']::text[] WHERE slug = 'nx-import' AND tags = '{}'::text[];
UPDATE project_skills SET tags = ARRAY['nx']::text[] WHERE slug = 'nx-plugins' AND tags = '{}'::text[];
UPDATE project_skills SET tags = ARRAY['nx']::text[] WHERE slug = 'nx-run-tasks' AND tags = '{}'::text[];
UPDATE project_skills SET tags = ARRAY['nx']::text[] WHERE slug = 'nx-workspace' AND tags = '{}'::text[];
UPDATE project_skills SET tags = ARRAY['openthrottle']::text[] WHERE slug = 'openthrottle-folders' AND tags = '{}'::text[];
UPDATE project_skills SET tags = ARRAY['nx','openthrottle']::text[] WHERE slug = 'openthrottle-generators' AND tags = '{}'::text[];
UPDATE project_skills SET tags = ARRAY['backend','database','frontend','openthrottle']::text[] WHERE slug = 'openthrottle-stack' AND tags = '{}'::text[];
UPDATE project_skills SET tags = ARRAY['openthrottle']::text[] WHERE slug = 'ot-ask' AND tags = '{}'::text[];
UPDATE project_skills SET tags = ARRAY['openthrottle','planning']::text[] WHERE slug = 'ot-create-plan' AND tags = '{}'::text[];
UPDATE project_skills SET tags = ARRAY['openthrottle']::text[] WHERE slug = 'ot-edit-task' AND tags = '{}'::text[];
UPDATE project_skills SET tags = ARRAY['openthrottle']::text[] WHERE slug = 'ot-list-by-status' AND tags = '{}'::text[];
UPDATE project_skills SET tags = ARRAY['openthrottle']::text[] WHERE slug = 'ot-onboarding' AND tags = '{}'::text[];
UPDATE project_skills SET tags = ARRAY['openthrottle']::text[] WHERE slug = 'ot-plan-loop' AND tags = '{}'::text[];
UPDATE project_skills SET tags = ARRAY['openthrottle']::text[] WHERE slug = 'ot-plans' AND tags = '{}'::text[];
UPDATE project_skills SET tags = ARRAY['database','openthrottle']::text[] WHERE slug = 'ot-postgres' AND tags = '{}'::text[];
UPDATE project_skills SET tags = ARRAY['openthrottle']::text[] WHERE slug = 'skill-sync' AND tags = '{}'::text[];
UPDATE project_skills SET tags = ARRAY['docs']::text[] WHERE slug = 'teach' AND tags = '{}'::text[];
UPDATE project_skills SET tags = ARRAY['docs']::text[] WHERE slug = 'writing-great-skills' AND tags = '{}'::text[];
