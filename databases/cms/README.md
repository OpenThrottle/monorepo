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
- **No imported seed.** The RocketCMS `seed.sql` is a Supabase `auth.*` dump, and it is not imported.
  A small synthetic one replaces it — see [Local seed data](#local-seed-data).

## Local seed data

`pnpm run database:seed:cms` loads [`seeds/cms.sql`](./seeds/cms.sql): a root `Layout` fragment
with four ordered children (`Heading`, `Wysiwyg`, `Button` and a `LayoutGrid` holding three `Card`s),
the `welcome` layout rooted at it, and one library (`Sample Library`) with one component, attached to
that layout. Every fragment is pinned to its typename's generated ACTIVE schema, so the root and the
grid are real containers in the editor. A database seeded before this moves the four original
fragments off the old hand-written `1.0.0` schemas once. It is synthetic — no profiles, no emails, no real people.

Before the sample rows it **syncs the generated block schemas**
([`scripts/openthrottle-database-sync-cms-schemas.ts`](../../scripts/openthrottle-database-sync-cms-schemas.ts)):
every `packages/<pkg>/src/data/schema-manifest.json` written by `cms-schemas:write` is upserted by
`(typename, version)` — version being the schema's content hash — and that version is left the one
ACTIVE schema per typename (older live versions go `DISABLED`; fragments pinned to them keep them).
A stale manifest, or a typename two packages both generate, fails the sync. Re-running it with
unchanged manifests touches no row. `pnpm run database:sync:cms-schemas` runs the sync alone; unlike
the sample content it has no local-host guard, because it is real content.

It is **not a migration** and is not reachable from `database:migrate`, `ensure-migrations` or any
deploy path. `./scripts/setup.sh` (primary checkout) and `worktree:db isolate` run it; the script refuses `NODE_ENV=production` and any Postgres host other than
`localhost`, `127.0.0.1`, `::1` or the compose service `postgres`. Every row has a fixed uuid and
every insert is `ON CONFLICT DO NOTHING`, so re-running changes nothing (and leaves your local
edits to seeded rows alone). It connects to the `cms` database the way the migration runner does,
so prefix `POSTGRES_PORT=<port>` for a worktree database, as with `database:migrate`.

CI keeps it honest: the `database-seeds` job ([`scripts/check-database-seeds.sh`](../../scripts/check-database-seeds.sh))
applies every migration to an empty Postgres, runs this seed and the blog seed twice, and fails if a
run errors, the second run changes any row, or `welcome` stops resolving by slug.

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

Every content table carries `uuid`, `created_at`, `updated_at` and a soft-delete `is_deleted`
(nullable; `NULL` reads as live). These are the `BaseUuidModel` columns of
`@openthrottle/nestjs-postgres`, which the content entities in `@openthrottle/nestjs-repositories-cms`
extend; the key and soft-delete shape stays as it is, and the library adapts to it (owner decision,
2026-11-12). The join tables `fragments_children` and `layouts_libraries` have no `is_deleted` and
stay plain entities. `updated_at` is maintained by the database (see the decision below).

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

## Decision: how `updated_at` is maintained

**A trigger, as in the `openthrottle` database** (migration `011`, OT plan `18a3b88f`). Every cms
table with an `updated_at` column (`fragments`, `layouts`, `libraries`, `library_components`,
`profiles`, `schemas`, `surveys`, `tags`) has a `BEFORE UPDATE` trigger calling the shared
`update_updated_at_column()` function, which sets it to `NOW()`.

- Why not writer-sets: TypeORM's `@UpdateDateColumn` already stamps it on every `save` and every
  `update` it builds, but raw SQL does not (the seed, ad-hoc psql fixes, the planned append-only
  schema sync), and nothing would catch a missed stamp. The trigger costs one function call per
  updated row and closes that gap. Keeping the same function name and trigger naming as the
  `openthrottle` database means one convention across both.
- The trigger always wins: an `UPDATE` that sets `updated_at` explicitly still gets `NOW()`.
  `fragments_children` and `layouts_libraries` have no `updated_at`; an edge edit stamps its
  parent fragment instead (the cms GraphQL edge mutations do).
- `created_at` stays a column default; nothing updates it.

## Decision: what identifies a CMS profile

**Profiles stand alone for now.** `profiles.uuid` is the CMS's own key. It is not an OpenThrottle
user id, because Postgres cannot declare a foreign key into another database, and the Supabase link
it replaced was exactly that kind of FK.

**Done (migration `012`, OT plan `18a3b88f`):** a profile is linked to an OpenThrottle user **by
value**: a nullable `openthrottle_user_id UUID` column with a unique index, written by the server
that holds both connections, and checked by the application rather than by the database. The
alternative, a `profiles` table in the `openthrottle` database, would put CMS data in the wrong
ledger.

- A profile is created the first time a user makes a cms write (`CmsWriteGuard` →
  `CmsProfilesService.resolveForUser`), restored if it was soft deleted, and safe under concurrent
  first writes (the unique index decides; the loser re-reads).
- `profiles.email` is NOT NULL but `users.email` is nullable, so a user without one gets
  `<user id>@openthrottle.invalid` (RFC 2606 reserved; it can never deliver).
- Service accounts write without a profile.
- **When an OpenThrottle user is deleted: a soft link, not an orphan sweep** (OT plan `12d714d9`).
  OpenThrottle only soft deletes users (`users.deleted_at`) and never reissues a user id, so the
  profile keeps its `openthrottle_user_id`: the content they edited stays attributable, and an
  account that is restored gets the same profile back. The host's `CMS_WRITE_AUTHORIZER`
  (openthrottle-server's `CmsWriteAuthorizerService`) refuses a writer whose user row is soft deleted
  or `disabled_at` is set, even while their JWT is unexpired, so a removed account can never create
  or restore a profile. A new account that reuses the email gets a new user id and therefore its
  own profile (`profiles.email` is not unique; lookups are by user id only). No cross-database
  sweep is needed while users are never hard deleted; a hard delete would warrant revisiting this.
- Every cms mutation needs the `cms:write` permission (admin only, `openthrottle` migration `159`);
  cms reads stay public.

## Decision: what a layout's available typenames are

**Every ACTIVE schema typename, except the layout root's `Layout`** (OT plan `4a977e20`, task 1).
`availableCmsTypenames(layoutUuid)` answers "what can an editor add to this layout?" from the
`schemas` table alone; `libraries` and `layouts_libraries` are not consulted.

RocketCMS answered it from `layouts_libraries` → `libraries` → `library_components.typename`,
because there a library component's `code` was what rendered a typename. Here it is not: the
renderer is the code registry (`CORE_COMPONENTS` in `@openthrottle/react-router-cms-core`), and the
`schemas` rows are synced from those same packages' manifests. An ACTIVE schema is therefore exactly
"a typename the renderer can draw and the server can validate", which is the question being asked.

- **Why not (b), the layout's libraries as a named grouping of typenames.** It makes availability
  depend on data that nothing renders from. A typename listed by a library but with no ACTIVE schema
  could be offered and then refused on create; a layout with no library attached (every layout
  `createCmsLayout` makes) would offer nothing. It only becomes the right answer once a library's
  components are what renders, which is the deferred DB-stored component code.
- **Why not (c), dropping `libraries` / `layouts_libraries`.** Their read and write surface shipped in
  plan `18a3b88f` (`cmsLibraries`, the library-component mutations), the seed uses them, and they are
  the natural home for DB-stored components if that is ever picked up. A migration to remove them buys
  nothing today. They stay as they are: stored, served, and not part of availability.
- **`Layout` is excluded** because it is the `is_system` root typename `createCmsLayout` uses; an
  editor never adds one as a child.
- **`layoutUuid` is still the argument.** The layout must exist and be live (`NOT_FOUND` otherwise),
  so the API keeps its shape if availability ever narrows per layout. Today every live layout gets
  the same list, sorted by typename.

## Decision: who sees unpublished layouts

**The public sees only ACTIVE layouts; a caller allowed to write cms content also sees DRAFT and
DISABLED ones** (OT plan `1ccc14dd`, option (a)). `layouts.status` defaults to `DRAFT` (migration
`004`), so before this every new layout was public by slug from the moment it was created.

- **One rule, applied by the server to every layout read.** `cmsLayout(slug)`, `cmsLayoutByUuid`
  and the `cmsLayouts` list stay `@Public()`, but each asks `CmsWriteAccessService` whether the
  caller may write (the same host `CMS_WRITE_AUTHORIZER` check `CmsWriteGuard` makes for mutations;
  openthrottle-server: `cms:write`). Yes: every status. No, or signed out: `status = ACTIVE` only,
  and an unpublished layout reads as `null`, exactly like an unknown slug. openthrottle-server's
  global guard soft-authenticates `@Public()` handlers, so a signed-in editor's token still arrives.
- **Why the list matters too.** `cmsLayouts` is public and listed every slug, drafts included, so
  hiding drafts behind an unguessable slug (option (b)) protected nothing.
- **Preview is the same URL.** `/render/:slug` (and the editor's layout pages) forward the visitor's
  sign-in, so an editor opening a draft's slug sees it rendered and everyone else gets the 404. A
  non-ACTIVE render is sent `Cache-Control: private, no-store`, so no shared cache can hand an
  editor's preview to the public.
- **Why not a separate `cmsLayoutPreview` / `cmsPublishedLayout` query (option (c)).** Two queries
  for one layout means every consumer picks the right one, and the editor surfaces (which read
  `cmsLayouts` and `cmsLayoutByUuid`) would need new queries too. One rule on the existing reads
  keeps the schema unchanged and makes the safe answer the default for anyone not signed in.
- **Not covered: fragment reads.** Fragments have no status of their own, and `cmsFragments` /
  `cmsFragment(uuid)` are still public, so the content of a draft layout's tree can still be read by
  browsing fragments. Closing that is follow-up plan `834541c7`.

## Entities

The TypeORM entities for these tables live in
[`@openthrottle/nestjs-repositories-cms`](../../packages/nestjs-repositories-cms/README.md), on a
named `cms` DataSource. A schema change here is two edits: the migration and its entity.

## Decision: where the CMS API lives

Recorded by OT plan `6a17d99b-8c04-41b6-a1e1-47d812bb7658`. Points 1 and 2 were already decided
elsewhere and are written down here, not reopened. Points 3 and 4 were decided by that plan.

### 1. Placement: openthrottle-server, through the package

The CMS API lives in **openthrottle-server**. The server imports `NestjsRepositoriesCmsModule` from
[`@openthrottle/nestjs-repositories-cms`](../../packages/nestjs-repositories-cms/README.md), and the
CMS GraphQL resolvers live in that package, not in the server's own `src/`. The owner made this call
in OT plan `18a3b88f-50fe-4944-97a3-71835d45e393` ("Why a server import, not the CMS app").

- [`openthrottle-cms`](../../applications/openthrottle-cms/README.md) is a React Router client. It
  reads the committed `applications/openthrottle-server/schema.gql` like every other consumer, and
  it has no database connection of its own.
- If a dedicated CMS server is ever split out, it imports the same module unchanged. Keeping the
  resolvers in the package is what keeps that move cheap.

### 2. Connection: the named `CMS_CONNECTION` DataSource

The module registers a TypeORM DataSource named `CMS_CONNECTION`. Its URL comes from
`getCmsPostgresUrl` in
[`packages/openthrottle-agentic-utils/src/utils/postgres.ts`](../../packages/openthrottle-agentic-utils/src/utils/postgres.ts),
which resolves in the same order as the `cms` entry in
[`databases/database-registry.ts`](../database-registry.ts):

1. `CMS_POSTGRES_URL`, when it is set.
2. Otherwise the primary's `POSTGRES_*` settings, with the database swapped for `CMS_POSTGRES_DB`
   (default `cms`).

`getCmsPostgresUrl` returns a result type, and the module throws when the result is a failure. A
server that imports the module but cannot resolve a URL fails at boot, rather than starting and
failing on the first CMS query.

### 3. Schema sync trigger: on server boot, in the package, plus an admin mutation

The sync that fills `schemas` from the block manifests (OT plan
`a608869b-407d-40a0-9dff-8d61fe578cf7`, task 5) runs in two places. Both are in
`@openthrottle/nestjs-repositories-cms`:

- An **`onApplicationBootstrap` hook** in the module. It runs once each time the server starts.
- An **admin-only `syncCmsSchemas` mutation**. It runs the same code on demand, and it is how you
  retry after a failed boot sync.

It is not a step in `monorepo:ensure-migrations`. That gate is a pre-boot `tsx` script that runs only
on the host `dev` path. In production, migrations run from the separate `Dockerfile.Migrations` image,
which copies only `databases/` and has no block packages. A script step would need two homes and a
copy of the manifests in the migrations image. The boot hook runs wherever the server runs (dev, a
worktree, the production image), and it uses the `CMS_CONNECTION` and entities the module already
has.

What the sync has to guarantee:

- **Append-only.** A `(typename, version)` missing from the table inserts one row. Nothing is updated
  or deleted, and fragments keep the `schema_uuid` they were created with.
- **Safe with more than one replica.** Today `(typename, version)` has only a plain index
  (`idx_schemas_typename_version`, migration 001), so two servers booting together could insert the
  same row twice. Task 5 adds a migration that makes the pair unique, and the sync inserts with
  `ON CONFLICT (typename, version) DO NOTHING`.
- **Never blocks the API.** A failed sync logs an error and the server keeps serving. Fragment writes
  against a typename with no row then fail on their own, and the rest of OpenThrottle stays up.

### 4. How the server reads the manifests: copied into the package's `dist/` at build time

The manifests are committed under `packages/react-router-cms-ui/src/data/` and
`packages/react-router-cms-core/src/data/` (`schema-manifest.json` plus `schema.<typename-kebab>.json`, written by
`cms-schemas:write`). The server reads them as **JSON files**, never through those packages'
source-first TypeScript entries.

**Decision:** the `build` target of `@openthrottle/nestjs-repositories-cms` copies both packages' generated files into
its own output, using the `@nx/js:tsc` `assets` option (the
[package generator template](../../tools/generators/src/generators/package/files/tools/package.json)
already uses it). The glob is `schema*.json`, which takes the manifest and every schema but not the
`mock.*.ts` files beside them:

```text
packages/react-router-cms-ui/src/data/schema*.json   → packages/nestjs-repositories-cms/dist/schemas/react-router-cms-ui/
packages/react-router-cms-core/src/data/schema*.json → packages/nestjs-repositories-cms/dist/schemas/react-router-cms-core/
```

The build's `inputs` are Nx's defaults plus both packages' `src/data/schema*.json`, so editing a
block schema invalidates the Nx cache and the copy cannot go stale.

**What ships today, and what does not yet (OT plan `ad97c557-95f8-4462-aa2c-8f7bcdf41307`):**

- **Shipped:** the copy and the cache inputs above. A build of the package leaves all 16 files
  (10 cms-ui schemas, 4 cms-core schemas, a manifest each) in `dist/schemas/`.
- **Not yet:** anything that reads them. The runtime half of this decision lives in draft PR #872
  (branch `openthrottle/cms-schema-sync`, plan `a608869b` task 5), which is unmerged. That includes
  `CmsSchemaSyncService` (the boot hook and `syncCmsSchemas` from [§ 3](#3-schema-sync-trigger-on-server-boot-in-the-package-plus-an-admin-mutation)),
  its lookup relative to its own compiled file (`new URL('…/schemas/', import.meta.url)`, never a
  repository-root path and never a resolve of either React package), and the boot-check coverage
  below. Until it lands, the only sync is the repository-tree script
  ([`scripts/openthrottle-database-sync-cms-schemas.ts`](../../scripts/openthrottle-database-sync-cms-schemas.ts)),
  so a production image has no way to fill `schemas`. #872 predates the move of these files into
  `src/data/`, and it must take this build target as it is now rather than its own `schemas/` globs.

Why this survives the production image: `Dockerfile.NestJS` builds every package, then ships only the
`pnpm --filter openthrottle-server --prod deploy` tree. The server resolves
`@openthrottle/nestjs-repositories-cms` through its `exports`, which point at `dist/`. Once the
server imports the module (plan `18a3b88f`), that `dist/` must be in the image or the server cannot
boot, so the manifests ride inside a directory the image already has to ship.
Once the sync service lands,
[`boot-check.sh`](../../.github/actions/docker-build-push/boot-check.sh) (which boots that image
with a read-only root before it is pushed) will show a missing folder as a logged sync error.

In dev, `openthrottle-server:dev` runs `^build` first, so the copy exists before the server starts.
After `cms-schemas:write`, rebuild the package (or restart `dev`); with the sync service, then run
`syncCmsSchemas`.

Rejected options:

- **Resolve the React packages at runtime** (`require.resolve` of their `package.json`). The server
  would need both packages as **production** dependencies. `pnpm deploy` would then put their whole
  React tree (react, react-router, the shadcn package, lucide, jotai, react-dnd) into the server
  image, all to read a few JSON files.
- **An `exports` subpath `./schemas/*`** on the React packages. Same dependency problem, and it adds
  a server-facing entry to client packages whose entries deliberately point at `src`.

## Not here yet

Reads and writes are served: `openthrottle-server` imports `NestjsRepositoriesCmsModule`, whose
`CmsGraphqlModule` answers `cmsLayout` / `cmsLayoutByUuid` (the fragment tree in one recursive query,
cut at depth 10, cycles not followed), `cmsLayouts`, `cmsFragments`, `cmsLibraries`, `cmsSchemas`, `cmsSchema` and
`cmsSchemaByTypename`. Reads are public; writes (fragments and their edges, layouts, library
components) need `cms:write`. What is left:

- **Filling `schemas`** (OT plan `a608869b-407d-40a0-9dff-8d61fe578cf7`, task 5), as decided in
  [§ 3](#3-schema-sync-trigger-on-server-boot-in-the-package-plus-an-admin-mutation) and
  [§ 4](#4-how-the-server-reads-the-manifests-copied-into-the-packages-dist-at-build-time).
