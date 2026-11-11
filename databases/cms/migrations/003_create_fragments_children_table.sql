-- OpenThrottle CMS: ordered parent/child edges between fragments.
-- Ported from RocketCMS (20240601061316_add_fragments_children_table.sql).
-- created_at is TIMESTAMP WITH TIME ZONE here; the source used TIMESTAMP
-- WITHOUT TIME ZONE, unlike every other table.

CREATE TABLE IF NOT EXISTS fragments_children (
    fragment_uuid UUID                     NOT NULL,
    children_uuid UUID                     NOT NULL,

    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    sort_order    SMALLINT                 NOT NULL DEFAULT 0,

    CONSTRAINT fragments_children_pkey PRIMARY KEY (fragment_uuid, children_uuid)
);

COMMENT ON TABLE fragments_children IS 'OpenThrottle CMS fragment tree: one row per (parent fragment, child fragment) edge. A child appears at most once under a given parent.';
COMMENT ON COLUMN fragments_children.fragment_uuid IS 'The parent fragment.';
COMMENT ON COLUMN fragments_children.children_uuid IS 'A child fragment of fragment_uuid.';
COMMENT ON COLUMN fragments_children.sort_order IS 'Position of the child among its siblings under fragment_uuid, ascending.';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fragments_children_fragment_uuid_fkey') THEN
    ALTER TABLE fragments_children ADD CONSTRAINT fragments_children_fragment_uuid_fkey
      FOREIGN KEY (fragment_uuid) REFERENCES fragments (uuid);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fragments_children_children_uuid_fkey') THEN
    ALTER TABLE fragments_children ADD CONSTRAINT fragments_children_children_uuid_fkey
      FOREIGN KEY (children_uuid) REFERENCES fragments (uuid);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_fragments_children_fragment_uuid ON fragments_children (fragment_uuid);
CREATE INDEX IF NOT EXISTS idx_fragments_children_children_uuid ON fragments_children (children_uuid);
