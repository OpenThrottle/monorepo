# OpenThrottle database (Cortex)

Postgres database for OpenThrottle (OT) plans ingestion with pgvector for semantic search. Used to store plan JSON and optional output Markdown from the `plans/` directory. _Cortex_ is the internal/technical name for this backend.

## Setup

1. **Start the cortex Postgres container**

   From the repo root, using env from `.env.default` (or copy to `.env`). To verify OpenThrottle (OT) and the MCP are reachable, use the **mcp-developer `health` tool** — see `packages/openthrottle/mcp-developer/README.md` § **Is OT running?**

   ```bash
   docker compose -f docker-compose-databases.yml up -d cortex
   ```

2. **Environment variables**

   Set in `.env` or export before running scripts (see `.env.default` for defaults):

   | Variable                   | Purpose           | Example           |
   | -------------------------- | ----------------- | ----------------- |
   | `CORTEX_POSTGRES_HOST`     | Postgres host     | `localhost`       |
   | `CORTEX_POSTGRES_PORT`     | Postgres port     | `5556`            |
   | `CORTEX_POSTGRES_DB`       | Database name     | `cortex`          |
   | `CORTEX_POSTGRES_USER`     | Database user     | `cortex_user`     |
   | `CORTEX_POSTGRES_PASSWORD` | Database password | `cortex_password` |

   Optional: `CORTEX_POSTGRES_URL` — full connection string (e.g. `postgresql://user:pass@host:port/db`). If set, openthrottle-server and scripts (e.g. cortex:import) can use it directly; otherwise they build from the five vars above. The **mcp-developer** MCP talks to the OpenThrottle backend via GraphQL only and does not connect to Postgres directly.

3. **Run migrations**

   Creates tables and indexes (run once after first start, or after schema changes):

   ```bash
   pnpm run cortex:migrate
   ```

4. **Reset the database (optional, before a fresh ingest)**

   Truncates all cortex tables so a re-run of ingest does not create duplicate plans. Use when switching from test data to real data or when re-ingesting after changing source files:

   ```bash
   pnpm run cortex:reset
   ```

5. **Ingest plans from the filesystem**

   Reads plan JSON from **all non-template subdirectories** under `plans/` (root, `completed`, `ideas`, and any other directory except `templates`) and inserts into `plans`, `tasks`, and `plan_output_stream`. For each plan file, the script looks for a same-named `*-output.md` and uses it for plan embeddings and, when non-empty, inserts it as one chunk into `plan_output_stream`. With `OPENAI_API_KEY` set, also generates embeddings and fills `plan_embeddings` and `task_embeddings`:

   ```bash
   pnpm run cortex:import
   ```

   The script is read-only for the filesystem; it does not delete or modify plan files.

6. **Ingest docs/ and NX project READMEs into documentation tables (optional)**

   Reads all `.md` files under `docs/` and each NX project's `README.md` (from the NX project graph) and upserts into `documentation` and `documentation_embeddings`. Idempotent per (repo, sha, path). Docs use paths like `docs/foo.md`; project READMEs use `projects/<project-root>/README.md` (e.g. `projects/applications/cortex/README.md`). With `OPENAI_API_KEY` set, generates embeddings. Optional env: `DOCS_REPO`, `DOCS_SHA`, `DOCS_AUTHORS` (comma-separated), `DOCS_MESSAGE`, `DOCS_PR_NUMBER` for source metadata (e.g. from docs-watch workflow):

   ```bash
   pnpm run cortex:import-docs
   ```

Plan JSON must have a `metadata` object (with `author` (GitHub handle), `category`, `title`) and a `tasks` array; files with other shapes (e.g. a bare array of task objects) are skipped and reported as errors.

## Schema

- **plans** – Plan metadata: `id`, `title`, `author`, `category`, `status`, `description`, `summary` (optional; PRD summarization: next actions, usage guides, wrap-up notes), `assignee` (optional; see [Assignee rule](#assignee-rule) below), `project_id` (optional, FK to projects; nullable), `created_at`, `updated_at`. In the Cortex API, `projectId` is optional on create/update and in list filters; `projectRelation` is null when `projectId` is unset.
- **projects** – NX project reference for scoping plans/tasks: `id`, `name`, `nx_project_name` (TEXT; unique when not null per migration 032), `description`, `created_at`, `updated_at`. Only **NX applications** are kept; see [Projects collection (applications only)](#projects-collection-applications-only).
- **tasks** – Tasks for each plan: `id`, `plan_id` (FK), `title`, `description`, `category`, `status`, `requirements` (JSONB), `summary` (optional; per-task wrap-up: actions, usage notes, or why blocked), `assignee` (optional; see [Assignee rule](#assignee-rule) below), `created_at`, `updated_at`.
- **plan_embeddings** – Vector embeddings for plan content: `id`, `plan_id` (FK), `content`, `embedding` (vector 1536), `metadata` (JSONB), `created_at`.
- **task_embeddings** – Vector embeddings for task content: `id`, `task_id` (FK), `content`, `embedding` (vector 1536), `metadata` (JSONB), `created_at`.
- **commit_links** – Git commit linkage to plans/tasks: `id`, `plan_id` (FK), `task_id` (FK, nullable), `repo`, `sha`, `message`, `created_at`. One row per (plan, task, repo, sha); `task_id` null = plan-level link.
- **plan_output_stream** – Streaming output (e.g. agent iteration log) per plan: `id`, `plan_id` (FK), `iteration` (nullable), `content`, `created_at`. Chunks appended in order; exposed via MCP `append_plan_output` and `get_plan_output`.
- **notes** – Quick unstructured thoughts: `id`, `content`, `author` (optional, e.g. GitHub username), `created_at`, `updated_at`. Foundation for notes route and planning workflow (e.g. create plan from note); exposed via MCP `create_note`, `get_note`, `list_notes`, `update_note`, `delete_note`.
- **documentation** – Source-of-truth per doc file landed on main (from `docs/` and NX project READMEs): `id`, `path` (TEXT; path under repo, e.g. `docs/foo.md` or `projects/<project-root>/README.md`), `content` (TEXT; parsed full text or summary for display), `repo` (TEXT), `sha` (TEXT; squash commit SHA), `pr_number` (INTEGER, nullable), `authors` (JSONB; e.g. array of GitHub usernames or `[{ "login", "email" }]`), `message` (TEXT; commit message), `created_at`. One row per (repo, sha, path); unique on (repo, sha, path) for idempotent upsert/replace-by-sha.
- **documentation_embeddings** – Vector embeddings for doc chunks (semantic search): `id`, `documentation_id` (FK to documentation), `content` (TEXT; chunk text), `embedding` (vector 1536), `metadata` (JSONB), `created_at`. Same pattern as plan_embeddings / task_embeddings; HNSW index on embedding, GIN on metadata.
- **doc_ingestion_state** – Prior state for diff-based doc ingestion (BullMQ job): `scope` (TEXT), `path` (TEXT), `content_hash` (TEXT; e.g. SHA-256), `updated_at` (TIMESTAMPTZ). One row per (scope, path); primary key (scope, path). Used to determine to-add / to-update / to-remove when re-ingesting markdown. See `docs/openthrottle/doc-ingestion-job-spec.md` and migration `030_create_doc_ingestion_state_table.sql`.
- **users** – User accounts for auth and assignment: `id`, `created_at`, `updated_at`, `email` (TEXT, nullable; unique when set for login), `github_username` (TEXT NOT NULL), `password_hash` (TEXT, nullable; bcrypt for OpenThrottle local auth). See migrations `026_create_users_table.sql`, `031_add_users_password_hash_and_email_unique.sql`. Optional: table can be dropped and recreated with a stricter schema (e.g. email NOT NULL for new auth users); see migration 031 comments.
- **permissions** – RBAC permission definitions: `id`, `name` (TEXT, unique), `description` (TEXT, nullable), `created_at`. Seeded with `settings:read`, `settings:write`, `users:read`, `users:write`. See migration `034_create_roles_and_permissions_tables.sql`.
- **roles** – RBAC roles: `id`, `name` (TEXT, unique), `description` (TEXT, nullable), `created_at`, `updated_at`. Seeded with `admin`, `user`, `viewer`. See migration 034.
- **role_permissions** – Join table role_id ↔ permission_id (many-to-many). See migration 034.
- **user_roles** – Join table user_id ↔ role_id (many-to-many). See migration 034.

Indexes include HNSW vector indexes on embedding columns for similarity search.

### Indexes

Indexes are created by migrations in `databases/cortex/migrations/`. Main tables and their indexes:

- **plans** – `idx_plans_status`, `idx_plans_category`, `idx_plans_author`, `idx_plans_created_at`, `idx_plans_assignee` (partial), `idx_plans_updated_at`, `idx_plans_status_created_at`, `idx_plans_status_updated_at`, `idx_plans_title_trgm` (GIN, pg_trgm for ILIKE). See `002_create_plans_table.sql`, `012_add_assignee_to_plans_and_tasks.sql`, `017_add_plans_list_sort_indexes.sql`, `018_plans_title_trgm.sql`.
- **tasks** – `idx_tasks_plan_id`, `idx_tasks_status`, `idx_tasks_category`, `idx_tasks_created_at`, `idx_tasks_requirements` (GIN), `idx_tasks_assignee` (partial). See `003_create_tasks_table.sql`, `012_add_assignee_to_plans_and_tasks.sql`.
- **plan_embeddings** – `idx_plan_embeddings_plan_id`, `idx_plan_embeddings_vector` (HNSW cosine), `idx_plan_embeddings_metadata` (GIN). See `004_create_plan_embeddings_table.sql`.
- **task_embeddings** – `idx_task_embeddings_task_id`, `idx_task_embeddings_vector` (HNSW cosine), `idx_task_embeddings_metadata` (GIN). See `005_create_task_embeddings_table.sql`.
- **commit_links** – `idx_commit_links_plan_id`, `idx_commit_links_task_id` (partial), `idx_commit_links_repo_sha`, unique on (plan_id, COALESCE(task_id, zero-uuid), repo, sha). See `006_create_commit_links_table.sql`.
- **projects** – `idx_projects_nx_project_name`, `idx_projects_nx_project_name_unique` (unique partial WHERE nx_project_name IS NOT NULL), `idx_projects_created_at`. See `024_create_projects_table.sql`, `032_projects_unique_nx_project_name.sql`.
- **plan_output_stream** – `idx_plan_output_stream_plan_id`, `idx_plan_output_stream_created_at` (plan_id, created_at). See `007_create_plan_output_stream_table.sql`.
- **notes** – `idx_notes_author`, `idx_notes_created_at`. See `009_create_notes_table.sql`.
- **documentation** – Unique on (repo, sha, path); indexes on path, repo, sha, created_at for filtering and ingest. See migration `019_create_documentation_table.sql` (or equivalent).
- **documentation_embeddings** – `idx_documentation_embeddings_documentation_id`, `idx_documentation_embeddings_vector` (HNSW cosine), `idx_documentation_embeddings_metadata` (GIN). See migration `020_create_documentation_embeddings_table.sql` (or equivalent).
- **doc_ingestion_state** – Primary key (scope, path); `idx_doc_ingestion_state_scope`, `idx_doc_ingestion_state_updated_at` (scope, updated_at DESC). See migration `030_create_doc_ingestion_state_table.sql`.
- **users** – `idx_users_github_username` (unique), `idx_users_created_at`, `idx_users_email_unique` (unique on email WHERE email IS NOT NULL for login). See migrations `026_create_users_table.sql`, `031_add_users_password_hash_and_email_unique.sql`.

**When to add new indexes:** Add a new migration when you introduce a **new filter or sort column** used by mcp-developer (via GraphQL), openthrottle-server, or the Cortex app (e.g. a new WHERE or ORDER BY), or a **new query pattern** that would benefit from a composite or partial index. Prefer composite indexes for common filter+sort combinations (e.g. status + created_at). For substring/ILIKE search on text, consider `pg_trgm` and a GIN index (see `018_plans_title_trgm.sql`). Audit notes: `databases/cortex/INDEX_AUDIT.md`.

### Embedding dimension strategy (OpenAI and Ollama)

Embedding tables (`plan_embeddings`, `task_embeddings`, `documentation_embeddings`) use **vector(1536)**. The default flow uses **OpenAI** (e.g. `text-embedding-3-small`), which outputs 1536 dimensions. This flow is unchanged and remains the default when `OPENAI_API_KEY` is set and Ollama env is not.

**Ollama (optional, additive):** When `OLLAMA_BASE_URL` or `OLLAMA_EMBEDDING_MODEL` is set, cortex:import and openthrottle-server can use **Ollama** for local embeddings. When neither is set, the existing OpenAI flow (e.g. `OPENAI_API_KEY`) is used. Env: `OLLAMA_BASE_URL` (default `http://localhost:11434`), `OLLAMA_EMBEDDING_MODEL` (e.g. `nomic-embed-text`). See root `.env.default` and `scripts/ollama.sh`. **When using Caddy** (tools/caddy), set `OLLAMA_BASE_URL` to the Caddy-proxied URL (e.g. `https://ollama.local` or `https://localhost/ollama`) so cortex:import and other consumers use the same endpoint. For HTTPS with Caddy's local certs, see `docs/monorepo/Ollama.md` and tools/caddy/README.md (TLS/trust store). Ollama models (e.g. `nomic-embed-text`, `mxbai-embed-large`) may output a different dimension. Strategy:

- **Option A — Same dimension (recommended for simplicity):** Use an Ollama model that outputs **1536** dimensions so the existing schema and migrations stay as-is. No migration; same tables and indexes. Re-ingest with Ollama when switching; no mixed-dimension storage. **Cortex ingest and openthrottle-server only insert embeddings when the vector length is 1536;** if the chosen Ollama model returns a different dimension, embeddings are skipped (no error). Known Ollama embedding model dimensions: `nomic-embed-text` 768, `mxbai-embed-large` 1024, `all-minilm` 384. As of the current Ollama library, none of these output 1536; for Option A with Cortex, use **OpenAI** (`OPENAI_API_KEY`) for embeddings, or use an Ollama model that outputs 1536 when one becomes available.
- **Option B — Different dimension (future):** If we support Ollama models with a different dimension, add an **optional** path only: e.g. configurable dimension from env, or a separate table/column for Ollama-backed embeddings, **without** altering existing `vector(1536)` columns or current OpenAI flow. Document re-ingest and any new migrations if this path is added.

Do **not** change existing `vector(1536)` columns or remove the OpenAI code path. Additive only.

### Commit links (Option A workflow)

We use **Option A:** link only the **squash commit after a PR is merged**. The repo keeps 1 PR = 1 commit on main (squash-and-merge); Cortex stores that single SHA in `commit_links` so "what landed" matches the repo.

- **When to call `link_commit`:** Only **after** a PR is merged. Use the **squash commit SHA** (the one that appears on the default branch), not pre-merge commits from the branch. Do **not** link commits during the Ralph loop or while the PR is open.
- **How activity tools use it:** `get_activity_by_date` and `get_last_activity` read from `commit_links`. Because we only store the squash SHA, activity reflects **landed work only** (commits that exist on main). Pre-merge branch history is not in Cortex.
- **Day-to-day workflow:**
  - **Commit as you complete tasks:** During Ralph (or any plan execution), commit and push after each task or logical chunk. Use conventional commits (e.g. `feat(cortex): document commit workflow`). In the commit body or footer, include `Plan-Id: <uuid>` and `Task-Id: <uuid>` for traceability. Do **not** call `link_commit` for these commits—they are normal branch commits. Only after the PR is merged, link the squash commit once (see below).
  - **Ralph / agent:** While executing tasks, commit and push as above; do **not** call `link_commit`. After the PR is merged, link the squash commit once (see below).
  - **After merge:** Call MCP `link_commit(planId, repo, squashSha, taskId?, message?)` with the squash SHA and optional PR message, or run:
    `pnpm exec workflow-link-merge --plan <id> --sha <squash-sha> --repo <owner/repo>`
    (optional: `--message`, `--task`).
    This keeps `commit_links` in sync with main and powers activity-by-date and last-activity for the plan/task.

### Documentation tables (docs watch)

The **documentation** and **documentation_embeddings** tables support the "docs folder watch and re-index on main" flow: when changes to `docs/` land on main (single squash commit), ingest parses and vectorizes content into these tables. Metadata (repo, sha, PR number, authors, message) mirrors the commit/PR context, similar to how **commit_links** stores plan/task ↔ repo/sha. Search is exposed via a dedicated MCP server (e.g. `@openthrottle/docs-mcp`), separate from **mcp-developer** (plans/tasks). Idempotency: one row per (repo, sha, path); ingest can replace-by-sha for a given path.

### Plan and task attributes (PRD mapping)

When creating or ingesting plans and tasks (e.g. from a strict PRD or via `/cortex/planning-mode`), use this mapping. Timestamps are always handled by the DB; the agent infers author (GitHub handle) when missing and always evaluates category (infer when missing, or confirm/adjust when provided so it fits the plan).

#### Plans

- **Required:** `title`
- **Inferred by agent when missing:** `author` (GitHub handle; e.g. from context or current user). When `GITHUB_USER` or `CORTEX_GITHUB_USER` is set, the MCP server overrides with that value.
- **Category:** agent infers when missing; when provided, confirm it fits the plan or pick a better one
- **Always handled by DB:** `id`, `created_at`, `updated_at` — never need to supply
- **Default:** `status` → `pending` if omitted
- **Optional:** `description`, `status` (one of: BACKLOG, BLOCKED, CANCELED, COMPLETED, IN_PROGRESS, PENDING, QUEUED, SKIPPED), `summary` (PRD summarization: next actions, usage guides, wrap-up notes), `assignee` (see [Assignee rule](#assignee-rule)), `project_id` (see [Project association](#project-association-when-to-set-project))

#### Tasks

- **Required:** `title`, `plan_id` (set when creating under a plan)
- **Always handled by DB:** `id`, `created_at`, `updated_at` — never need to supply
- **Default:** `status` → `pending` if omitted; `requirements` → `[]` if omitted
- **Optional:** `description`, `category`, `status` (one of: BACKLOG, BLOCKED, CANCELED, COMPLETED, IN_PROGRESS, PENDING, SKIPPED), `requirements` (JSONB array), `summary` (per-task wrap-up: actions, usage notes, or why blocked), `assignee` (see [Assignee rule](#assignee-rule)), `project_id` (see [Project association](#project-association-when-to-set-project))

#### Projects collection (applications only)

The `projects` table is intentionally limited to **NX applications** (from `nx show projects --type=app`), not package scopes. To remove non-application projects and avoid duplicate rows:

1. **Merge duplicates:** Rows with the same `nx_project_name` are merged (plans/tasks repointed to one id, others deleted).
2. **Delete non-apps:** Projects whose `nx_project_name` is not in the Nx app list are deleted. `plans.project_id` and `tasks.project_id` use `ON DELETE SET NULL`, so no dangling FKs.

Run with dry-run first, then without to apply:

```bash
pnpm exec tsx ./scripts/cleanup-cortex-projects-apps-only.ts [--dry-run]
```

After cleanup, run `pnpm run cortex:migrate` so migration `032_projects_unique_nx_project_name.sql` enforces at most one project per `nx_project_name`.

To **link plans/tasks that have no project** to an existing project when the title clearly matches (no new projects created):

```bash
pnpm exec tsx ./scripts/link-cortex-plans-tasks-to-existing-projects.ts [--dry-run]
```

#### Project association (when to set project)

Set `project_id` (or the project relation) only when the plan or task is **clearly scoped to a single NX application** (from the NX project graph). Leave **unset** when the work is cross-cutting or not tied to one project.

- **Set project when:** The plan or task is unambiguously about one application (e.g. `openthrottle-developer`, `openthrottle-server`, `openthrottle-website`). Use the **NX project name** as stored in the `projects` table (`nx_project_name`); only application names exist in the table after cleanup.
- **Leave unset when:**
  - **Infrastructure** — Caddy, Ollama, Docker, CI, or other shared infra.
  - **Documentation** — Docs-only plans or tasks (e.g. writing or reorganizing docs).
  - **Cross-repo or multi-repo** — Work spanning repos or not tied to this monorepo.
  - **Multi-project** — Work that touches several NX projects (e.g. "migrate all apps to Tailwind").
  - **Ideas / backlog** — High-level ideas or backlog items that are not yet scoped to a project.
  - **Ambiguous** — When you cannot confidently pick a single project; do not force an association.

When in doubt, leave `project_id` null. Associating later is safe; incorrectly associating can mislead filtering and reporting.

#### Status semantics (plans and tasks)

Canonical statuses: **backlog**, **blocked**, **canceled**, **completed**, **in_progress**, **pending**, **queued**, **skipped**.

- **canceled** — Closed with no work / explicitly not doing.
- **completed** — Work done.
- **queued** — Plans only: job enqueued in BullMQ (Run plan) until the worker picks it up; then set to **in_progress**.
- **skipped** — Deferred or skipped for now (may be revisited later).

Remaining-work semantics (e.g. `get_remaining_tasks_for_plan`): tasks whose status is **not** completed, skipped, or canceled (i.e. backlog, blocked, in_progress, pending).

#### Assignee rule

`assignee` on both **plans** and **tasks** must be either:

- A **GitHub username** (string; e.g. `visormatt`), or
- **`null` / undefined** when unassigned.

Do **not** use display names, email addresses, or other formats. All write paths (MCP tools, ingest, UI) must accept only a valid GitHub username or null; invalid values should be normalized or rejected.

**Enforcing GitHub username (MCP):** When `GITHUB_USER` or `CORTEX_GITHUB_USER` is set, the **mcp-developer** (OT) MCP uses that value for **author** and **assignee** on `create_plan`, `update_plan`, `create_task`, `create_tasks`, and `update_task`, so the agent cannot store a display name (e.g. `matt`) instead of the GitHub username (e.g. `visormatt`). Set one of these env vars in the MCP run environment to enforce.

For a strict, hyper-detailed PRD: provide all fields you care about. For rough ideas: use `/cortex/planning-mode` or MCP `create_plan` / `create_task`; the agent infers author (GitHub handle) when missing and always evaluates category (infer or confirm/adjust).

### PRD summarization (summary field)

The optional **summary** field on plans and tasks supports PRD summarization: next actions, usage guides, and wrap-up notes.

- **When to fill:** At plan or task completion, or when closing or pausing work (e.g. marking blocked).
- **What to include:**
  - **Plans:** Next actions for the plan, how to use what was built, or wrap-up notes (e.g. "Run `pnpm run cortex:migrate` after pull; summary is optional on create/update.").
  - **Tasks:** Per-task wrap-up: follow-up actions, usage notes, or why the task is blocked (e.g. "Blocked on API key; document env in README when unblocked.").
- **How:** Use MCP `update_plan` or `update_task` with a `summary` argument, or set `summary` when creating plans/tasks. Ingest reads optional `metadata.summary` (plans) and `summary` (tasks) from plan JSON so file-based and DB stay in sync.

## Connecting

Using `psql`:

```bash
PGPASSWORD=cortex_password psql -h localhost -p 5556 -U cortex_user -d cortex
```

Connection string:

```bash
postgresql://cortex_user:cortex_password@localhost:5556/cortex
```

### MCP (OpenThrottle plans/tasks)

**@openthrottle/mcp-developer** — The OpenThrottle (OT) MCP server. It talks to the backend **via GraphQL only** (openthrottle-server). No direct Postgres. Set `CORTEX_AUTH_TOKEN` (or `MCP_DEVELOPER_AUTH_TOKEN`) for authenticated requests. See `packages/openthrottle/mcp-developer/README.md` and `.cursor/mcp.json`. Tools include plans, tasks, notes, commit links, activity, output stream, semantic search, and health.

## Example queries

**Plans by status**

```sql
SELECT id, title, author, category, status FROM plans WHERE status = 'completed' ORDER BY created_at DESC;
```

**Plans by category**

```sql
SELECT id, title, category FROM plans WHERE category = 'infrastructure';
```

**Plans by author** (author is stored as GitHub handle)

```sql
SELECT id, title, author FROM plans WHERE author = 'visormatt';
```

**Tasks for a plan**

```sql
SELECT t.id, t.title, t.status FROM tasks t JOIN plans p ON t.plan_id = p.id WHERE p.title LIKE '%cortex%' ORDER BY t.title;
```

**Semantic search (after ingestion with embeddings)**

Nearest plans by embedding (replace `$1` with a 1536-dim vector, e.g. from OpenAI):

```sql
SELECT p.id, p.title, 1 - (pe.embedding <=> $1::vector) AS similarity
FROM plan_embeddings pe
JOIN plans p ON pe.plan_id = p.id
ORDER BY pe.embedding <=> $1::vector
LIMIT 5;
```

Nearest tasks:

```sql
SELECT t.id, t.title, p.title AS plan_title, 1 - (te.embedding <=> $1::vector) AS similarity
FROM task_embeddings te
JOIN tasks t ON te.task_id = t.id
JOIN plans p ON t.plan_id = p.id
ORDER BY te.embedding <=> $1::vector
LIMIT 5;
```

## Migration from file-based storage

- Plan JSON files under `plans/` (in any non-`templates` subdirectory) can remain the source of truth on disk until you switch to DB-as-source.
- The ingestion script only reads; it does not delete or modify plan files.
- For a fresh ingest (e.g. after dumping test data or changing source files), run `pnpm run cortex:reset` then `pnpm run cortex:import`. Re-running ingest without reset is additive; duplicate plans may be inserted.
- After backing up and removing the `plans/` folder, the Cortex database is the single source of truth; use MCP tools and Cursor `/cortex/*` commands to create and update plans/tasks. There is no re-export (DB → JSON) script yet; track the idea in Cortex (e.g. a placeholder plan) if you want it later.

## Migrations

SQL migrations live in `databases/cortex/migrations/` and are applied in filename order by `pnpm run cortex:migrate`.

When using **Option A** (Ollama with a 1536-dim embedding model), no additional migration or schema change is required; existing embedding tables (`plan_embeddings`, `task_embeddings`, `documentation_embeddings`) and their `vector(1536)` columns stay as-is. See [Embedding dimension strategy (OpenAI and Ollama)](#embedding-dimension-strategy-openai-and-ollama).

1. `001_enable_pgvector.sql` – Enable pgvector extension.
2. `002_create_plans_table.sql` – Plans table and indexes.
3. `003_create_tasks_table.sql` – Tasks table and FK to plans.
4. `004_create_plan_embeddings_table.sql` – Plan embeddings and vector index.
5. `005_create_task_embeddings_table.sql` – Task embeddings and vector index.
6. `006_create_commit_links_table.sql` – Commit links (plan/task ↔ repo/sha).
7. `007_create_plan_output_stream_table.sql` – Plan output stream (agent/iteration log per plan).
8. `009_create_notes_table.sql` – Notes table for quick unstructured thoughts; foundation for notes route and planning workflow.
9. `010_normalize_author_to_visormatt.sql` – Normalize plan/note author to visormatt.
10. `011_normalize_status_complete_to_completed.sql` – Normalize status value `complete` to `completed`.
11. `012_add_assignee_to_plans_and_tasks.sql` – Optional `assignee` on plans and tasks (see [Assignee rule](#assignee-rule)).
12. `013_normalize_assignee_to_visormatt.sql` – Set all non-null assignee values to `visormatt` (flush legacy formats before enforcing GH-username-only rule).
13. `014_add_summary_to_plans.sql` – Optional `summary` (TEXT) on plans for PRD summarization.
14. `015_add_summary_to_tasks.sql` – Optional `summary` (TEXT) on tasks for per-task wrap-up.
15. `016_add_backlog_status.sql` – Document canonical statuses (backlog, blocked, completed, in_progress, pending, skipped) on plans.status and tasks.status.
16. `017_add_plans_list_sort_indexes.sql` – Indexes for listPlansByStatus: plans(updated_at), (status, created_at), (status, updated_at).
17. `018_plans_title_trgm.sql` – pg_trgm extension and GIN index on plans(title) for ILIKE title filter.
18. `019_create_documentation_table.sql` – documentation table (path, content, repo, sha, pr_number, authors, message, created_at) and indexes.
19. `020_create_documentation_embeddings_table.sql` – documentation_embeddings table (documentation_id FK, content, embedding, metadata) and HNSW/GIN indexes.
20. `021_add_canceled_status.sql` – Document canonical statuses including canceled (backlog, blocked, canceled, completed, in_progress, pending, skipped). canceled = closed with no work / not doing; completed = work done; skipped = deferred or skipped for now.
21. `028_plan_task_status_enum.sql` – Replace TEXT status with `plan_task_status` enum (BACKLOG, BLOCKED, CANCELED, COMPLETED, IN_PROGRESS, PENDING, SKIPPED).
22. `029_add_queued_status.sql` – Add QUEUED to `plan_task_status` (plans only; used when Run plan enqueues job in BullMQ until worker starts).
23. `030_create_doc_ingestion_state_table.sql` – doc_ingestion_state table (scope, path, content_hash, updated_at) for diff-based doc ingestion; see docs/openthrottle/doc-ingestion-job-spec.md.
24. `026_create_users_table.sql` – users table (id, created_at, updated_at, email, github_username) for auth and assignment.
25. `031_add_users_password_hash_and_email_unique.sql` – Add `password_hash` (TEXT, nullable) and unique index on email (WHERE email IS NOT NULL) for OpenThrottle local auth; see docs/openthrottle/openthrottle-server-auth.md.
26. `032_projects_unique_nx_project_name.sql` – Unique partial index on `projects(nx_project_name)` WHERE nx_project_name IS NOT NULL; run after `scripts/cleanup-cortex-projects-apps-only.ts` so duplicates are merged first.

### Migration strategy (TypeORM vs SQL)

We keep **SQL files as the single source of truth** for schema. TypeORM is used only for **runtime** (connection pooling via DataSource, raw SQL in openthrottle-server and scripts; entities for type safety). We do **not** use TypeORM’s migration runner.

- **Applying schema changes:** Add a new numbered `.sql` file in `databases/cortex/migrations/`, then run `pnpm run cortex:migrate`. The script `scripts/run-cortex-migrations.ts` runs all `.sql` files in filename order.
- **Keeping runtime in sync:** After adding or changing a migration, update TypeORM entities in `@openthrottle/nestjs-repositories` (and any scripts that use Cortex Postgres) so they match the SQL schema. Entity JSDoc should reference the migration(s), e.g. “Matches databases/cortex/migrations (002, 012).”
- **Long-term rationale:** For pros/cons and a greenfield recommendation (SQL-as-source vs TypeORM migrations), see [docs/monorepo/migration-strategy-sql-vs-typeorm.md](../../docs/monorepo/migration-strategy-sql-vs-typeorm.md).
- **Why not TypeORM migrations:** We already have a long, ordered history of SQL migrations and a single command (`cortex:migrate`) that applies them. Introducing TypeORM migrations would duplicate history or require a one-time conversion and a separate “migrations run” table. Keeping SQL as source of truth avoids two migration systems and keeps one readable, version-controlled history.
