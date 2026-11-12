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
-- What it gives openthrottle-cms to render:
--   layout `welcome` (ACTIVE) -> root Layout fragment -> Heading, Wysiwyg, Button (sort_order 0-2)
--   library `Sample Library` with one component (`SampleCallout`), attached to that layout.

BEGIN;

-- ---------------------------------------------------------------------------
-- Schemas: one ACTIVE version per core typename the layout uses
-- ---------------------------------------------------------------------------

INSERT INTO schemas (uuid, created_at, updated_at, json_schema, status, typename, version)
VALUES
  (
    '5eed0000-0000-4000-8000-000000000101',
    '2026-01-01T00:00:00Z',
    '2026-01-01T00:00:00Z',
    '{"type":"object","properties":{"className":{"type":"string"}}}'::jsonb,
    'ACTIVE',
    'Layout',
    '1.0.0'
  ),
  (
    '5eed0000-0000-4000-8000-000000000102',
    '2026-01-01T00:00:00Z',
    '2026-01-01T00:00:00Z',
    '{"type":"object","required":["copy","heading"],"properties":{"className":{"type":"string"},"copy":{"type":"string"},"heading":{"type":"string","enum":["h1","h2","h3","h4","h5","h6"]}}}'::jsonb,
    'ACTIVE',
    'Heading',
    '1.0.0'
  ),
  (
    '5eed0000-0000-4000-8000-000000000103',
    '2026-01-01T00:00:00Z',
    '2026-01-01T00:00:00Z',
    '{"type":"object","required":["html"],"properties":{"className":{"type":"string"},"html":{"type":"string"}}}'::jsonb,
    'ACTIVE',
    'Wysiwyg',
    '1.0.0'
  ),
  (
    '5eed0000-0000-4000-8000-000000000104',
    '2026-01-01T00:00:00Z',
    '2026-01-01T00:00:00Z',
    '{"type":"object","required":["cta"],"properties":{"className":{"type":"string"},"cta":{"type":"string"},"size":{"type":"string","enum":["sm","md","lg"]},"variant":{"type":"string"}}}'::jsonb,
    'ACTIVE',
    'Button',
    '1.0.0'
  )
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Fragments: a root Layout and three children
-- ---------------------------------------------------------------------------

INSERT INTO fragments (uuid, created_at, updated_at, name, properties, schema_uuid, typename)
VALUES
  (
    '5eed0000-0000-4000-8000-000000000201',
    '2026-01-01T00:00:00Z',
    '2026-01-01T00:00:00Z',
    'Welcome page root',
    '{}'::jsonb,
    '5eed0000-0000-4000-8000-000000000101',
    'Layout'
  ),
  (
    '5eed0000-0000-4000-8000-000000000202',
    '2026-01-01T00:00:00Z',
    '2026-01-01T00:00:00Z',
    'Welcome heading',
    '{"copy":"Welcome to the OpenThrottle CMS","heading":"h1"}'::jsonb,
    '5eed0000-0000-4000-8000-000000000102',
    'Heading'
  ),
  (
    '5eed0000-0000-4000-8000-000000000203',
    '2026-01-01T00:00:00Z',
    '2026-01-01T00:00:00Z',
    'Welcome body',
    '{"html":"<p>This page is local development seed content. Edit it, break it, re-seed it.</p>"}'::jsonb,
    '5eed0000-0000-4000-8000-000000000103',
    'Wysiwyg'
  ),
  (
    '5eed0000-0000-4000-8000-000000000204',
    '2026-01-01T00:00:00Z',
    '2026-01-01T00:00:00Z',
    'Welcome call to action',
    '{"cta":"Get started","size":"md","variant":"primary"}'::jsonb,
    '5eed0000-0000-4000-8000-000000000104',
    'Button'
  )
ON CONFLICT DO NOTHING;

INSERT INTO fragments_children (fragment_uuid, children_uuid, created_at, sort_order)
VALUES
  ('5eed0000-0000-4000-8000-000000000201', '5eed0000-0000-4000-8000-000000000202', '2026-01-01T00:00:00Z', 0),
  ('5eed0000-0000-4000-8000-000000000201', '5eed0000-0000-4000-8000-000000000203', '2026-01-01T00:00:00Z', 1),
  ('5eed0000-0000-4000-8000-000000000201', '5eed0000-0000-4000-8000-000000000204', '2026-01-01T00:00:00Z', 2)
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
