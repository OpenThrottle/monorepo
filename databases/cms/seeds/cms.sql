-- DEV-ONLY sample content for the `cms` database (migrations 001-010). NOT a migration: never
-- place this under databases/cms/migrations/ and never wire it into `database:migrate`, CI or a
-- deploy path. Applied on demand by `pnpm run database:seed:cms`
-- (scripts/openthrottle-database-seed-cms.ts), which refuses NODE_ENV=production and any
-- non-local Postgres host.
--
-- Everything here is synthetic: no profiles, no emails, no real people. It replaces the RocketCMS
-- seed.sql, which was a Supabase auth.* dump and was deliberately not imported.
--
-- Idempotent: every row has a FIXED uuid (and fixed timestamps), and every INSERT ends in a bare
-- ON CONFLICT DO NOTHING, so it also yields to the unique slug and join-table indexes. A re-run
-- changes nothing; an editor's local changes to a seeded row are left alone.
--
-- What it gives openthrottle-cms to render, every fragment on its generated ACTIVE schema
-- (synced by the seed script just before this file runs):
--   layout `welcome` (ACTIVE) -> root Layout -> Heading, Wysiwyg, Button, LayoutGrid (sort_order 0-3)
--   LayoutGrid -> three Cards (sort_order 0-2)
--   library `Sample Library` with one component (`SampleCallout`), attached to that layout.

BEGIN;

-- ---------------------------------------------------------------------------
-- Schemas: none here. The generated block schemas are synced first by
-- scripts/openthrottle-database-sync-cms-schemas.ts, and every fragment below is pinned to its
-- typename's ACTIVE one. Fail loudly rather than silently skip a fragment if one is missing.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  missing text;
BEGIN
  SELECT string_agg(t.typename, ', ' ORDER BY t.typename) INTO missing
  FROM (VALUES ('Button'), ('Card'), ('Heading'), ('Layout'), ('LayoutGrid'), ('Wysiwyg')) AS t(typename)
  WHERE NOT EXISTS (
    SELECT 1 FROM schemas s
    WHERE s.typename = t.typename AND s.status = 'ACTIVE' AND s.is_deleted IS NOT TRUE
  );

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'cms seed: no ACTIVE schema for %. Run: pnpm run database:sync:cms-schemas', missing;
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- Fragments: a root Layout with a heading, body, button and a LayoutGrid of three cards
-- ---------------------------------------------------------------------------

INSERT INTO fragments (uuid, created_at, updated_at, name, properties, schema_uuid, typename)
SELECT v.uuid::uuid, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', v.name, v.properties::jsonb, active.uuid, v.typename
FROM (
  VALUES
    ('5eed0000-0000-4000-8000-000000000201', 'Welcome page root', '{}', 'Layout'),
    ('5eed0000-0000-4000-8000-000000000202', 'Welcome heading', '{"copy":"Welcome to the OpenThrottle CMS","heading":"h1"}', 'Heading'),
    ('5eed0000-0000-4000-8000-000000000203', 'Welcome body', '{"html":"<p>This page is local development seed content. Edit it, break it, re-seed it.</p>"}', 'Wysiwyg'),
    ('5eed0000-0000-4000-8000-000000000204', 'Welcome call to action', '{"cta":"Get started","size":"md","variant":"primary"}', 'Button'),
    ('5eed0000-0000-4000-8000-000000000205', 'Welcome feature grid', '{}', 'LayoutGrid'),
    ('5eed0000-0000-4000-8000-000000000206', 'Feature: write', '{"copy":"Compose pages from blocks.","heading":"Write","icon":"Pencil"}', 'Card'),
    ('5eed0000-0000-4000-8000-000000000207', 'Feature: preview', '{"copy":"See the page as you edit it.","heading":"Preview","icon":"Sun"}', 'Card'),
    ('5eed0000-0000-4000-8000-000000000208', 'Feature: ship', '{"copy":"Publish when it reads right.","heading":"Ship","icon":"Rocket"}', 'Card')
) AS v(uuid, name, properties, typename)
CROSS JOIN LATERAL (
  SELECT s.uuid FROM schemas s
  WHERE s.typename = v.typename AND s.status = 'ACTIVE' AND s.is_deleted IS NOT TRUE
  ORDER BY s.created_at DESC, s.uuid DESC
  LIMIT 1
) AS active
ON CONFLICT DO NOTHING;

-- Databases seeded before the schema sync existed pinned these fragments to four hand-written
-- 1.0.0 schemas (uuids ...0101-...0104) that have no children property. Move them onto the
-- generated schemas once; afterwards nothing matches, so a re-run still changes nothing.
UPDATE fragments f
SET schema_uuid = (
  SELECT s.uuid FROM schemas s
  WHERE s.typename = f.typename AND s.status = 'ACTIVE' AND s.is_deleted IS NOT TRUE
  ORDER BY s.created_at DESC, s.uuid DESC
  LIMIT 1
)
WHERE f.uuid IN (
    '5eed0000-0000-4000-8000-000000000201',
    '5eed0000-0000-4000-8000-000000000202',
    '5eed0000-0000-4000-8000-000000000203',
    '5eed0000-0000-4000-8000-000000000204'
  )
  AND f.schema_uuid IN (
    '5eed0000-0000-4000-8000-000000000101',
    '5eed0000-0000-4000-8000-000000000102',
    '5eed0000-0000-4000-8000-000000000103',
    '5eed0000-0000-4000-8000-000000000104'
  );

INSERT INTO fragments_children (fragment_uuid, children_uuid, created_at, sort_order)
VALUES
  ('5eed0000-0000-4000-8000-000000000201', '5eed0000-0000-4000-8000-000000000202', '2026-01-01T00:00:00Z', 0),
  ('5eed0000-0000-4000-8000-000000000201', '5eed0000-0000-4000-8000-000000000203', '2026-01-01T00:00:00Z', 1),
  ('5eed0000-0000-4000-8000-000000000201', '5eed0000-0000-4000-8000-000000000204', '2026-01-01T00:00:00Z', 2),
  ('5eed0000-0000-4000-8000-000000000201', '5eed0000-0000-4000-8000-000000000205', '2026-01-01T00:00:00Z', 3),
  ('5eed0000-0000-4000-8000-000000000205', '5eed0000-0000-4000-8000-000000000206', '2026-01-01T00:00:00Z', 0),
  ('5eed0000-0000-4000-8000-000000000205', '5eed0000-0000-4000-8000-000000000207', '2026-01-01T00:00:00Z', 1),
  ('5eed0000-0000-4000-8000-000000000205', '5eed0000-0000-4000-8000-000000000208', '2026-01-01T00:00:00Z', 2)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Layout: the page, addressed by slug
-- ---------------------------------------------------------------------------

INSERT INTO layouts (uuid, created_at, updated_at, fragment_uuid, metadata, name, slug, status, tags)
VALUES
  (
    '5eed0000-0000-4000-8000-000000000301',
    '2026-01-01T00:00:00Z',
    '2026-01-01T00:00:00Z',
    '5eed0000-0000-4000-8000-000000000201',
    '{"description":"Sample page from the local development seed.","title":"Welcome"}'::jsonb,
    'Welcome',
    'welcome',
    'ACTIVE',
    '{sample}'
  )
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Library: one library, one component, attached to the layout
-- ---------------------------------------------------------------------------

INSERT INTO libraries (uuid, created_at, updated_at, description, name, status)
VALUES
  (
    '5eed0000-0000-4000-8000-000000000401',
    '2026-01-01T00:00:00Z',
    '2026-01-01T00:00:00Z',
    'Sample component library from the local development seed.',
    'Sample Library',
    'ACTIVE'
  )
ON CONFLICT DO NOTHING;

INSERT INTO library_components (uuid, created_at, updated_at, code, library_uuid, name, props_schema, status, typename)
VALUES
  (
    '5eed0000-0000-4000-8000-000000000501',
    '2026-01-01T00:00:00Z',
    '2026-01-01T00:00:00Z',
    'export const SampleCallout = (props) => { return <aside className="rounded border p-4">{props.copy}</aside>; };',
    '5eed0000-0000-4000-8000-000000000401',
    'Sample Callout',
    '{"type":"object","required":["copy"],"properties":{"copy":{"type":"string"}}}'::jsonb,
    'ACTIVE',
    'SampleCallout'
  )
ON CONFLICT DO NOTHING;

INSERT INTO layouts_libraries (uuid, created_at, layout_uuid, library_uuid)
VALUES
  (
    '5eed0000-0000-4000-8000-000000000601',
    '2026-01-01T00:00:00Z',
    '5eed0000-0000-4000-8000-000000000301',
    '5eed0000-0000-4000-8000-000000000401'
  )
ON CONFLICT DO NOTHING;

COMMIT;
