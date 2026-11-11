# `cms` database

The OpenThrottle CMS schema, for the [`openthrottle-cms`](../../applications/openthrottle-cms/README.md)
application. It lives on the same Postgres server as the `openthrottle` database, as a separate
database with its own [`migrations/`](./migrations/) and its own `schema_migrations` ledger. How
several databases share one runner is in [`databases/AGENTS.md`](../AGENTS.md).

| Setting           | Value                                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------------------- |
| Database name     | `CMS_POSTGRES_DB` (default `cms`)                                                                          |
| Connection        | The primary's `POSTGRES_*` with the database swapped, or `CMS_POSTGRES_URL` if set                         |
| Created by        | Every migration entrypoint, on first run (`pnpm run database:migrate`, the dev gate, the migrations image) |
| Migrate just this | `pnpm run database:migrate -- --database cms`                                                              |
| Back up just this | `pnpm run database:backup -- --database cms` → `databases/cms/backups/cms-*.zip`                           |

## Origin

The ten starting migrations are ported from RocketCMS
(`visormatt/monorepo`, `databases/rocketcms/supabase/migrations/`), in the same order. The schema is
the same, with these changes:

- **No Supabase dependencies.** `profiles.uuid REFERENCES auth.users (id)` is gone, because there is
  no `auth` schema here. `tablespace pg_default` is dropped too.
- **Idempotent DDL** per [`ot-postgres`](../../skills/ot-postgres/SKILL.md): guarded enum types,
  `IF NOT EXISTS` tables and indexes, and foreign keys added in their own `pg_constraint`-guarded
  statement, never inline.
- **Timestamps.** `DEFAULT (now() at time zone 'utc')` on a `timestamptz` column stores the UTC
  wall-clock reinterpreted in the session time zone. It is `DEFAULT now()` here.
  `fragments_children.created_at` is `timestamptz`, like every other table.
- **Constraint names** follow Postgres's defaults (`<table>_pkey`, `<table>_<column>_fkey`,
  `<table>_<column>_key`). The source gave the `layouts` foreign key the same name as its unique
  index.
- **Comments** on every table and every non-obvious column.
- **No seed.** The RocketCMS `seed.sql` is a Supabase `auth.*` dump, and it is not imported.

## Tables

| Table                | Purpose                                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------- |
| `schemas`            | Versioned JSON Schema per `(typename, version)`, validating fragment properties           |
| `fragments`          | A named, typed piece of content; `properties` conform to its schema                       |
| `fragments_children` | Ordered parent → child edges that make fragments a tree                                   |
| `layouts`            | A publishable page addressed by `slug`, rooted at one fragment                            |
| `libraries`          | A named set of renderable components                                                      |
| `library_components` | The component that renders one `typename` within a library: its `code` and `props_schema` |
| `layouts_libraries`  | Which libraries a layout renders with                                                     |
| `profiles`           | Editor display details                                                                    |
| `surveys`            | A named survey whose definition is in `data`                                              |
| `tags`               | A tag vocabulary, not yet referenced by other tables                                      |

Every content table carries `uuid`, `created_at`, `updated_at` and a soft-delete `is_deleted`.
Nothing maintains `updated_at` yet: there is no trigger, so the writer sets it.

```mermaid
erDiagram
  schemas ||--o{ fragments : "schema_uuid (RESTRICT)"
  fragments ||--o{ fragments_children : "fragment_uuid (parent)"
  fragments ||--o{ fragments_children : "children_uuid (child)"
  fragments ||--|| layouts : "fragment_uuid (root, unique)"
  libraries ||--o{ library_components : "library_uuid (RESTRICT)"
  layouts ||--o{ layouts_libraries : "layout_uuid (CASCADE)"
  libraries ||--o{ layouts_libraries : "library_uuid (CASCADE)"
```

`typename` ties the content side to the component side by value: `schemas.typename`,
`fragments.typename` and `library_components.typename` name the same content type, and no foreign
key enforces that.

## Decision: what identifies a CMS profile

**Profiles stand alone for now.** `profiles.uuid` is the CMS's own key. It is not an OpenThrottle
user id, because Postgres cannot declare a foreign key into another database, and the Supabase link
it replaced was exactly that kind of FK.

When the CMS gets authentication, the plan is to link a profile to an OpenThrottle user **by value**:
a nullable `openthrottle_user_id UUID` column with a unique index, written by the server that holds
both connections, and checked by the application rather than by the database. The alternative, a
`profiles` table in the `openthrottle` database, would put CMS data in the wrong ledger. That work is
a follow-up OT plan, not part of this schema.

## Not here yet

- TypeORM entities, a NestJS module and GraphQL for these tables. Nothing in the server reads them
  yet.
- Seed data for local development.
