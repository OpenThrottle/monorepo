# OpenThrottle database

Postgres database for plans ingestion with pgvector for semantic search. Used to store plan JSON and optional output Markdown from the `plans/` directory.

## Setup

1. **Start Postgres and Redis (OpenThrottle)**

   From the repo root, using env from `.env.default` (or copy to `.env`). This brings up **`openthrottle-postgres`** and **`openthrottle-redis`** from the root `docker-compose.yml` (same as `pnpm run database:start`). For the full minimal API + UI path (install, migrate, `openthrottle-server:dev`, optional `openthrottle-developer:dev`), see [docs/openthrottle/run-openthrottle-server-developer.md](../docs/openthrottle/run-openthrottle-server-developer.md). To verify OpenThrottle and the MCP are reachable after the API is up, use the **openthrottle-mcp `health` tool** — see [packages/openthrottle-mcp/docs/verification-environment.md](../packages/openthrottle-mcp/docs/verification-environment.md) (smoke baseline).

   ```bash
   pnpm run database:start
   ```

   Equivalent explicit Compose invocation:

   ```bash
   docker compose up -d openthrottle-postgres openthrottle-redis
   ```

2. **Environment variables**

   Set in `.env` or export before running scripts (see `.env.default` for defaults):

   | Variable            | Purpose           | Example                 |
   | ------------------- | ----------------- | ----------------------- |
   | `POSTGRES_HOST`     | Postgres host     | `localhost`             |
   | `POSTGRES_PORT`     | Postgres port     | `6010`                  |
   | `POSTGRES_DB`       | Database name     | `openthrottle`          |
   | `POSTGRES_USER`     | Database user     | `openthrottle_user`     |
   | `POSTGRES_PASSWORD` | Database password | `openthrottle_password` |

   Optional: `POSTGRES_URL` — full connection string (e.g. `postgresql://user:pass@host:port/db`). If set, openthrottle-server and scripts can use it directly (openthrottle-mcp talks to OpenThrottle via GraphQL only); otherwise they build from the five vars above.

3. **Run migrations**

   Creates tables and indexes (run once after first start, or after schema changes):

   ```bash
   pnpm run database:migrate
   ```

   **Service account bootstrap:** Migration `045_seed_service_accounts_bootstrap.sql` creates `openthrottle-mcp` and `workflow-ralph` service accounts with roles `mcp` and `workflow-ralph` (`plans:read`, `plans:write`). Mint bearer tokens once:

   ```bash
   pnpm run database:bootstrap-service-accounts
   ```

   Copy the printed values into `OPENTHROTTLE_MCP_AUTH_TOKEN` (Cursor MCP / openthrottle-mcp) and `OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN` (BullMQ Ralph worker GraphQL). Format: `ot_sa_<prefix>_<secret>`. See [packages/openthrottle-mcp/docs/AUTH.md](../packages/openthrottle-mcp/docs/AUTH.md).

   **Backup (optional):** `pnpm run database:backup` writes `databases/backups/openthrottle-*.zip` (requires `pg_dump` and `zip` on PATH). For a daily BullMQ schedule on openthrottle-server, set `DATABASE_BACKUP_CRON` — see [docs/openthrottle/database-backup-scheduled-job-spec.md](../docs/openthrottle/database-backup-scheduled-job-spec.md).

4. **Reset the database (optional, before a fresh ingest)**

   Truncates all cortex tables so a re-run of ingest does not create duplicate plans. Use when switching from test data to real data or when re-ingesting after changing source files:

   ```bash
   pnpm run database:reset
   ```

5. **Ingest plans from the filesystem**

   Reads plan JSON from **all non-template subdirectories** under `plans/` (root, `completed`, `ideas`, and any other directory except `templates`) and inserts into `plans`, `tasks`, and `plan_output_stream`. For each plan file, the script looks for a same-named `*-output.md` and uses it for plan embeddings and, when non-empty, inserts it as one chunk into `plan_output_stream`. With `OPENAI_API_KEY` set, also generates embeddings and fills `plan_embeddings` and `task_embeddings`:

   ```bash
   pnpm run database:import
   ```

   The script is read-only for the filesystem; it does not delete or modify plan files.

6. **Ingest docs/ and NX project READMEs into documentation tables (optional)**

   Reads all `.md` files under `docs/` and each NX project's `README.md` (from the NX project graph) and upserts into `documentation` and `documentation_embeddings`. Idempotent per (repo, sha, path). Docs use paths like `docs/foo.md`; project READMEs use `projects/<project-root>/README.md` (e.g. `projects/applications/openthrottle-developer/README.md`). With `OPENAI_API_KEY` set, generates embeddings. Optional env: `DOCS_REPO`, `DOCS_SHA`, `DOCS_AUTHORS` (comma-separated), `DOCS_MESSAGE`, `DOCS_PR_NUMBER` for source metadata (e.g. from docs-watch workflow):

   ```bash
   pnpm run database:import-docs
   ```

Plan JSON must have a `metadata` object (with `author` (GitHub handle), `category`, `title`) and a `tasks` array; files with other shapes (e.g. a bare array of task objects) are skipped and reported as errors.

## Schema

- **plans** – Plan metadata: `id`, `title`, `author`, `category`, `status`, `description`, `summary` (optional; PRD summarization: next actions, usage guides, wrap-up notes), `assignee` (optional; see [Assignee rule](#assignee-rule) below), `project_id` (optional, FK to projects; nullable), `created_at`, `updated_at`. In the OpenThrottle API, `projectId` is optional on create/update and in list filters; `projectRelation` is null when `projectId` is unset.
- **projects** – NX project reference for scoping plans/tasks: `id`, `name`, `nx_project_name` (TEXT; unique when not null per migration 032), `description`, `created_at`, `updated_at`. Only **NX applications** are kept; see [Projects collection (applications only)](#projects-collection-applications-only).
- **tasks** – Tasks for each plan: `id`, `plan_id` (FK), `title`, `description`, `category`, `status`, `requirements` (JSONB), `summary` (optional; per-task wrap-up: actions, usage notes, or why blocked), `assignee` (optional; see [Assignee rule](#assignee-rule) below), `sort_order` (INTEGER NOT NULL; explicit execution/list order within the plan; see [Task sort_order](#task-sort_order)), `created_at`, `updated_at`.
- **plan_embeddings** – Vector embeddings for plan content: `id`, `plan_id` (FK), `content`, `embedding` (vector 1536), `metadata` (JSONB), `created_at`.
- **task_embeddings** – Vector embeddings for task content: `id`, `task_id` (FK), `content`, `embedding` (vector 1536), `metadata` (JSONB), `created_at`.
- **commit_links** – Git commit linkage to plans/tasks: `id`, `plan_id` (FK), `task_id` (FK, nullable), `repo`, `sha`, `message`, `created_at`. One row per (plan, task, repo, sha); `task_id` null = plan-level link.
- **plan_output_stream** – Streaming output (e.g. agent iteration log) per plan: `id`, `plan_id` (FK), `iteration` (nullable), `content`, `created_at`. Chunks appended in order; exposed via MCP `append_plan_output` and `get_plan_output`.
- **notes** – Quick unstructured thoughts: `id`, `content`, `author` (optional, e.g. GitHub username), `created_at`, `updated_at`. Foundation for notes route and planning workflow (e.g. create plan from note); exposed via MCP `create_note`, `get_note`, `list_notes`, `update_note`, `delete_note`.
- **documentation** – Source-of-truth per doc file landed on main (from `docs/` and NX project READMEs): `id`, `path` (TEXT; path under repo, e.g. `docs/foo.md` or `projects/<project-root>/README.md`), `content` (TEXT; parsed full text or summary for display), `repo` (TEXT), `sha` (TEXT; squash commit SHA), `pr_number` (INTEGER, nullable), `authors` (JSONB; e.g. array of GitHub usernames or `[{ "login", "email" }]`), `message` (TEXT; commit message), `created_at`. One row per (repo, sha, path); unique on (repo, sha, path) for idempotent upsert/replace-by-sha.
- **documentation_embeddings** – Vector embeddings for doc chunks (semantic search): `id`, `documentation_id` (FK to documentation), `content` (TEXT; chunk text), `embedding` (vector 1536), `metadata` (JSONB), `created_at`. Same pattern as plan_embeddings / task_embeddings; HNSW index on embedding, GIN on metadata.
- **doc_ingestion_state** – Prior state for diff-based doc ingestion (BullMQ job): `scope` (TEXT), `path` (TEXT), `content_hash` (TEXT; e.g. SHA-256), `updated_at` (TIMESTAMPTZ). One row per (scope, path); primary key (scope, path). Used to determine to-add / to-update / to-remove when re-ingesting markdown. See `docs/openthrottle/doc-ingestion-job-spec.md` and migration `030_create_doc_ingestion_state_table.sql`.
- **users** – User accounts for auth and assignment: `id`, `created_at`, `updated_at`, `email` (TEXT, nullable; unique when set for login), `github_username` (TEXT NOT NULL), `password_hash` (TEXT, nullable; bcrypt for OpenThrottle local auth). See migrations `026_create_users_table.sql`, `031_add_users_password_hash_and_email_unique.sql`. Optional: table can be dropped and recreated with a stricter schema (e.g. email NOT NULL for new auth users); see migration 031 comments.
- **permissions** – RBAC permission definitions: `id`, `name` (TEXT, unique), `description` (TEXT, nullable), `created_at`. Seeded with `settings:read`, `settings:write`, `users:read`, `users:write` (migration 034) and `plans:read`, `plans:write` (migration 045).
- **roles** – RBAC roles: `id`, `name` (TEXT, unique), `description` (TEXT, nullable), `created_at`, `updated_at`. Seeded with `admin`, `user`, `viewer` (034) and automation roles `mcp`, `workflow-ralph` (045).
- **role_permissions** – Join table role_id ↔ permission_id (many-to-many). See migration 034.
- **user_roles** – Join table user_id ↔ role_id (many-to-many). See migration 034.
- **service_accounts** – Machine/service actors for system-to-system auth (MCP, CI, workers): `id`, `name` (unique), `description`, `disabled_at`, `created_at`. Bearer tokens use prefix `ot_sa_`. See migration `044_create_service_accounts_tables.sql`.
- **service_account_credentials** – Hashed secrets for service accounts: `id`, `service_account_id` (FK), `prefix` (unique; lookup key in bearer token), `secret_hash`, `label`, `expires_at`, `last_used_at`, `revoked_at`, `created_at`. Plaintext secret returned only at create time.
- **service_account_roles** – Join table service_account_id ↔ role_id (many-to-many; same `roles` as humans). See migration 044.
- **subscriptions** – Stripe subscription state for OpenThrottle payments: `id`, `user_id` (FK), `stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id`, `status`, `current_period_start`, `current_period_end`, `cancel_at_period_end`, `created_at`, `updated_at`. See migration `035_create_subscriptions_table.sql`.
- **custom_prompts** – Custom prompt documents for AI workflow customization (Agents.md, skills, commands, prompts, rules): `id`, `title`, `content`, `description` (optional), `prompt_type` (enum-like: agents, skills, commands, prompts, rules), `labels` (JSONB array of strings), `file_path` (optional; path relative to workspace), `user_id` (optional FK to users), `project_id` (optional FK to projects), `deleted_at` (soft delete), `created_at`, `updated_at`. See migration `036_create_custom_prompts_table.sql`.
- **custom_prompt_embeddings** – Vector embeddings for custom prompt content (semantic search): `id`, `custom_prompt_id` (FK), `content`, `embedding` (vector 1536), `metadata` (JSONB), `created_at`. Same pattern as plan_embeddings / documentation_embeddings. See migration `037_create_custom_prompt_embeddings_table.sql`.
- **user_workspace_settings** – Per-user workspace profile (Settings → Workspace): `user_id` (PK, FK to users), `contact_display_name`, `contact_email`, `enabled_editors` (JSONB array of editor ids, e.g. `cursor`, `vscode`), `created_at`, `updated_at`. See migration `042_create_workspace_settings_tables.sql` and `applications/openthrottle-server/docs/workspace-settings-graphql-design.md`.
- **workspace_local_repositories** – Local filesystem checkouts registered by a user: `id`, `user_id` (FK), `filesystem_path` (absolute; unique per user), `display_name`, `git_remote_url`, `git_default_branch`, `project_id` (optional FK to projects), `created_at`, `updated_at`. See migration 042 and workspace-settings GraphQL design doc.
- **agent_conversations** – Persisted web chat/agent threads (human JWT user-scoped): `id`, `user_id` (FK to users, ON DELETE CASCADE), `title` (optional; auto from first user message ~80 chars), `status` (`active` \| `archived`; archive-only in v1, no hard delete), `plan_id` (optional FK, ON DELETE SET NULL), `project_id` (optional FK, ON DELETE SET NULL), `model_provider`, `model_name` (router LLM snapshot per persist turn; null for heuristic-only routing), `metadata` (JSONB), `created_at`, `updated_at`. Strictly separate from **plan_output_stream** (Ralph logs). See migration `051_create_agent_conversations_tables.sql`.
- **agent_conversation_messages** – Ordered messages within a conversation: `id`, `conversation_id` (FK, ON DELETE CASCADE), `role` (`user` \| `assistant` \| `system` \| `tool`; v1 writes user + assistant only), `content` (TEXT; **app cap 256KB** on insert), `sort_order` (INTEGER NOT NULL; monotonic per conversation; user+assistant consecutive per turn in one txn), denormalized assistant routing columns (`routing_tier`, `routing_confidence`, `routing_model`, `routing_reason`), `tool_metadata` (JSONB; **app cap 64KB**; set `truncated` in envelope when clipped), `created_at`. No `task_id` or `parent_message_id` in v1.

Indexes include HNSW vector indexes on embedding columns for similarity search.

### Indexes

Indexes are created by migrations in `databases/migrations/`. Main tables and their indexes:

- **plans** – `idx_plans_status`, `idx_plans_category`, `idx_plans_author`, `idx_plans_created_at`, `idx_plans_assignee` (partial), `idx_plans_updated_at`, `idx_plans_status_created_at`, `idx_plans_status_updated_at`, `idx_plans_title_trgm` (GIN, pg_trgm for ILIKE). See `002_create_plans_table.sql`, `012_add_assignee_to_plans_and_tasks.sql`, `017_add_plans_list_sort_indexes.sql`, `018_plans_title_trgm.sql`.
- **tasks** – `idx_tasks_plan_id`, `idx_tasks_status`, `idx_tasks_category`, `idx_tasks_created_at`, `idx_tasks_requirements` (GIN), `idx_tasks_assignee` (partial), `idx_tasks_plan_id_sort_order` (unique on `plan_id`, `sort_order`). See `003_create_tasks_table.sql`, `012_add_assignee_to_plans_and_tasks.sql`, `049_add_sort_order_to_tasks.sql`.
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
- **subscriptions** – `idx_subscriptions_stripe_subscription_id` (unique partial), `idx_subscriptions_user_id`, `idx_subscriptions_status`. See migration `035_create_subscriptions_table.sql`.
- **custom_prompts** – `idx_custom_prompts_prompt_type`, `idx_custom_prompts_labels` (GIN), `idx_custom_prompts_user_id` (partial), `idx_custom_prompts_project_id` (partial), `idx_custom_prompts_file_path` (partial), `idx_custom_prompts_created_at`, `idx_custom_prompts_updated_at`, `idx_custom_prompts_type_created_at`, `idx_custom_prompts_active` (partial WHERE deleted_at IS NULL), `idx_custom_prompts_title_trgm` (GIN, pg_trgm for ILIKE). See migration `036_create_custom_prompts_table.sql`.
- **custom_prompt_embeddings** – `idx_custom_prompt_embeddings_custom_prompt_id`, `idx_custom_prompt_embeddings_vector` (HNSW cosine), `idx_custom_prompt_embeddings_metadata` (GIN). See migration `037_create_custom_prompt_embeddings_table.sql`.
- **agent_conversations** – `idx_agent_conversations_user_status_updated_at` (user_id, status, updated_at DESC), `idx_agent_conversations_plan_id` (partial WHERE plan_id IS NOT NULL). See migration `051_create_agent_conversations_tables.sql`.
- **agent_conversation_messages** – `idx_agent_conversation_messages_conversation_sort_order` (unique on conversation_id, sort_order). See migration `051_create_agent_conversations_tables.sql`.

**When to add new indexes:** Add a new migration when you introduce a **new filter or sort column** used by openthrottle-mcp (via GraphQL), openthrottle-server, or the OpenThrottle app (e.g. a new WHERE or ORDER BY), or a **new query pattern** that would benefit from a composite or partial index. Prefer composite indexes for common filter+sort combinations (e.g. status + created_at). For substring/ILIKE search on text, consider `pg_trgm` and a GIN index (see `018_plans_title_trgm.sql`). Audit notes: `databases/INDEX_AUDIT.md`.

### Embedding dimension strategy (OpenAI and Ollama)

Embedding tables (`plan_embeddings`, `task_embeddings`, `documentation_embeddings`, `custom_prompt_embeddings`) use **vector(1536)**. The default flow uses **OpenAI** (e.g. `text-embedding-3-small`), which outputs 1536 dimensions. This flow is unchanged and remains the default when `OPENAI_API_KEY` is set and Ollama env is not.

**Ollama (optional, additive):** When `OLLAMA_BASE_URL` or `sOLLAMA_EMBEDDING_MODEL` is set, database:import and openthrottle-server can use **Ollama** for local embeddings. When neither is set, the existing OpenAI flow (e.g. `OPENAI_API_KEY`) is used. Env: `OLLAMA_BASE_URL` (default `http://localhost:11434`), `OLLAMA_EMBEDDING_MODEL` (e.g. `nomic-embed-text`). See root `.env.default` and `scripts/ollama.sh`. **When using Caddy** (tools/caddy), set `OLLAMA_BASE_URL` to the Caddy-proxied URL (e.g. `https://ollama.local` or `https://localhost/osllama`) so database:import and other consumers use the same endpoint. For HTTPS with Caddy's local certs, see `docs/monorepo/Ollama.md` and tools/caddy/README.md (TLS/trust store). Ollama models (e.g. `nomic-embed-text`, `mxbai-embed-large`) may output a different dimension. Strategy:

- **Option A — Same dimension (recommended for simplicity):** Use an Ollama model that outputs **1536** dimensions so the existing schema and migrations stay as-is. No migration; same tables and indexes. Re-ingest with Ollama when switching; no mixed-dimension storage. **OpenThrottle ingest and openthrottle-server only insert embeddings when the vector length is 1536;** if the chosen Ollama model returns a different dimension, embeddings are skipped (no error). Known Ollama embedding model dimensions: `nomic-embed-text` 768, `mxbai-embed-large` 1024, `all-minilm` 384. As of the current Ollama library, none of these output 1536; for Option A with OpenThrottle, use **OpenAI** (`OPENAI_API_KEY`) for embeddings, or use an Ollama model that outputs 1536 when one becomes available.
- **Option B — Different dimension (future):** If we support Ollama models with a different dimension, add an **optional** path only: e.g. configurable dimension from env, or a separate table/column for Ollama-backed embeddings, **without** altering existing `vector(1536)` columns or current OpenAI flow. Document re-ingest and any new migrations if this path is added.

Do **not** change existing `vector(1536)` columns or remove the OpenAI code path. Additive only.

### Commit links (Option A workflow)

We use **Option A:** link only the **squash commit after a PR is merged**. The repo keeps 1 PR = 1 commit on main (squash-and-merge); OpenThrottle stores that single SHA in `commit_links` so "what landed" matches the repo.

- **When to call `link_commit`:** Only **after** a PR is merged. Use the **squash commit SHA** (the one that appears on the default branch), not pre-merge commits from the branch. Do **not** link commits during the Ralph loop or while the PR is open.
- **How activity tools use it:** `get_activity_by_date` and `get_last_activity` read from `commit_links`. Because we only store the squash SHA, activity reflects **landed work only** (commits that exist on main). Pre-merge branch history is not in OpenThrottle.
- **Day-to-day workflow:**
  - **Commit as you complete tasks:** During Ralph (or any plan execution), commit and push after each task or logical chunk. Use conventional commits (e.g. `feat(cortex): document commit workflow`). In the commit body or footer, include `Plan-Id: <uuid>` and `Task-Id: <uuid>` for traceability. Do **not** call `link_commit` for these commits—they are normal branch commits. Only after the PR is merged, link the squash commit once (see below).
  - **Ralph / agent:** While executing tasks, commit and push as above; do **not** call `link_commit`. After the PR is merged, link the squash commit once (see below).
  - **After merge:** Call MCP `link_commit(planId, repo, squashSha, taskId?, message?)` with the squash SHA and optional PR message, or run:
    `pnpm exec workflow-link-merge --plan <id> --sha <squash-sha> --repo <owner/repo>`
    (optional: `--message`, `--task`).
    This keeps `commit_links` in sync with main and powers activity-by-date and last-activity for the plan/task.

### Plan and task attributes (PRD mapping)

When creating or ingesting plans and tasks (e.g. from a strict PRD or via `/cortex/planning-mode`), use this mapping. Timestamps are always handled by the DB; the agent infers author (GitHub handle) when missing and always evaluates category (infer when missing, or confirm/adjust when provided so it fits the plan).

#### Plans

- **Required:** `title`
- **Inferred by agent when missing:** `author` (GitHub handle; e.g. from context or current user). When `GITHUB_USER` or `OPENTHROTTLE_GITHUB_USER` is set, the MCP server overrides with that value.
- **Category:** agent infers when missing; when provided, confirm it fits the plan or pick a better one
- **Always handled by DB:** `id`, `created_at`, `updated_at` — never need to supply
- **Default:** `status` → `pending` if omitted
- **Optional:** `description`, `status` (one of: BACKLOG, BLOCKED, CANCELED, COMPLETED, IN_PROGRESS, PENDING, QUEUED, SKIPPED), `summary` (PRD summarization: next actions, usage guides, wrap-up notes), `assignee` (see [Assignee rule](#assignee-rule)), `project_id` (see [Project association](#project-association-when-to-set-project))

#### Tasks

- **Required:** `title`, `plan_id` (set when creating under a plan)
- **Always handled by DB:** `id`, `created_at`, `updated_at` — never need to supply
- **Default:** `status` → `pending` if omitted; `requirements` → `[]` if omitted
- **Optional:** `description`, `category`, `status` (one of: BACKLOG, BLOCKED, CANCELED, COMPLETED, IN_PROGRESS, PENDING, SKIPPED), `requirements` (JSONB array), `summary` (per-task wrap-up: actions, usage notes, or why blocked), `assignee` (see [Assignee rule](#assignee-rule)), `project_id` (see [Project association](#project-association-when-to-set-project)), `sort_order` (see [Task sort_order](#task-sort_order); auto-assigned when omitted)

#### Projects collection (applications only)

The `projects` table is intentionally limited to **NX applications** (from `nx show projects --type=app`), not package scopes. To remove non-application projects and avoid duplicate rows:

1. **Merge duplicates:** Rows with the same `nx_project_name` are merged (plans/tasks repointed to one id, others deleted).
2. **Delete non-apps:** Projects whose `nx_project_name` is not in the Nx app list are deleted. `plans.project_id` and `tasks.project_id` use `ON DELETE SET NULL`, so no dangling FKs.

Run with dry-run first, then without to apply:

```bash
pnpm exec tsx ./scripts/cleanup-cortex-projects-apps-only.ts [--dry-run]
```

Asfter cleanup, run `pnpm run database:migrate` so migration `032_projects_unique_nx_project_name.sql` enforces at most one project per `nx_project_name`.

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

#### Task sort_order

`sort_order` (GraphQL: `sortOrder`) is the canonical execution and list sequence for tasks **within a plan**. Scoped per `plan_id` only; enforced by `UNIQUE (plan_id, sort_order)` (migration `049_add_sort_order_to_tasks.sql`).

- **Canonical sort:** `sort_order ASC`, `created_at ASC` (tiebreaker only).
- **Backfill:** existing tasks ordered by `created_at ASC` within each plan → 1000, 2000, 3000, …
- **Auto-assign on create:** when omitted, append `MAX(sort_order) + 1000` (first task in plan → 1000).
- **Batch create (`create_tasks`):** when `sortOrder` is omitted per item, each new task appends after the plan max (`MAX + 1000`, `MAX + 2000`, …) preserving array order at the end of the plan. Explicit per-item `sortOrder` is respected.
- **Reorder:** prefer `reorderPlanTasks` / MCP `reorder_plan_tasks` over delete-and-recreate when fixing Ralph execution order. Gap-based `updateTask(sortOrder)` supports mid-list inserts (e.g. 1500 between 1000 and 2000). Bulk reorder renumbers `1000, 2000, …` atomically in the given `taskIds` order.

#### Assignee rule

`assignee` on both **plans** and **tasks** must be either:

- A **GitHub username** (string; e.g. `visormatt`), or
- **`null` / undefined** when unassigned.

Do **not** use display names, email addresses, or other formats. All write paths (MCP tools, ingest, UI) must accept only a valid GitHub username or null; invalid values should be normalized or rejected.

**Enforcing GitHub username (MCP):** When `GITHUB_USER` or `OPENTHROTTLE_GITHUB_USER` is set, the **openthrottle-mcp** MCP uses that value for **author** and **assignee** on `create_plan`, `update_plan`, `create_task`, `create_tasks`, and `update_task`, so the agent cannot store a display name (e.g. `matt`) instead of the GitHub username (e.g. `visormatt`). Set one of these env vars in the MCP run environment to enforce.

For a strict, hyper-detailed PRD: provide all fields you care about. For rough ideas: use `/cortex/planning-mode` or MCP `create_plan` / `create_task`; the agent infers author (GitHub handle) when missing and always evaluates category (infer or confirm/adjust).

### PRD summarization (summary field)

The optional **summary** field on plans and tasks supports PRD summarization: next actions, usage guides, and wrap-up notes.

- **When to fill:** At plan or task completion, or when closing or pausing work (e.g. marking blocked).
- **What to include:**
  - **Plans:** Next actions for the plan, how to use what was built, or wsrap-up notes (e.g. "Run `pnpm run database:migrate` after pull; summary is optional on create/update.").
  - **Tasks:** Per-task wrap-up: follow-up actions, usage notes, or why the task is blocked (e.g. "Blocked on API key; document env in README when unblocked.").
- **How:** Use MCP `update_plan` or `update_task` with a `summary` argument, or set `summary` when creating plans/tasks. Ingest reads optional `metadata.summary` (plans) and `summary` from plan JSON so file-based and DB stay in sync.

### Agent conversations (web chat persistence)

Migration: `databases/migrations/051_create_agent_conversations_tables.sql`. GraphQL and `agentsRunChatTurn` integration: [applications/openthrottle-server/docs/agent-conversations-design.md](../applications/openthrottle-server/docs/agent-conversations-design.md). Frontend v1: [packages/react-router-chat/README.md](../packages/react-router-chat/README.md) § Persisted conversations.

**Purpose:** Postgres-backed threads for the developer web chat (`agentsRunChatTurn` + `@openthrottle/react-router-chat`). Stores ordered user/assistant messages, router LLM metadata, and MCP tool-turn audit for resumable sessions. **Strictly separate from `plan_output_stream`** — Ralph iteration logs stay in `plan_output_stream`; do not merge or duplicate Ralph output here.

| Table                         | Purpose                                        |
| ----------------------------- | ---------------------------------------------- |
| `agent_conversations`         | One row per thread; scoped to a human JWT user |
| `agent_conversation_messages` | Ordered messages within a thread               |

#### Foreign keys and delete rules

| Column                                        | FK target                 | ON DELETE                                                            |
| --------------------------------------------- | ------------------------- | -------------------------------------------------------------------- |
| `agent_conversations.user_id`                 | `users(id)`               | **CASCADE** — deleting a user removes their conversations            |
| `agent_conversations.plan_id`                 | `plans(id)`               | **SET NULL** — optional plan link cleared when plan is removed       |
| `agent_conversations.project_id`              | `projects(id)`            | **SET NULL** — optional project link cleared when project is removed |
| `agent_conversation_messages.conversation_id` | `agent_conversations(id)` | **CASCADE** — messages removed with the conversation row             |

There is **no `task_id` FK in v1**. No `parent_message_id` or tool-role rows on write in v1 (schema allows `system` \| `tool` roles for future use).

#### Lifecycle (archive-only v1)

- **`status`:** `active` (default) or `archived`. No `deleted_at`, no hard delete, no purge API in v1.
- **Title:** optional; auto-set from the first user message (~80 chars) on create when omitted; updatable via GraphQL `updateAgentConversationTitle`.

#### Message ordering and size caps

- **`sort_order`:** monotonic integer per conversation (not gap-based). User and assistant rows for one turn are written **consecutively** in a single transaction. Unique index on `(conversation_id, sort_order)`.
- **App-level caps** (enforced in `@openthrottle/nestjs-repositories`, not DB `CHECK`):
  - `content`: **256 KB** UTF-8 max; truncate with a metadata flag when clipped.
  - `tool_metadata` (JSONB on assistant rows): **64 KB** UTF-8 max; set `truncated: true` in the envelope when clipped.
- **Assistant denormalized columns:** `routing_tier`, `routing_confidence`, `routing_model`, `routing_reason`, plus `tool_metadata` for MCP audit. Conversation-level `model_provider` / `model_name` updated when the router LLM runs (null for heuristic-only routing).

#### Boundary vs `plan_output_stream`

| Concern             | `plan_output_stream`                | `agent_conversations`                                                |
| ------------------- | ----------------------------------- | -------------------------------------------------------------------- |
| Audience            | Ralph / workflow agents             | Human web chat (developer UI)                                        |
| Scope               | Per **plan**                        | Per **user**                                                         |
| Content             | Iteration logs, agent output chunks | User/assistant chat turns                                            |
| MCP read tools (v1) | Yes (append/get output)             | **Deferred** — follow-up plan `fbe54bc3-1a97-49b4-ad40-e9f55edcabb1` |

## Connecting

Using `psql`:

```bash
PGPASSWORD=openthrottle_password psql -h localhost -p 5556 -U openthrottle_user -d openthrottle
```

Connection string:

```bash
postgresql://openthrottle_user:openthrottle_password@localhost:5556/openthrottle
```

### MCP (OpenThrottle plans/tasks)

**@openthrottle/openthrottle-mcp** — The OpenThrottle (OT) MCP server. It talks to the backend **via GraphQL only** (openthrottle-server). No direct Postgres. Set `OPENTHROTTLE_AUTH_TOKEN` (or `OPENTHROTTLE_MCP_AUTH_TOKEN`) for authenticated requests. See `packages/openthrottle-mcp/README.md` and `.cursor/mcp.json`. Tools include plans, tasks, notes, commit links, activity, output stream, semantic search, and health. **Agent conversation read tools** (`list_conversations`, `get_conversation_messages`) are deferred to follow-up plan `fbe54bc3-1a97-49b4-ad40-e9f55edcabb1`; use GraphQL from the developer app in v1.

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
- For a fresh ingest (e.g. after dumping test data or changing source fsiles), run `pnpm run database:reset` then `pnpm run database:import`. Re-running ingest without reset is additive; duplicate plans may be inserted.
- After backing up and removing the `plans/` folder, the OpenThrottle database is the single source of truth; use MCP tools and Cursor `/cortex/*` commands to create and update plans/tasks. There is no re-export (DB → JSON) script yet; track the idea in OpenThrottle (e.g. a placeholder plan) if you want it later.

## Migrations

SQL migrations live in `databases/migrations/` and are applied in sfilename order by `pnpm run database:migrate`.

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
27. `033_add_users_disabled_at.sql` – Add `disabled_at` (TIMESTAMPTZ, nullable) to users for account suspension.
28. `034_create_roles_and_permissions_tables.sql` – RBAC tables: permissions, roles, role_permissions, user_roles. Seeded with admin/user/viewer roles and settings/users permissions.
29. `035_create_subscriptions_table.sql` – Subscriptions table for Stripe Hybrid payment integration (user_id FK, Stripe IDs, status, period dates).
30. `036_create_custom_prompts_table.sql` – Custom prompts table for AI workflow documents (agents, skills, commands, prompts, rules). Supports type/label tagging, file system path reference, user and project scoping, soft delete.
31. `037_create_custom_prompt_embeddings_table.sql` – Vector embeddings for custom prompt content (semantic search); same pattern as plan_embeddings.
32. `049_add_sort_order_to_tasks.sql` – Add `sort_order` (INTEGER NOT NULL) on tasks; backfill per plan by `created_at ASC` → 1000, 2000, …; unique index on `(plan_id, sort_order)` for deterministic ordering.
33. `051_create_agent_conversations_tables.sql` – `agent_conversations` and `agent_conversation_messages` for persisted web chat threads (user-scoped, archive-only v1). Monotonic `sort_order` per conversation; app-level caps on message `content` (256KB) and `tool_metadata` (64KB). Separate from `plan_output_stream`.

### Migration strategy (TypeORM vs SQL)

We keep **SQL files as the single source of truth** for schema. TypeORM is used only for **runtime** (connection pooling via DataSource, raw SQL in openthrottle-server and scripts; entities for type safety). We do **not** use TypeORM’s migration runner.

- **Applying schema changes:** Add a new numbered `.sql` file in `sdatabases/migrations/`, then run `pnpm run database:migrate`. The script `scripts/run-cortex-migrations.ts` runs all `.sql` files in filename order.
- **Keeping runtime in sync:** After adding or changing a migration, update TypeORM entities in `@openthrottle/nestjs-repositories` (and any scripts that use OpenThrottle Postgres) so they match the SQL schema. Entity JSDoc should reference the migration(s), e.g. “Matches databases/migrations (002, 012).”
- **Long-term rationale:** For pros/cons and a greenfield recommendation (SQL-as-source vs TypeORM migrations), see [docs/monorepo/migration-strategy-sql-vs-typeorm.md](../../docs/monorepo/migration-strategy-sql-vs-typeorm.md).
- **Why not TypeORM migrations:** We already have a long, ordered history osf SQL migrations and a single command (`database:migrate`) that applies them. Introducing TypeORM migrations would duplicate history or require a one-time conversion and a separate “migrations run” table. Keeping SQL as source of truth avoids two migration systems and keeps one readable, version-controlled history.
