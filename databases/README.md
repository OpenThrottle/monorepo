# OpenThrottle database

Postgres database for OpenThrottle plans, tasks, and documentation, with pgvector for semantic search. Plans and tasks are authored through openthrottle-mcp; the ingest scripts here load `docs/` and agent assets for semantic search.

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

   **Dev/start auto-migrates.** Booting the server locally (`openthrottle-server` `dev`/`dev-api`/`worker`/`start`) runs the `monorepo:ensure-migrations` Nx gate first: it waits briefly for Postgres, then applies any pending migrations (the same idempotent runner as `database:migrate`) against the DB the server connects to. If Postgres is unreachable it fails fast and tells you to run `pnpm run database:start`. `pnpm run database:migrate` above remains the manual/standalone entrypoint. The Docker path is unchanged and stays authoritative for container installs — migrations there are guaranteed by `Dockerfile.Migrations` + the compose `migrations` init service; the gate is dev/start-only.

   **Service account bootstrap:** Migration `045_seed_service_accounts_bootstrap.sql` creates `openthrottle-mcp` and `workflow-ralph` service accounts with roles `mcp` and `workflow-ralph` (`plans:read`, `plans:write`). Mint bearer tokens once:

   ```bash
   pnpm run database:bootstrap-service-accounts
   ```

   Copy the printed values into `OPENTHROTTLE_MCP_AUTH_TOKEN` (Cursor MCP / openthrottle-mcp) and `OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN` (BullMQ Ralph worker GraphQL). Format: `ot_sa_<prefix>_<secret>`. See [packages/openthrottle-mcp/docs/AUTH.md](../packages/openthrottle-mcp/docs/AUTH.md).

   **Backup (optional):** `pnpm run database:backup` writes `databases/backups/openthrottle-*.zip` (requires `pg_dump` and `zip` on PATH). For a daily BullMQ schedule on openthrottle-server, set `DATABASE_BACKUP_CRON`.

4. **Reset the database (optional, before a fresh ingest)**

   Truncates all openthrottle tables so a re-run of ingest does not create duplicate plans. Use when switching from test data to real data or when re-ingesting after changing source files:

   ```bash
   pnpm run database:reset
   ```

5. **Ingest agent assets into the documentation tables (optional)**

   Reads the skills, personas, prompts, and rules under `skills/` and `.agents/` and upserts them into the documentation tables. With `OPENAI_API_KEY` (or `OLLAMA_*`) set, also generates embeddings:

   ```bash
   pnpm run database:import-agent-assets
   ```

   > **There is no plans-from-filesystem ingest.** Plans and tasks are authored directly in OpenThrottle via the openthrottle-mcp tools (`create_plan` / `create_tasks`); there is no repo-root `plans/` directory and no `database:import` script. Do not look for one.

6. **Ingest docs/ and NX project READMEs into documentation tables (optional)**

   Reads all `.md` files under `docs/` and each NX project's `README.md` (from the NX project graph) and upserts into `documentation` and `documentation_embeddings`. Idempotent per (repo, sha, path). Docs use paths like `docs/foo.md`; project READMEs use `projects/<project-root>/README.md` (e.g. `projects/applications/openthrottle-developer/README.md`). With `OPENAI_API_KEY` set, generates embeddings. Optional env: `DOCS_REPO`, `DOCS_SHA`, `DOCS_AUTHORS` (comma-separated), `DOCS_MESSAGE`, `DOCS_PR_NUMBER` for source metadata (e.g. from docs-watch workflow):

   ```bash
   pnpm run database:import-docs
   ```

Plan JSON must have a `metadata` object (with `author` (GitHub handle), `category`, `title`) and a `tasks` array; files with other shapes (e.g. a bare array of task objects) are skipped and reported as errors.

## Schema

- **plans** – Plan metadata: `id`, `title`, `author`, `category`, `status`, `description`, `summary` (optional; PRD summarization: next actions, usage guides, wrap-up notes), `assignee` (optional; see [Assignee rule](#assignee-rule) below), `project_id` (optional, FK to projects; nullable), `completed_at` (TIMESTAMPTZ, nullable; set once on transition into COMPLETED by app write path; cleared if status leaves COMPLETED; not maintained by `updated_at` triggers — see migrations `055`, `056`), `created_at`, `updated_at`. In the OpenThrottle API, `projectId` is optional on create/update and in list filters; `projectRelation` is null when `projectId` is unset.
- **projects** – NX project reference for scoping plans/tasks: `id`, `name`, `nx_project_name` (TEXT; unique when not null per migration 032), `description`, `created_at`, `updated_at`. Only **NX applications** are kept; see [Projects collection (applications only)](#projects-collection-applications-only).
- **tasks** – Tasks for each plan: `id`, `plan_id` (FK), `title`, `description`, `category`, `status`, `requirements` (JSONB), `summary` (optional; per-task wrap-up: actions, usage notes, or why blocked), `assignee` (optional; see [Assignee rule](#assignee-rule) below), `sort_order` (INTEGER NOT NULL; explicit execution/list order within the plan; see [Task sort_order](#task-sort_order)), `completed_at` (TIMESTAMPTZ, nullable; same semantics as `plans.completed_at` — migrations `055`, `056`), `created_at`, `updated_at`.
- **plan_embeddings** – Vector embeddings for plan content: `id`, `plan_id` (FK), `content`, `embedding` (vector 1536), `metadata` (JSONB), `created_at`.
- **task_embeddings** – Vector embeddings for task content: `id`, `task_id` (FK), `content`, `embedding` (vector 1536), `metadata` (JSONB), `created_at`.
- **plan_output_stream** – Streaming output (e.g. agent iteration log) per plan: `id`, `plan_id` (FK), `iteration` (nullable), `content`, `created_at`. Chunks appended in order; exposed via MCP `append_plan_output` and `get_plan_output`.
- **notes** – Quick unstructured thoughts: `id`, `content`, `author` (optional, e.g. GitHub username), `created_at`, `updated_at`. Foundation for notes route and planning workflow (e.g. create plan from note); exposed via MCP `create_note`, `get_note`, `list_notes`, `update_note`, `delete_note`.
- **documentation** – Source-of-truth per doc file landed on main (from `docs/` and NX project READMEs): `id`, `path` (TEXT; path under repo, e.g. `docs/foo.md` or `projects/<project-root>/README.md`), `content` (TEXT; parsed full text or summary for display), `repo` (TEXT), `sha` (TEXT; squash commit SHA), `pr_number` (INTEGER, nullable), `authors` (JSONB; e.g. array of GitHub usernames or `[{ "login", "email" }]`), `message` (TEXT; commit message), `created_at`. One row per (repo, sha, path); unique on (repo, sha, path) for idempotent upsert/replace-by-sha.
- **documentation_embeddings** – Vector embeddings for doc chunks (semantic search): `id`, `documentation_id` (FK to documentation), `content` (TEXT; chunk text), `embedding` (vector 1536), `metadata` (JSONB), `created_at`. Same pattern as plan_embeddings / task_embeddings; HNSW index on embedding, GIN on metadata.
- **doc_ingestion_state** – Prior state for diff-based doc ingestion (BullMQ job): `scope` (TEXT), `path` (TEXT), `content_hash` (TEXT; e.g. SHA-256), `updated_at` (TIMESTAMPTZ). One row per (scope, path); primary key (scope, path). Used to determine to-add / to-update / to-remove when re-ingesting markdown. See `docs/openthrottle/doc-ingestion-job-spec.md` and migration `030_create_doc_ingestion_state_table.sql`.
- **users** – User accounts for auth and assignment: `id`, `created_at`, `updated_at`, `email` (TEXT, nullable; unique when set for login), `github_username` (TEXT NOT NULL), `password_hash` (TEXT, nullable; bcrypt for OpenThrottle local auth). See migrations `026_create_users_table.sql`, `031_add_users_password_hash_and_email_unique.sql`. Optional: table can be dropped and recreated with a stricter schema (e.g. email NOT NULL for new auth users); see migration 031 comments.
- **permissions** – RBAC permission definitions: `id`, `name` (TEXT, unique), `description` (TEXT, nullable), `created_at`. Seeded with `settings:read`, `settings:write`, `users:read`, `users:write` (migration 034), `plans:read`, `plans:write` (migration 045), and `flags:read`, `flags:write` (migration 085). **Convention — admin must stay the full superset:** any migration that INSERTs a new `permissions` row MUST also grant it to the `admin` role in the same migration (follow the `p.name IN (...)` pattern in `085_seed_rollout_flag_permissions.sql`). This mirrors the `@openthrottle/nestjs-rbac` contract `ROLE_PERMISSIONS[ADMIN] = Object.values(PERMISSIONS)` (`packages/nestjs-rbac/src/roles.ts`). Do NOT rely on migration 034's `CROSS JOIN permissions` admin grant to pick up your new permission — that grant is a **point-in-time snapshot** and only covers permissions that existed when 034 ran. Migration 045 hit exactly this trap (it added `plans:*` but granted only the `mcp`/`workflow-ralph` roles, so admin silently lost `plans:read`/`plans:write` on any DB migrated forward from 034); `092_grant_admin_all_permissions.sql` backfills it. The `check:rbac-admin-coverage` gate (`scripts/check-admin-permission-coverage.ts`, part of `check:local`) statically fails CI if any defined permission is never granted to admin.
- **roles** – RBAC roles: `id`, `name` (TEXT, unique), `description` (TEXT, nullable), `created_at`, `updated_at`. Seeded with `admin`, `user`, `viewer` (034) and automation roles `mcp`, `workflow-ralph` (045).
- **role_permissions** – Join table role_id ↔ permission_id (many-to-many). See migration 034.
- **user_roles** – Join table user_id ↔ role_id (many-to-many). See migration 034.
- **service_accounts** – Machine/service actors for system-to-system auth (MCP, CI, workers): `id`, `name` (unique), `description`, `disabled_at`, `created_at`. Bearer tokens use prefix `ot_sa_`. See migration `044_create_service_accounts_tables.sql`.
- **service_account_credentials** – Hashed secrets for service accounts: `id`, `service_account_id` (FK), `prefix` (unique; lookup key in bearer token), `secret_hash`, `label`, `expires_at`, `last_used_at`, `revoked_at`, `created_at`. Plaintext secret returned only at create time.
- **service_account_roles** – Join table service_account_id ↔ role_id (many-to-many; same `roles` as humans). See migration 044.
- **subscriptions** – Stripe subscription state for OpenThrottle payments: `id`, `user_id` (FK), `stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id`, `status`, `current_period_start`, `current_period_end`, `cancel_at_period_end`, `created_at`, `updated_at`. See migration `035_create_subscriptions_table.sql`.
- **custom_prompts** – Custom prompt documents for AI workflow customization (Agents.md, skills, commands, prompts, rules): `id`, `title`, `content`, `description` (optional), `prompt_type` (enum-like: agents, skills, commands, prompts, rules), `labels` (JSONB array of strings), `file_path` (optional; path relative to workspace), `user_id` (optional FK to users), `project_id` (optional FK to projects), `deleted_at` (soft delete), `created_at`, `updated_at`. See migration `036_create_custom_prompts_table.sql`.
- **custom_prompt_embeddings** – Vector embeddings for custom prompt content (semantic search): `id`, `custom_prompt_id` (FK), `content`, `embedding` (vector 1536), `metadata` (JSONB), `created_at`. Same pattern as plan_embeddings / documentation_embeddings. See migration `037_create_custom_prompt_embeddings_table.sql`.
- **project_skills** – Per-project skill registry: the server-queryable universe of skills most recently ingested for a project's linked repository, distinct from the semantic `custom_prompts` store. `id`, `project_id` (FK to projects, ON DELETE CASCADE), `slug` (kebab-case), `tags` (`TEXT[]`, default `{}`), `disable_model_invocation` (BOOLEAN, **nullable** — preserves the frontmatter tri-state `true`/`false`/unset), `source_path` (repo-relative SKILL.md path), `ingested_at`, `created_at`, `updated_at`; `UNIQUE(project_id, slug)`. Written by the agent-asset ingest path (`scripts/openthrottle-ingest-agent-assets.ts` for the dogfood `monorepo` project; `ProjectSkillsService.reconcileProjectSkills` is the reusable write interface) and read by `ProjectSkillsService.getSkillsForProject`. See migration `061_create_project_skills.sql` and `docs/monorepo/skill-availability-design.md`.
- **code_embeddings** – Source-code chunk embeddings backing the `@openthrottle/openthrottle-ide` engine's `VectorStore` for `/ide` code semantic search. **Different shape** from the FK+metadata embedding tables above: `id` (TEXT PK; content-derived chunk id `hashContent(path + content)`, idempotent upsert key), `workspace_root` (TEXT; absolute repo path, scopes the store), `path` (TEXT; workspace-relative POSIX), `start_line`/`end_line` (1-based inclusive), `content` (TEXT), `content_hash` (TEXT; sha256), `embedding` (vector 1536), `created_at`. No FK/metadata. See migration `052_create_code_embeddings_table.sql`.
- **code_index_snapshots** – Per-workspace file-hash snapshot enabling **incremental** code re-indexing. One row per `workspace_root` (TEXT PK), a `snapshot` (JSONB; the engine `hashWorkspace` output — an array of `{ path, hash }`), and `updated_at` (TIMESTAMPTZ). Before each index, `CodeSearchService` (in `@openthrottle/nestjs-vector-search`) loads the prior snapshot and diffs it against a fresh scan (engine `diffSnapshots`) so only added/changed files are re-embedded and removed files are dropped via `indexWorkspace({ diff })`; with no prior snapshot it does a FULL index. The snapshot is persisted only after a successful index. See migration `054_create_code_index_snapshots_table.sql`.
- **user_workspace_settings** – Per-user workspace profile (Settings → Workspace): `user_id` (PK, FK to users), `contact_display_name`, `contact_email`, `enabled_editors` (JSONB array of editor ids, e.g. `cursor`, `vscode`), `created_at`, `updated_at`. See migration `042_create_workspace_settings_tables.sql` and `applications/openthrottle-server/docs/workspace-settings-graphql-design.md`.
- **workspace_local_repositories** – Local filesystem checkouts registered by a user: `id`, `user_id` (FK), `filesystem_path` (absolute; unique per user), `display_name`, `git_remote_url`, `git_default_branch`, `project_id` (optional FK to projects), `created_at`, `updated_at`. See migration 042 and workspace-settings GraphQL design doc.
- **agent_conversations** – Persisted web chat/agent threads (human JWT user-scoped): `id`, `user_id` (FK to users, ON DELETE CASCADE), `title` (optional; auto from first user message ~80 chars), `status` (`active` \| `archived`; archive-only in v1, no hard delete), `plan_id` (optional FK, ON DELETE SET NULL), `project_id` (optional FK, ON DELETE SET NULL), `model_provider`, `model_name` (router LLM snapshot per persist turn; null for heuristic-only routing), `metadata` (JSONB), `created_at`, `updated_at`. Strictly separate from **plan_output_stream** (Ralph logs). See migration `051_create_agent_conversations_tables.sql`.
- **agent_conversation_messages** – Ordered messages within a conversation: `id`, `conversation_id` (FK, ON DELETE CASCADE), `role` (`user` \| `assistant` \| `system` \| `tool`; v1 writes user + assistant only), `content` (TEXT; **app cap 256KB** on insert), `sort_order` (INTEGER NOT NULL; monotonic per conversation; user+assistant consecutive per turn in one txn), denormalized assistant routing columns (`routing_tier`, `routing_confidence`, `routing_model`, `routing_reason`), `tool_metadata` (JSONB; **app cap 64KB**; set `truncated` in envelope when clipped), `created_at`. No `task_id` or `parent_message_id` in v1.
- **plan_runs** – The "we're kicking off a run" record: one row per enqueue/CLI-start (`id`, `plan_id`, `bullmq_job_id` nullable for detached-CLI, `run_kind`, `status`, `run_config_snapshot` JSONB, run-location `hostname`/`pid`/`worker_id`, `cancel_requested_at`/`by`, `last_heartbeat_at`). **Run provenance** (migration `087`, promoted from scattered/JSONB to first-class queryable columns): `execution_backend` (the agent/CLI), `branch` (TEXT; git branch the run operates on — captured at kickoff as a **required enqueue input**, never inferred server-side; nullable only for legacy/backfilled rows), `model` (TEXT; resolved agent model id, projection of `run_config_snapshot.ralph.model`), `checkout_id` (UUID FK → `repository_checkouts(id)` ON DELETE SET NULL; the run's durable on-disk home whose `filesystem_path` powers "open in editor" deep-links). Migration `088` best-effort backfills `model`/`checkout_id` from the snapshot JSONB. The linked PR is NOT a column — it hangs off the run's work-ledger session (`work_sessions.plan_run_id → work_artifacts type='pull_request'`) and is exposed via the `PlanRunObject.pullRequest` resolver.
- **repository_checkouts** – Per-user on-disk instance of a repository (see migration `078`): `id`, `repository_id` (FK), `user_id` (FK), `filesystem_path`, `display_name`, `managed`, `kind` (`'primary'` \| `'worktree'`), `inspection` (JSONB cache), `scanned_at`. `kind='worktree'` is written when a linked worktree is registered (its `.git` is a file pointer) and is what `plan_runs.checkout_id` references for run provenance.

Indexes include HNSW vector indexes on embedding columns for similarity search.

**Removed tables.** `commit_links` (git commit ↔ plan/task linkage, migration `006`) was **dropped** by `075_drop_commit_links.sql`. Commit provenance now lives on the work ledger as a `git_commit` artifact — see [Recording merged commits on the work ledger](#recording-merged-commits-on-the-work-ledger-option-a-workflow).

### Indexes

Indexes are created by migrations in `databases/migrations/`. Main tables and their indexes:

- **plans** – `idx_plans_status`, `idx_plans_category`, `idx_plans_author`, `idx_plans_created_at`, `idx_plans_assignee` (partial), `idx_plans_updated_at`, `idx_plans_status_created_at`, `idx_plans_status_updated_at`, `idx_plans_title_trgm` (GIN, pg_trgm for ILIKE). See `002_create_plans_table.sql`, `012_add_assignee_to_plans_and_tasks.sql`, `017_add_plans_list_sort_indexes.sql`, `018_plans_title_trgm.sql`.
- **tasks** – `idx_tasks_plan_id`, `idx_tasks_status`, `idx_tasks_category`, `idx_tasks_created_at`, `idx_tasks_requirements` (GIN), `idx_tasks_assignee` (partial), `idx_tasks_plan_id_sort_order` (unique on `plan_id`, `sort_order`). See `003_create_tasks_table.sql`, `012_add_assignee_to_plans_and_tasks.sql`, `049_add_sort_order_to_tasks.sql`.
- **plan_embeddings** – `idx_plan_embeddings_plan_id`, `idx_plan_embeddings_vector` (HNSW cosine), `idx_plan_embeddings_metadata` (GIN). See `004_create_plan_embeddings_table.sql`.
- **task_embeddings** – `idx_task_embeddings_task_id`, `idx_task_embeddings_vector` (HNSW cosine), `idx_task_embeddings_metadata` (GIN). See `005_create_task_embeddings_table.sql`.
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
- **code_embeddings** – `idx_code_embeddings_workspace_path` (btree on `(workspace_root, path)`; scopes `clear`/`deleteByPaths`), `idx_code_embeddings_vector` (HNSW cosine). No metadata/GIN index. See migration `052_create_code_embeddings_table.sql`.
- **agent_conversations** – `idx_agent_conversations_user_status_updated_at` (user_id, status, updated_at DESC), `idx_agent_conversations_plan_id` (partial WHERE plan_id IS NOT NULL). See migration `051_create_agent_conversations_tables.sql`.
- **agent_conversation_messages** – `idx_agent_conversation_messages_conversation_sort_order` (unique on conversation_id, sort_order). See migration `051_create_agent_conversations_tables.sql`.
- **plan_runs** – `idx_plan_runs_inprogress_heartbeat` (partial WHERE status='IN_PROGRESS'; staleness sweep), `idx_plan_runs_checkout_id` and `idx_plan_runs_branch` (both partial WHERE NOT NULL; the checkout join target and the branch→PR lookup for run provenance). See migrations `080`, `087`.

**When to add new indexes:** Add a new migration when you introduce a **new filter or sort column** used by openthrottle-mcp (via GraphQL), openthrottle-server, or the OpenThrottle app (e.g. a new WHERE or ORDER BY), or a **new query pattern** that would benefit from a composite or partial index. Prefer composite indexes for common filter+sort combinations (e.g. status + created_at). For substring/ILIKE search on text, consider `pg_trgm` and a GIN index (see `018_plans_title_trgm.sql`). Audit notes: `databases/INDEX_AUDIT.md`.

### Embedding dimension strategy (OpenAI and Ollama)

Embedding tables (`plan_embeddings`, `task_embeddings`, `documentation_embeddings`, `custom_prompt_embeddings`, `code_embeddings`) use **vector(1536)**. The default flow uses **OpenAI** (e.g. `text-embedding-3-small`), which outputs 1536 dimensions. This flow is unchanged and remains the default when `OPENAI_API_KEY` is set and Ollama env is not.

**Ollama (optional, additive):** When `OLLAMA_BASE_URL` or `OLLAMA_EMBEDDING_MODEL` is set, the ingest scripts and openthrottle-server can use **Ollama** for local embeddings. When neither is set, the existing OpenAI flow (e.g. `OPENAI_API_KEY`) is used. Env: `OLLAMA_BASE_URL` (default `http://localhost:11434`), `OLLAMA_EMBEDDING_MODEL` (e.g. `nomic-embed-text`). See root `.env.default` and `scripts/ollama.ts (pnpm run ollama:pull)`. **When using Caddy** (tools/caddy), set `OLLAMA_BASE_URL` to the Caddy-proxied URL (e.g. `https://ollama.local` or `https://localhost/ollama`) so the ingest scripts and other consumers use the same endpoint. For HTTPS with Caddy's local certs, see `docs/monorepo/Ollama.md` and tools/caddy/README.md (TLS/trust store). Ollama models (e.g. `nomic-embed-text`, `mxbai-embed-large`) may output a different dimension. Strategy:

- **Option A — Same dimension (recommended for simplicity):** Use an Ollama model that outputs **1536** dimensions so the existing schema and migrations stay as-is. No migration; same tables and indexes. Re-ingest with Ollama when switching; no mixed-dimension storage. **OpenThrottle ingest and openthrottle-server only insert embeddings when the vector length is 1536;** if the chosen Ollama model returns a different dimension, embeddings are skipped (no error). Known Ollama embedding model dimensions: `nomic-embed-text` 768, `mxbai-embed-large` 1024, `all-minilm` 384. As of the current Ollama library, none of these output 1536; for Option A with OpenThrottle, use **OpenAI** (`OPENAI_API_KEY`) for embeddings, or use an Ollama model that outputs 1536 when one becomes available.
- **Option B — Different dimension (future):** If we support Ollama models with a different dimension, add an **optional** path only: e.g. configurable dimension from env, or a separate table/column for Ollama-backed embeddings, **without** altering existing `vector(1536)` columns or current OpenAI flow. Document re-ingest and any new migrations if this path is added.

Do **not** change existing `vector(1536)` columns or remove the OpenAI code path. Additive only.

### Recording merged commits on the work ledger (Option A workflow)

We use **Option A:** record only the **squash commit after a PR is merged**. The repo keeps 1 PR = 1 commit on main (squash-and-merge); OpenThrottle records that single SHA as a work-ledger `git_commit` artifact so "what landed" matches the repo. (The legacy `link_commit` MCP tool is gone and its `commit_links` table was **dropped** by migration `075_drop_commit_links.sql` — work-ledger epic 3b798682. Migration 069 backfilled every valid row into a `git_commit` ledger artifact first.)

- **When to record:** Only **after** a PR is merged. Use the **squash commit SHA** (the one that appears on the default branch), not pre-merge commits from the branch. If the branch uses a merge queue, `gh pr merge --auto` can return while the PR is only **queued**; wait until `gh pr view --json mergedAt,mergeCommitSha` shows the landed commit (or read the SHA from the default branch) before recording the artifact. Do **not** record commit artifacts during the Ralph loop or while the PR is open.
- **How activity tools use it:** `get_activity_by_date` and `get_last_activity` read the work ledger. The artifact is recorded `unverified` and the git verifier promotes it to `landed`/`verified`, so activity reflects **landed work only** (commits that exist on main). Pre-merge branch history is not in OpenThrottle.
- **Day-to-day workflow:**
  - **Commit as you complete tasks:** During Ralph (or any plan execution), commit and push after each task or logical chunk. Use conventional commits (e.g. `feat(openthrottle): document commit workflow`). In the commit body or footer, include `Plan-Id: <uuid>` and `Task-Id: <uuid>` for traceability. Do **not** record a commit artifact for these commits—they are normal branch commits. Only after the PR is merged, record the squash commit once (see below).
  - **Ralph / agent:** While executing tasks, commit and push as above; do **not** record commit artifacts. After the PR is merged, record the squash commit once (see below).
  - **After merge:** Either run the one-shot CLI:
    `pnpm exec workflow-link-merge --plan <id> --sha <squash-sha> --repo <owner/repo>`
    (optional: `--message`, `--task`), or call the MCP ledger tools directly — `attach_session_subject(planId, taskId?)` then `record_artifact(type: "git_commit", payloadJson: {repo, sha}, message?)` under an open session.
    This records the landed default-branch commit on the ledger and powers activity-by-date and last-activity for the plan/task.

### Plan and task attributes (PRD mapping)

When creating or ingesting plans and tasks (e.g. from a strict PRD or via `/openthrottle/planning-mode`), use this mapping. Timestamps are always handled by the DB; the agent infers author (GitHub handle) when missing and always evaluates category (infer when missing, or confirm/adjust when provided so it fits the plan).

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
pnpm exec tsx ./scripts/cleanup-openthrottle-projects-apps-only.ts [--dry-run]
```

Asfter cleanup, run `pnpm run database:migrate` so migration `032_projects_unique_nx_project_name.sql` enforces at most one project per `nx_project_name`.

To **link plans/tasks that have no project** to an existing project when the title clearly matches (no new projects created):

```bash
pnpm exec tsx ./scripts/link-openthrottle-plans-tasks-to-existing-projects.ts [--dry-run]
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

For a strict, hyper-detailed PRD: provide all fields you care about. For rough ideas: use `/openthrottle/planning-mode` or MCP `create_plan` / `create_task`; the agent infers author (GitHub handle) when missing and always evaluates category (infer or confirm/adjust).

### PRD summarization (summary field)

The optional **summary** field on plans and tasks supports PRD summarization: next actions, usage guides, and wrap-up notes.

- **When to fill:** At plan or task completion, or when closing or pausing work (e.g. marking blocked).
- **What to include:**
  - **Plans:** Next actions for the plan, how to use what was built, or wsrap-up notes (e.g. "Run `pnpm run database:migrate` after pull; summary is optional on create/update.").
  - **Tasks:** Per-task wrap-up: follow-up actions, usage notes, or why the task is blocked (e.g. "Blocked on API key; document env in README when unblocked.").
- **How:** Use MCP `update_plan` or `update_task` with a `summary` argument, or set `summary` when creating plans/tasks. The database is the source of truth; there is no plan JSON to keep in sync.

### Agent conversations (web chat persistence)

Migration: `databases/migrations/051_create_agent_conversations_tables.sql`. GraphQL and `agentsRunChatTurn` integration: [applications/openthrottle-server/docs/agent-conversations-design.md](../applications/openthrottle-server/docs/agent-conversations-design.md). Frontend v1: [packages/react-router-chat/README.md](../packages/react-router-chat/README.md) § Persisted conversations. **MCP read tools** (Cursor/agents): [packages/openthrottle-mcp/README.md](../packages/openthrottle-mcp/README.md) § Agent conversation read tools and [agent-conversation-read-tools-contract.md](../packages/openthrottle-mcp/docs/agent-conversation-read-tools-contract.md).

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

| Concern        | `plan_output_stream`                    | `agent_conversations`                                                                                              |
| -------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Audience       | Ralph / workflow agents                 | Human web chat (developer UI)                                                                                      |
| Scope          | Per **plan**                            | Per **user**                                                                                                       |
| Content        | Iteration logs, agent output chunks     | User/assistant chat turns                                                                                          |
| MCP read tools | `get_plan_output`, `append_plan_output` | `agent_conversation_list`, `agent_conversation_get`, `agent_conversation_get_messages` (human JWT only; read-only) |

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

**@openthrottle/openthrottle-mcp** — The OpenThrottle (OT) MCP server. It talks to the backend **via GraphQL only** (openthrottle-server). No direct Postgres. Set `OPENTHROTTLE_AUTH_TOKEN` (or `OPENTHROTTLE_MCP_AUTH_TOKEN`) for authenticated requests. See [packages/openthrottle-mcp/README.md](../packages/openthrottle-mcp/README.md) and `.cursor/mcp.json`. Tools include plans, tasks, notes, commit links, activity, output stream, semantic search, health, and **agent conversation read tools** (`agent_conversation_list`, `agent_conversation_get`, `agent_conversation_get_messages`) for persisted web chat threads — **human JWT only**, user-scoped, read-only. Use `get_plan_output` / `append_plan_output` for Ralph logs, not conversation tools. Contract: [packages/openthrottle-mcp/docs/agent-conversation-read-tools-contract.md](../packages/openthrottle-mcp/docs/agent-conversation-read-tools-contract.md). Prerequisite: v1 persistence (plan `4fa6d16c`); MCP write tools deferred until `AGENTS_CHAT_ALLOW_MUTATIONS`.

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
SELECT t.id, t.title, t.status FROM tasks t JOIN plans p ON t.plan_id = p.id WHERE p.title LIKE '%openthrottle%' ORDER BY t.title;
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

## Migration from file-based storage (completed)

The `plans/` folder and its JSON-import script are **gone**. The OpenThrottle
database is the single source of truth for plans and tasks; create and update
them with the openthrottle-mcp tools (`create_plan`, `create_tasks`,
`update_task`) or the `/ot/*` commands. There is no re-export (DB → JSON)
script, and none is planned.

- For a fresh ingest (e.g. after dumping test data or changing source files), run `pnpm run database:reset` then re-run the ingest scripts you need (`database:import-docs`, `database:import-agent-assets`). Re-running ingest without reset is additive.

## Local Postgres data volumes & seeding

The local Postgres runs in Docker (compose service `postgres`) on a named volume. For the public repo we keep two interchangeable volumes and seed a fresh/public database from scripts rather than a committed dump.

### Seeding a fresh / public database

There is **no committed SQL seed**. A developer's `databases/seed.sql` is a full `pg_dump` of their own database (personal plans/tasks/notes plus password and service-account credential hashes), so it is gitignored and never enters the repo. A locally-generated `databases/seed.sql` is still baked into that developer's own postgres image (via the `.dockerignore` re-include) for fast personal restores — it just stays local.

A fresh/empty volume is populated by scripts, in order:

```bash
pnpm run database:start                       # bring postgres up (fresh volume → empty)
pnpm run database:migrate                     # apply SQL migrations (schema + ledger)
pnpm run database:bootstrap-default-user      # developer@openthrottle.ai / FullThrottle2026!
pnpm run database:bootstrap-service-accounts  # mint the service-account token (printed once)
```

`bootstrap-service-accounts` prints a new token exactly once; put it in your root `.env` (and `applications/openthrottle-server/.env`) as `OPENTHROTTLE_MCP_AUTH_TOKEN` so the MCP server and CLIs authenticate against the fresh database.

Both bootstrap scripts also write a durable copy of their values (the minted tokens plus the default-user email/password and developer/admin login URLs) to a git-ignored `.bootstrap-secrets.local` at the repo root. If you miss the once-only stdout, recover the values from that file instead of revoking and re-minting. The file is local-only and never committed (same rationale as `databases/seed.sql`); to rotate a token, revoke it via admin GraphQL, delete its line in the file, and re-run `bootstrap-service-accounts`.

### Bootstrapping a fully-Dockerized install (default user + service accounts)

The host flow above assumes a local pnpm/node toolchain. A **fully-Dockerized** install (`docker compose up --build`) has none, and `docker compose up` deliberately runs **no** bootstrap — provisioning a (possibly shared) database is always an explicit, manual step. On `up`, the `migrations` service applies the schema; the login user and the service-account bearer credentials are provisioned once by the manually-invoked `bootstrap` service (`docker compose run --rm bootstrap`). There is **no** `server depends_on bootstrap`.

The token variable names are identical in both worlds: `OPENTHROTTLE_MCP_AUTH_TOKEN` and `OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN`.

#### A. Fully in Docker (local, fresh volume)

1. Generate a service-account token. It must be a valid `ot_sa_<prefix>_<secret>` token — **not** `openssl rand -hex 32`, which is not a valid service-account token and fails auth:

   ```bash
   node -e "const c=require('node:crypto');const a='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';const r=n=>Array.from(c.randomBytes(n),b=>a[b%a.length]).join('');console.log('ot_sa_'+r(12)+'_'+r(32))"
   ```

2. Paste it into `.env` as `OPENTHROTTLE_MCP_AUTH_TOKEN=`, and repeat (a **separate** token) for `OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN=`.

3. Bring the stack up (postgres → migrations → server → developer). `bootstrap` does **not** run here:

   ```bash
   docker compose up --build
   ```

4. Provision the login user + service-account credentials (one-shot):

   ```bash
   docker compose run --rm bootstrap
   ```

5. Log into the developer app (`${OPENTHROTTLE_DEVELOPER_APP_URL}`) with `developer@openthrottle.ai` / `FullThrottle2026!`.

6. Verify the MCP token authenticates — expect HTTP `200`, not `401`:

   ```bash
   curl -s -o /dev/null -w '%{http_code}\n' \
     -H "authorization: Bearer ${OPENTHROTTLE_MCP_AUTH_TOKEN}" \
     -H 'content-type: application/json' \
     -d '{"query":"{ plans { id } }"}' \
     "${OPENTHROTTLE_SERVER_APP_URL}/graphql"
   ```

Re-running `docker compose run --rm bootstrap` is a safe idempotent no-op: the user keeps its password, and a token that already verifies is left unchanged.

**Reaching openthrottle-mcp in a fully-Dockerized install:** there is no host Node to run the stdio launcher, so bring up the `mcp` container instead — `docker compose --profile prod up mcp` — a streamable-HTTP MCP server you register by URL (`{ "type": "http", "url": "http://localhost:${OPENTHROTTLE_MCP_PORT}/mcp" }`). It requires the `ot_sa_` token provisioned above and **fails loudly at startup** if it is missing/invalid. Full registration (auth, worktree ports, hybrid) is in [docs/openthrottle/mcp-registration.md § HTTP transport](../docs/openthrottle/mcp-registration.md#http-transport-docker-native).

#### B. Shared / real Postgres + Redis instance

Use the same token-generation step (A.1), stored in your team secret store and pasted into each developer's `.env`. Then, **once per shared database**:

1. Point `.env` at the shared DB (`POSTGRES_HOST`/`POSTGRES_PORT`/`POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB`).

2. Seed a **real admin** instead of the demo default by setting these in `.env` before running bootstrap:

   ```bash
   OPENTHROTTLE_BOOTSTRAP_USER_EMAIL=admin@yourco.com
   OPENTHROTTLE_BOOTSTRAP_USER_PASSWORD=<a strong password>
   ```

3. Run the one-time provisioning:

   ```bash
   docker compose run --rm bootstrap
   ```

This is a one-time provisioning step per shared DB; re-running is a safe idempotent no-op. The host `setup.sh` / `pnpm database:bootstrap-*` path (above) stays intact for non-Docker installs.

### Swapping the data volume (personal ↔ public)

Two named Docker volumes hold interchangeable databases:

- `openthrottle_postgres_data` — the **fresh/public demo** DB (active by default).
- `openthrottle_postgres_data_dev_personal` — an **archive of your pre-public personal** DB.

Both are declared in `docker-compose.yml`; the `postgres` service mounts exactly one, chosen by a one-line comment toggle in its `volumes:` block. The mount path (`/var/lib/postgresql`, PG18), credentials, and ports are identical for both, so nothing else changes. To switch:

```bash
docker compose stop postgres   # quiesce (NOT `down -v`, which destroys BOTH volumes)
# In docker-compose.yml → postgres.volumes, comment the active line and
# uncomment the other:
#   - postgres_data_dev_personal:/var/lib/postgresql   # 🔒 personal archive
#   - postgres_data:/var/lib/postgresql                # 🌱 fresh/public
docker compose up -d postgres   # start on the newly-selected volume
```

> ⚠️ **Never run `docker compose down -v`.** The `-v` deletes **both** named volumes, wiping the personal archive. Use `docker compose stop postgres` to swap safely.

To (re)create the personal archive from a running personal DB, stop postgres and copy the volume (Postgres must be stopped so the data directory is quiescent):

```bash
docker compose stop postgres
docker volume create openthrottle_postgres_data_dev_personal
docker run --rm \
  -v openthrottle_postgres_data:/from:ro \
  -v openthrottle_postgres_data_dev_personal:/to \
  alpine sh -c 'cd /from && cp -a . /to'
```

## Migrations

SQL migrations live in `databases/migrations/` and are applied in filename order by `pnpm run database:migrate`.

### Run-once / idempotent (schema_migrations ledger)

`pnpm run database:migrate` is **run-once and idempotent** — running it repeatedly is safe and, once the database is up to date, a no-op. Applied migrations are tracked in a `schema_migrations` ledger (`filename` PRIMARY KEY, `applied_at`, `checksum`):

- **Skip / apply:** On each run the runner reads the ledger, skips any file already recorded, and applies only new files in filename order. Each migration and its ledger insert run in a **single transaction**, so a failed migration rolls back cleanly (recorded as _not_ applied) and is retried on the next run.
- **Bootstrap (existing DBs):** The first run against a database that already has the schema (empty ledger **and** core tables like `plans`/`tasks` present) seeds the ledger with all current migration filenames as already-applied and runs nothing — historical data migrations are never re-executed against populated data. A genuinely fresh database (no core tables) applies every migration normally.
- **No-op guarantee:** Two `database:migrate` runs in a row leave data untouched — in particular `plans`/`tasks` `updated_at`, `author`, and `assignee` are unchanged. (This closes the previous non-idempotent behavior, where re-running re-stamped `updated_at` across all rows via the `BEFORE UPDATE` triggers and skewed `daily_stats` completion dates.)
- **Adding a migration:** Drop a new `NNN_*.sql` file into `databases/migrations/`; it is picked up and applied exactly once on the next `database:migrate`. Do **not** edit an already-applied migration in place — the runner warns (does not fail) on checksum drift; revert the edit or add a new migration instead.

When using **Option A** (Ollama with a 1536-dim embedding model), no additional migration or schema change is required; existing embedding tables (`plan_embeddings`, `task_embeddings`, `documentation_embeddings`) and their `vector(1536)` columns stay as-is. See [Embedding dimension strategy (OpenAI and Ollama)](#embedding-dimension-strategy-openai-and-ollama).

1. `001_enable_pgvector.sql` – Enable pgvector extension.
2. `002_create_plans_table.sql` – Plans table and indexes.
3. `003_create_tasks_table.sql` – Tasks table and FK to plans.
4. `004_create_plan_embeddings_table.sql` – Plan embeddings and vector index.
5. `005_create_task_embeddings_table.sql` – Task embeddings and vector index.
6. `006_create_commit_links_table.sql` – Commit links (plan/task ↔ repo/sha). **Table dropped by `075_drop_commit_links.sql`; it is not part of the current schema.**
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
26. `032_projects_unique_nx_project_name.sql` – Unique partial index on `projects(nx_project_name)` WHERE nx_project_name IS NOT NULL; run after `scripts/cleanup-openthrottle-projects-apps-only.ts` so duplicates are merged first.
27. `033_add_users_disabled_at.sql` – Add `disabled_at` (TIMESTAMPTZ, nullable) to users for account suspension.
28. `034_create_roles_and_permissions_tables.sql` – RBAC tables: permissions, roles, role_permissions, user_roles. Seeded with admin/user/viewer roles and settings/users permissions.
29. `035_create_subscriptions_table.sql` – Subscriptions table for Stripe Hybrid payment integration (user_id FK, Stripe IDs, status, period dates).
30. `036_create_custom_prompts_table.sql` – Custom prompts table for AI workflow documents (agents, skills, commands, prompts, rules). Supports type/label tagging, file system path reference, user and project scoping, soft delete.
31. `037_create_custom_prompt_embeddings_table.sql` – Vector embeddings for custom prompt content (semantic search); same pattern as plan_embeddings.
32. `049_add_sort_order_to_tasks.sql` – Add `sort_order` (INTEGER NOT NULL) on tasks; backfill per plan by `created_at ASC` → 1000, 2000, …; unique index on `(plan_id, sort_order)` for deterministic ordering.
33. `051_create_agent_conversations_tables.sql` – `agent_conversations` and `agent_conversation_messages` for persisted web chat threads (user-scoped, archive-only v1). Monotonic `sort_order` per conversation; app-level caps on message `content` (256KB) and `tool_metadata` (64KB). Separate from `plan_output_stream`.
34. `052_create_code_embeddings_table.sql` – `code_embeddings` table backing the `@openthrottle/openthrottle-ide` engine `VectorStore` for `/ide` code semantic search (content-derived TEXT id, `workspace_root` scoping, `path`, line range, `content`, `content_hash`, `embedding` vector(1536)). HNSW vector index + `(workspace_root, path)` btree.
35. `054_create_code_index_snapshots_table.sql` – `code_index_snapshots` table (one row per `workspace_root`; `snapshot` JSONB = engine `hashWorkspace` output, `updated_at`) enabling **incremental** code re-indexing: `CodeSearchService` diffs the prior snapshot (engine `diffSnapshots`) so only added/changed files are re-embedded and removed files dropped, falling back to a FULL index when no snapshot exists.
36. `055_add_completed_at_to_plans_and_tasks.sql` – Add nullable `completed_at` (TIMESTAMPTZ) on `plans` and `tasks` with partial indexes; app write path only (not `updated_at` triggers). No backfill.
37. `056_backfill_completed_at_and_recompute_daily_stats.sql` – Best-effort `completed_at = updated_at` for currently-COMPLETED rows (triggers disabled so `updated_at` is not re-stamped); recompute `daily_stats.plans_completed` / `tasks_completed` from UTC day buckets of `completed_at`. **Caveat:** rows whose `updated_at` was mass-rewritten by pre-ledger `database:migrate` runs have completion dates collapsed onto the migrate-run day — not recoverable.

### Migration strategy (TypeORM vs SQL)

We keep **SQL files as the single source of truth** for schema. TypeORM is used only for **runtime** (connection pooling via DataSource, raw SQL in openthrottle-server and scripts; entities for type safety). We do **not** use TypeORM’s migration runner.

- **Applying schema changes:** Add a new numbered `.sql` file in `databases/migrations/`, then run `pnpm run database:migrate`. The script `scripts/openthrottle-database-migrations.ts` applies not-yet-recorded `.sql` files in filename order and records each in the `schema_migrations` ledger (see [Run-once / idempotent](#run-once--idempotent-schema_migrations-ledger)).
- **Keeping runtime in sync:** After adding or changing a migration, update TypeORM entities in `@openthrottle/nestjs-repositories` (and any scripts that use OpenThrottle Postgres) so they match the SQL schema. Entity JSDoc should reference the migration(s), e.g. “Matches databases/migrations (002, 012).”
- **Why not TypeORM migrations:** We already have a long, ordered history osf SQL migrations and a single command (`database:migrate`) that applies them. Introducing TypeORM migrations would duplicate history or require a one-time conversion and a separate “migrations run” table. Keeping SQL as source of truth avoids two migration systems and keeps one readable, version-controlled history.

## Data retention

Most OpenThrottle tables are bounded by the entities they describe — one row per plan, per task, per repository. A handful are **append-only and grow with agent activity**, with no natural ceiling and, until now, no delete path:

| Table                                                        | Grows with                                 |
| ------------------------------------------------------------ | ------------------------------------------ |
| `plan_output_stream`                                         | every `append_plan_output` narration chunk |
| `work_sessions` / `work_session_subjects` / `work_artifacts` | every work-ledger session                  |
| `agent_token_usage`                                          | every assistant turn                       |
| `skill_usage_events` / `skill_usage_outcomes`                | every skill invocation                     |
| `code_embeddings`                                            | every indexed chunk, per workspace root    |

BullMQ's own JSONL run output is already pruned by `bullmq-run-output-retention.service.ts`; the database side was not. The **Data Retention** queue (`applications/openthrottle-server/src/queues/data-retention/`) closes that gap: one nightly sweep applies a list of declarative per-table policies.

### Dry run by default

**The sweep deletes nothing unless `DATA_RETENTION_ENFORCE=true`.** Retention deletes are irreversible and the rows are real plan history, so enforcement is a deliberate operator decision rather than a deploy side effect. In the default dry-run mode the job still runs on schedule and logs exactly how many rows each policy _would_ remove — which is the signal you want before turning it on.

Only the exact string `true` (case-insensitive, trimmed) enables enforcement. `1`, `yes`, `on` and typos all leave it in dry-run, so a mis-set variable can never quietly start deleting.

| Variable                 | Default        | Meaning                                             |
| ------------------------ | -------------- | --------------------------------------------------- |
| `DATA_RETENTION_ENFORCE` | _unset_        | `true` actually deletes; anything else is a dry run |
| `DATA_RETENTION_CRON`    | `0 30 3 * * *` | 6-field BullMQ cron for the sweep (nightly 03:30)   |
| `DATA_RETENTION_TZ`      | UTC            | Timezone for the cron pattern                       |

### How the sweep behaves

- **Batched.** Each policy deletes at most `DATA_RETENTION_BATCH_SIZE` (1,000) rows per statement, so locks are taken and released in short transactions instead of being held across the whole backlog while the app is still writing.
- **Bounded.** A per-policy cap of 50 batches per sweep stops a first enforced run against a large backlog from becoming one unbounded pass; the next sweep continues where it stopped and the log says so.
- **Idempotent.** A run with nothing past retention counts zero and deletes nothing.
- **Fault-isolated.** A policy that throws is logged and skipped; the remaining policies still run.

### Policies

Each policy lives in `queues/data-retention/policies/` and is registered in `data-retention.policies.ts`. Adding a table means adding one file and one array entry.

#### `plan_output_stream`

Keep the newest **500 chunks per plan**, and drop any chunk older than **90 days**, whichever is tighter for a given row.

The per-plan cap is the rule that actually protects the table. An age-only policy looks sufficient — the audited table held only ~3.4k chunks / ~4.4MB across nearly seven months — but a single runaway agent loop can write tens of thousands of chunks to one plan well inside the 90-day window, and age alone would not touch them for months. The cap is applied per plan rather than globally so a busy plan cannot evict a quiet plan's recent output.

Old narration is safe to drop: the plan and task records carry the durable outcome, and the chunks are a progress log, not the result.

#### Work ledger (`work_sessions`, `work_session_subjects`, `work_artifacts`)

Delete **closed** sessions after **365 days** when they hold at least one `verified` artifact, and after **180 days** when they do not. Both child tables declare `session_id ... ON DELETE CASCADE`, so deleting the session removes its subjects and artifacts with it — the policy's unit is the session, which is why it cannot leave orphans behind.

Two windows because sessions are not equally valuable. A session holding a verified artifact is provenance — it is how a plan or task is tied to a merged commit — so it earns the year. A session with only unverified/orphaned artifacts, or none at all (most abandoned ones), is process residue.

**Open sessions are never deleted, at any age.** An open row may be an in-flight session, and the hourly abandoned-session sweeper (`work-ledger-sweep`) closes genuinely dead ones within the hour, after which they become eligible here normally. Racing that sweeper for a live session is not worth it.

Dropping a verified artifact after a year does not lose the traceability itself: per-task work commits carry `Plan-Id:` / `Task-Id:` footers in the git history, which outlives any row here.

#### `agent_token_usage`

Delete rows older than **180 days** by `created_at`.

One row per assistant turn, append-only, never purged. Small today (137 rows in ~3 weeks on the audited database) but it scales with chat volume rather than with any bounded entity — the classic fact table that is fine until it suddenly is not.

180 days sits just past the longest window the Usage UI offers, so every view the product can render is still answered from raw rows. If usage reporting later needs a longer horizon, the answer is a monthly rollup table feeding the UI, not a longer raw-row window — that only defers the problem.

This policy and the skill-usage one below are built by the shared `createAgeRetentionPolicy` factory (`policies/create-age-retention-policy.ts`), which covers the common case: an append-only table with a timestamp column and no dependents. Postgres cannot bind identifiers as parameters, so the factory interpolates the table and column names and validates them against a strict snake_case pattern — they must be compile-time literals from the policy files, never request input.

#### `skill_usage_events` and `skill_usage_outcomes`

Delete rows older than **90 days** by `received_at`, as two independent policies.

Both are written by the harness skill hooks, one row per skill invocation, and neither had a delete path. They are pruned separately rather than as a pair because `skill_usage_outcomes.session_id` is a TEXT correlation key, not a foreign key to the events table — there is no parent/child relationship to order deletes around.

90 days is short because these rows are an observability signal, not a record. They answer "which skills are being used, and do they succeed" — a question about recent behaviour. Nothing references them and nothing is reconstructed from them.

**Pruned by `received_at`, not `occurred_at`.** Both columns exist and `occurred_at` is the more natural reading of "90 days of history", but it comes from the reporting harness's own clock: a client with a skewed clock could stamp `occurred_at` years in the past and have its row swept on the very next run, losing data that had just arrived. `received_at` defaults to server-side `now()` on insert, so it is monotonic and cannot be influenced by a reporter. For these tables the two differ by seconds — hooks report immediately — so nothing is given up by choosing the safe column.

#### `code_embeddings`

Delete embeddings for a workspace root only when **both** hold: the root is absent from `repository_checkouts`, **and** its newest embedding is older than **30 days**.

By far the largest table audited — ~5.8k rows and ~120MB for just two roots, because each row carries a 1536-dimension vector plus the source chunk. `@openthrottle/nestjs-vector-search` already deletes per `(workspace_root, path)` when re-indexing a file, so a _live_ root stays correct. What was missing is a sweep for roots that are gone entirely: a deleted clone, a reaped worktree, a checkout the user removed. Those embeddings are unreachable, and at ~20MB per thousand chunks they are the most expensive dead weight in the schema.

**The conjunction is the safety property, and neither half is sufficient alone.** Absence alone is not enough: `/ide` code search can index an ad-hoc root that was never registered as a checkout, so deleting on absence alone would destroy a working index out from under an active session. Coldness alone is not enough either: a registered checkout that simply hasn't changed in a month is perfectly live, and re-embedding 120MB of a large monorepo to recover from a needless delete is expensive.

Two smaller decisions worth knowing:

- Paths are compared with trailing slashes trimmed. The failure mode is asymmetric — a cosmetic `/repo` vs `/repo/` mismatch would make a live root look unregistered and delete it — so matching is deliberately generous in the direction that preserves data.
- `code_index_snapshots` is **not** used as the liveness signal despite being the obvious candidate. It was empty on the audited database while `code_embeddings` held 5,760 rows, so the absence of a snapshot says nothing about whether a root is real.

Because this policy can free a lot of space at once, it is the one most worth reading a dry-run report for before enabling enforcement.

## Foreign keys in migrations

**Never declare a foreign key inline inside a statement guarded by `IF NOT EXISTS`.** This is enforced by `pnpm nx run monorepo:check-migration-hygiene` (part of `check:local`).

The failure it prevents is silent and was found live. `CREATE TABLE IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS` are all-or-nothing: if the table or column already exists — an early bootstrap, a seed image predating the migration, a `pg_dump` restore that dropped constraints — the guard skips the **whole statement**. The column is already there, so nothing looks wrong, but its `REFERENCES` clause never runs. The `schema_migrations` ledger then records the migration as applied and nothing ever reconciles.

The 2026-08-21 sweep found **15 foreign keys** missing this way on the live database, and orphan rows behind them that the declared `ON DELETE CASCADE` would have removed: 178 tasks, 68 plan embeddings, 50 output chunks and 6 role memberships pointing at parents that no longer exist.

```sql
-- ❌ the constraint silently vanishes when the table already exists
CREATE TABLE IF NOT EXISTS tasks (
    id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES plans (id) ON DELETE CASCADE
);

-- ✅ create the shape, then add the constraint in its own guarded statement
CREATE TABLE IF NOT EXISTS tasks (
    id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_plan_id_fkey'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_plan_id_fkey
      FOREIGN KEY (plan_id) REFERENCES plans (id) ON DELETE CASCADE;
  END IF;
END
$$;
```

Guarding on `pg_constraint` rather than on a name you chose freely keeps the migration idempotent and makes it a clean no-op on a fresh database, where `CREATE TABLE` already produced the constraint under its default `<table>_<column>_fkey` name. For a repair of existing tables, prefer `ADD CONSTRAINT ... NOT VALID` followed by `VALIDATE CONSTRAINT`: the first takes a brief lock without scanning, and the second scans under `SHARE UPDATE EXCLUSIVE`, which does not block concurrent reads or writes.

### The 2026-08-21 repair (migration 099)

Migration `099_restore_missing_foreign_keys.sql` is the one-time repair of this drift. It restored **15** foreign keys and cleaned the orphans their absence had allowed:

| Rows | Table                | Action                                        |
| ---- | -------------------- | --------------------------------------------- |
| 178  | `tasks`              | deleted (parent plan gone, column `NOT NULL`) |
| 68   | `plan_embeddings`    | deleted                                       |
| 50   | `plan_output_stream` | deleted                                       |
| 6    | `user_roles`         | deleted (user gone)                           |
| 38   | `task_embeddings`    | deleted (hung off those tasks)                |
| 25   | `task_tags`          | deleted (cascade)                             |
| 12   | `plans.project_id`   | set to NULL                                   |
| 91   | `tasks.project_id`   | set to NULL                                   |

Every deleted row would already have been removed by the `ON DELETE CASCADE` its own migration declared, had the constraint existed — they survived only because it did not, and were unreachable (a task whose plan is gone cannot be listed, opened or run). The repair restores the state the schema always intended.

The migration is idempotent in both halves: repairs are predicated on `NOT EXISTS (parent)` and the constraint loop guards on `pg_constraint` by column rather than by name, so a second run is a clean no-op and a fresh database — where `CREATE TABLE` already produced the constraints — is unaffected.

### Auditing drift

To check a live database against what the migrations declare, diff `pg_constraint` against the `REFERENCES` clauses in `databases/migrations/`. Tables dropped later (`commit_links` in 075, `workspace_local_repositories` in 078) will show as "declared but missing" and are expected — their declarations are dead letters, not drift.

### One migration per numeric prefix

A `NNN_` prefix must identify exactly one migration. Application order is filename-lexicographic so duplicates still apply deterministically, but the prefix stops being an identifier, which breaks tooling and humans that assume it is one. `check-migration-hygiene` fails on any **new** collision; the prefixes already duplicated when the check was added (`084` ×3, and `085`, `087`, `090`, `092` ×2) are applied history and are grandfathered.
