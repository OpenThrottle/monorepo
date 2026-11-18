# OpenThrottle database

The `openthrottle` database: Postgres for OpenThrottle plans, tasks, and documentation, with pgvector for semantic search. It is the primary of the [databases](../README.md) on this server; the others (such as [`cms`](../cms/README.md)) share its runner and its connection settings. Plans and tasks are authored through openthrottle-mcp; the ingest scripts here load `docs/` and agent assets for semantic search.

## Setup

1. **Start Postgres and Redis (OpenThrottle)**

   From the repo root, using env from `.env.default` (or copy to `.env`). This brings up **`openthrottle-postgres`** and **`openthrottle-redis`** from the root `docker-compose.yml` (same as `pnpm run database:start`). For the full minimal API + UI path (install, migrate, `openthrottle-server:dev`, optional `openthrottle-developer:dev`), see [docs/openthrottle/run-openthrottle-server-developer.md](../../docs/openthrottle/run-openthrottle-server-developer.md). To verify OpenThrottle and the MCP are reachable after the API is up, use the **openthrottle-mcp `health` tool** — see [packages/openthrottle-mcp/docs/verification-environment.md](../../packages/openthrottle-mcp/docs/verification-environment.md) (smoke baseline).

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

   **Dev/start auto-migrates.** Booting the server locally (`openthrottle-server` `dev`/`dev-api`/`worker`/`start`) runs the `monorepo:ensure-migrations` Nx gate first: it waits briefly for Postgres, then applies any pending migrations (the same idempotent runner as `database:migrate`) against the DB the server connects to. If Postgres is unreachable it fails fast and tells you to run `pnpm run database:start`. `pnpm run database:migrate` above remains the manual/standalone entrypoint. The Docker path stays authoritative for container installs — migrations there are guaranteed by `Dockerfile.Migrations` + the compose `migrations` init service, which runs the same ledger (see [Run-once / idempotent](#run-once--idempotent-schema_migrations-ledger)); the gate is dev/start-only.

   **Service account bootstrap:** Migration `045_seed_service_accounts_bootstrap.sql` creates `openthrottle-mcp` and `workflow-ralph` service accounts with roles `mcp` and `workflow-ralph` (`plans:read`, `plans:write`). Mint bearer tokens once:

   ```bash
   pnpm run database:bootstrap-service-accounts
   ```

   Copy the printed values into `OPENTHROTTLE_MCP_AUTH_TOKEN` (Cursor MCP / openthrottle-mcp) and `OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN` (BullMQ Ralph worker GraphQL). Format: `ot_sa_<prefix>_<secret>`. See [packages/openthrottle-mcp/docs/AUTH.md](../../packages/openthrottle-mcp/docs/AUTH.md).

   **Backup (optional):** `pnpm run database:backup` writes `databases/openthrottle/backups/openthrottle-*.zip` (requires `pg_dump` and `zip` on PATH). For a daily BullMQ schedule on openthrottle-server, set `DATABASE_BACKUP_CRON`.

4. **Reset the database (optional, before a fresh ingest)**

   Truncates all openthrottle tables so a re-run of ingest does not create duplicate plans. Use when switching from test data to real data or when re-ingesting after changing source files:

   ```bash
   pnpm run database:reset
   ```

5. **Ingest agent assets into the documentation tables (optional)**

   Reads the skills, personas, prompts, and rules under `skills/` and `.agents/` and upserts them into `custom_prompts`. Content only — openthrottle-server's embeddings reconciler embeds the rows (within 15 minutes, or on its next boot):

   ```bash
   pnpm run database:import-agent-assets
   ```

   > **There is no plans-from-filesystem ingest.** Plans and tasks are authored directly in OpenThrottle via the openthrottle-mcp tools (`create_plan` / `create_tasks`); there is no repo-root `plans/` directory and no `database:import` script. Do not look for one.

6. **Ingest docs/ and NX project READMEs into documentation tables (optional)**

   Reads all `.md` files under `docs/` and every `applications|databases|packages|tools/<name>/README.md` and upserts them into `documentation`. Idempotent per (repo, sha, path). Docs use paths relative to `docs/` (e.g. `monorepo/NX.md`); project READMEs use `projects/<project-root>/README.md` (e.g. `projects/applications/openthrottle-developer/README.md`). Content only — openthrottle-server's embeddings reconciler embeds the newest row per path. `DOCS_PATHS` (comma-separated) ingests only those files. Optional env: `DOCS_REPO`, `DOCS_SHA`, `DOCS_AUTHORS` (comma-separated), `DOCS_MESSAGE`, `DOCS_PR_NUMBER` for source metadata (e.g. from docs-watch workflow):

   ```bash
   pnpm run database:import-docs
   ```

Plan JSON must have a `metadata` object (with `author` (GitHub handle), `category`, `title`) and a `tasks` array; files with other shapes (e.g. a bare array of task objects) are skipped and reported as errors.

## Schema

- **plans** – Plan metadata: `id`, `title`, `author`, `category`, `status`, `description`, `summary` (optional; PRD summarization: next actions, usage guides, wrap-up notes), `assignee` (optional; see [Assignee rule](#assignee-rule) below), `project_id` (optional, FK to projects; nullable), `completed_at` (TIMESTAMPTZ, nullable; set once on transition into COMPLETED by app write path; cleared if status leaves COMPLETED; not maintained by `updated_at` triggers — see migrations `055`, `056`), `created_at`, `updated_at`. In the OpenThrottle API, `projectId` is optional on create/update and in list filters; `projectRelation` is null when `projectId` is unset.
- **projects** – NX project reference for scoping plans/tasks: `id`, `name`, `nx_project_name` (TEXT; unique when not null per migration 032), `description`, `created_at`, `updated_at`. Only **NX applications** are kept; see [Projects collection (applications only)](#projects-collection-applications-only).
- **tasks** – Tasks for each plan: `id`, `plan_id` (FK), `title`, `description`, `category`, `status`, `requirements` (JSONB), `summary` (optional; per-task wrap-up: actions, usage notes, or why blocked), `assignee` (optional; see [Assignee rule](#assignee-rule) below), `sort_order` (INTEGER NOT NULL; explicit execution/list order within the plan; see [Task sort_order](#task-sort_order)), `wave` (INTEGER, nullable; coarse concurrency layer, `CHECK (wave IS NULL OR wave >= 1)`; see [Task wave](#task-wave) — migration `126`), `completed_at` (TIMESTAMPTZ, nullable; same semantics as `plans.completed_at` — migrations `055`, `056`), `created_at`, `updated_at`.
- **plan_embeddings** – Vector embeddings for plan content: `id`, `plan_id` (FK), `content`, `embedding` (vector 1536), `metadata` (JSONB), `created_at`.
- **task_embeddings** – Vector embeddings for task content: `id`, `task_id` (FK), `content`, `embedding` (vector 1536), `metadata` (JSONB), `created_at`.
- **plan_output_stream** – Streaming output (e.g. agent iteration log) per plan: `id`, `plan_id` (FK), `iteration` (nullable), `content`, `created_at`. Chunks appended in order; exposed via MCP `append_plan_output` and `get_plan_output`.
- **notes** – Quick unstructured thoughts: `id`, `content`, `author` (optional, e.g. GitHub username), `created_at`, `updated_at`. Foundation for notes route and planning workflow (e.g. create plan from note); exposed via MCP `create_note`, `get_note`, `list_notes`, `update_note`, `delete_note`.
- **documentation** – Source-of-truth per doc file landed on main (from `docs/` and NX project READMEs): `id`, `path` (TEXT; path under repo, e.g. `docs/foo.md` or `projects/<project-root>/README.md`), `content` (TEXT; parsed full text or summary for display), `repo` (TEXT), `sha` (TEXT; squash commit SHA), `pr_number` (INTEGER, nullable), `authors` (JSONB; e.g. array of GitHub usernames or `[{ "login", "email" }]`), `message` (TEXT; commit message), `created_at`. One row per (repo, sha, path); unique on (repo, sha, path) for idempotent upsert/replace-by-sha.
- **documentation_embeddings** – Vector embeddings for doc chunks (semantic search): `id`, `documentation_id` (FK to documentation), `content` (TEXT; chunk text), `embedding` (vector 1536), `metadata` (JSONB), `created_at`. Same pattern as plan_embeddings / task_embeddings; HNSW index on embedding, GIN on metadata.
- **users** – User accounts for auth and assignment: `id`, `created_at`, `updated_at`, `email` (TEXT, nullable; unique when set for login), `github_username` (TEXT NOT NULL), `password_hash` (TEXT, nullable; bcrypt for OpenThrottle local auth). See migrations `026_create_users_table.sql`, `031_add_users_password_hash_and_email_unique.sql`. Optional: table can be dropped and recreated with a stricter schema (e.g. email NOT NULL for new auth users); see migration 031 comments.
- **permissions** – RBAC permission definitions: `id`, `name` (TEXT, unique), `description` (TEXT, nullable), `created_at`. Seeded with `settings:read`, `settings:write`, `users:read`, `users:write` (migration 034), `plans:read`, `plans:write` (migration 045), `flags:read`, `flags:write` (migration 085), `blog:write` (migration 132; admin only — gates publish/unpublish/archive and the author/tag upserts that change the public site), `blog:draft` (migration 133; admin + mcp — create/edit DRAFT posts and read all posts, tags and authors, so agents can draft but never publish), and `cms:write` (migration 159; admin only — gates every cms GraphQL mutation, whose content the openthrottle-cms app renders publicly). **Convention — admin must stay the full superset:** any migration that INSERTs a new `permissions` row MUST also grant it to the `admin` role in the same migration (follow the `p.name IN (...)` pattern in `085_seed_rollout_flag_permissions.sql`). This mirrors the `@openthrottle/nestjs-rbac` contract `ROLE_PERMISSIONS[ADMIN] = Object.values(PERMISSIONS)` (`packages/nestjs-rbac/src/roles/roles.constants.ts`). Do NOT rely on migration 034's `CROSS JOIN permissions` admin grant to pick up your new permission — that grant is a **point-in-time snapshot** and only covers permissions that existed when 034 ran. Migration 045 hit exactly this trap (it added `plans:*` but granted only the `mcp`/`workflow-ralph` roles, so admin silently lost `plans:read`/`plans:write` on any DB migrated forward from 034); `092_grant_admin_all_permissions.sql` backfills it. The `check:rbac-admin-coverage` gate (`scripts/check-admin-permission-coverage.ts`, part of `check:local`) statically fails CI if any defined permission is never granted to admin.
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
- **code_embeddings** – Source-code chunk embeddings backing the `@openthrottle/openthrottle-ide` engine's `VectorStore` for `/ide` code semantic search. **Different shape** from the FK+metadata embedding tables above: `id` (TEXT PK; content-derived chunk id `hashContent(path + content)`, idempotent upsert key), `workspace_root` (TEXT; absolute repo path, scopes the store), `path` (TEXT; workspace-relative POSIX), `start_line`/`end_line` (1-based inclusive), `content` (TEXT), `content_hash` (TEXT; sha256 of the exact embedded text), `embedding` (vector 768, NULL until embedded), `embedding_model`, `embedding_dims`, `created_at`. No FK/metadata. See migrations `052_create_code_embeddings_table.sql` and `164_code_embeddings_768_provenance.sql`.
- **code_index_snapshots** – Per-workspace file-hash snapshot enabling **incremental** code re-indexing. One row per `workspace_root` (TEXT PK), a `snapshot` (JSONB; the engine `hashWorkspace` output — an array of `{ path, hash }`), and `updated_at` (TIMESTAMPTZ). Before each index, `CodeSearchService` (in `@openthrottle/nestjs-vector-search`) loads the prior snapshot and diffs it against a fresh scan (engine `diffSnapshots`) so only added/changed files are re-embedded and removed files are dropped via `indexWorkspace({ diff })`; with no prior snapshot it does a FULL index. The snapshot is persisted only after a successful index. See migration `054_create_code_index_snapshots_table.sql`.
- **user_workspace_settings** – Per-user workspace profile (Settings → Workspace): `user_id` (PK, FK to users), `contact_display_name`, `contact_email`, `enabled_editors` (JSONB array of editor ids, e.g. `cursor`, `vscode`), `created_at`, `updated_at`. See migration `042_create_workspace_settings_tables.sql` and `applications/openthrottle-server/docs/workspace-settings-graphql-design.md`.
- **workspace_local_repositories** – Local filesystem checkouts registered by a user: `id`, `user_id` (FK), `filesystem_path` (absolute; unique per user), `display_name`, `git_remote_url`, `git_default_branch`, `project_id` (optional FK to projects), `created_at`, `updated_at`. See migration 042 and workspace-settings GraphQL design doc.
- **agent_conversations** – Persisted web chat/agent threads (human JWT user-scoped): `id`, `user_id` (FK to users, ON DELETE CASCADE), `title` (optional; auto from first user message ~80 chars), `status` (`active` \| `archived`; archive-only in v1, no hard delete), `plan_id` (optional FK, ON DELETE SET NULL), `project_id` (optional FK, ON DELETE SET NULL), `model_provider`, `model_name` (router LLM snapshot per persist turn; null for heuristic-only routing), `metadata` (JSONB), `created_at`, `updated_at`. Strictly separate from **plan_output_stream** (Ralph logs). See migration `051_create_agent_conversations_tables.sql`.
- **agent_conversation_messages** – Ordered messages within a conversation: `id`, `conversation_id` (FK, ON DELETE CASCADE), `role` (`user` \| `assistant` \| `system` \| `tool`; v1 writes user + assistant only), `content` (TEXT; **app cap 256KB** on insert), `sort_order` (INTEGER NOT NULL; monotonic per conversation; user+assistant consecutive per turn in one txn), denormalized assistant routing columns (`routing_tier`, `routing_confidence`, `routing_model`, `routing_reason`), `tool_metadata` (JSONB; **app cap 64KB**; set `truncated` in envelope when clipped), `created_at`. No `task_id` or `parent_message_id` in v1.
- **plan_runs** – The "we're kicking off a run" record: one row per enqueue/CLI-start (`id`, `plan_id`, `bullmq_job_id` nullable for detached-CLI, `run_kind`, `status`, `run_config_snapshot` JSONB, run-location `hostname`/`pid`/`worker_id`, `cancel_requested_at`/`by`, `last_heartbeat_at`). **Run provenance** (migration `087`, promoted from scattered/JSONB to first-class queryable columns): `execution_backend` (the agent/CLI), `branch` (TEXT; git branch the run operates on — captured at kickoff as a **required enqueue input**, never inferred server-side; nullable only for legacy/backfilled rows), `model` (TEXT; resolved agent model id, projection of `run_config_snapshot.ralph.model`), `checkout_id` (UUID FK → `repository_checkouts(id)` ON DELETE SET NULL; the run's durable on-disk home whose `filesystem_path` powers "open in editor" deep-links). Migration `088` best-effort backfills `model`/`checkout_id` from the snapshot JSONB. The linked PR is NOT a column — it hangs off the run's work-ledger session (`work_sessions.plan_run_id → work_artifacts type='pull_request'`) and is exposed via the `PlanRunObject.pullRequest` resolver. **Scheduled runs** (migration `140`): `scheduled_for` (`TIMESTAMPTZ`, nullable) is the absolute UTC instant a run scheduled with `schedulePlanRun` fires at. It is an instant, so there is deliberately **no timezone column** (unlike the recurring `scheduled_agent_jobs`); the browser picks and displays it in the viewer's local zone. It is kept after the row settles so run history still shows when the run was meant to fire, and is `NULL` for every run enqueued to run now. `status` is plain `TEXT` with no `CHECK`, so the three scheduling values need no DDL: `SCHEDULED` (waiting on a delayed BullMQ job, holds no worktree), `MISSED` (could not fire within the 1-hour grace window; terminal) and `SUPERSEDED` (held at fire time because the plan already had an active run; terminal). They sit alongside `QUEUED`, `IN_PROGRESS`, `COMPLETED`, `FAILED`, `CANCELLED`, `STALE` and `USAGE_LIMITED` (the run stopped cleanly on an agent-account usage limit; terminal for the row; a continuation run may follow and points back to it via its `resume_of_run_id`); migration `140` refreshes the `status` column comment to list them all. **One scheduled run per plan** (migration `152`): a plan has at most one `SCHEDULED` row, and `plans.status` is `SCHEDULED` exactly while it does (see [Status semantics](#status-semantics-plans-and-tasks)). Migration `152` backfilled the rule by cancelling every `SCHEDULED` row that broke it — duplicates beyond each plan's soonest, and scheduled runs on plans that were not `PENDING`/`BACKLOG` — before adding the index. Each such row records why in `settled_reason`. Their delayed BullMQ jobs were left in Redis and are **harmless**: the fire-time claim (`PlanRunsRepository.transitionScheduledRun`) is guarded on `status = 'SCHEDULED'`, so it matches no row and the worker does nothing, and the boot reconcile reads only `SCHEDULED` rows, so it never re-creates one.
- **repository_checkouts** – Per-user on-disk instance of a repository (see migration `078`): `id`, `repository_id` (FK), `user_id` (FK), `filesystem_path`, `display_name`, `managed`, `kind` (`'primary'` \| `'worktree'`), `inspection` (JSONB cache), `scanned_at`. `kind='worktree'` is written when a linked worktree is registered (its `.git` is a file pointer) and is what `plan_runs.checkout_id` references for run provenance.

Indexes include HNSW vector indexes on embedding columns for similarity search.

**Removed tables.** `commit_links` (git commit ↔ plan/task linkage, migration `006`) was **dropped** by `075_drop_commit_links.sql`. Commit provenance now lives on the work ledger as a `git_commit` artifact — see [Recording merged commits on the work ledger](#recording-merged-commits-on-the-work-ledger-option-a-workflow).

### Indexes

Indexes are created by migrations in `databases/openthrottle/migrations/`. Main tables and their indexes:

- **plans** – `idx_plans_status`, `idx_plans_category`, `idx_plans_author`, `idx_plans_created_at`, `idx_plans_assignee` (partial), `idx_plans_updated_at`, `idx_plans_status_created_at`, `idx_plans_status_updated_at`, `idx_plans_title_trgm` (GIN, pg_trgm for ILIKE). See `002_create_plans_table.sql`, `012_add_assignee_to_plans_and_tasks.sql`, `017_add_plans_list_sort_indexes.sql`, `018_plans_title_trgm.sql`.
- **tasks** – `idx_tasks_plan_id`, `idx_tasks_status`, `idx_tasks_category`, `idx_tasks_created_at`, `idx_tasks_requirements` (GIN), `idx_tasks_assignee` (partial), `idx_tasks_plan_id_sort_order` (unique on `plan_id`, `sort_order`). See `003_create_tasks_table.sql`, `012_add_assignee_to_plans_and_tasks.sql`, `049_add_sort_order_to_tasks.sql`.
- **plan_embeddings** – `idx_plan_embeddings_plan_id`, `idx_plan_embeddings_vector` (HNSW cosine), `idx_plan_embeddings_metadata` (GIN). See `004_create_plan_embeddings_table.sql`.
- **task_embeddings** – `idx_task_embeddings_task_id`, `idx_task_embeddings_vector` (HNSW cosine), `idx_task_embeddings_metadata` (GIN). See `005_create_task_embeddings_table.sql`.
- **projects** – `idx_projects_nx_project_name`, `idx_projects_nx_project_name_unique` (unique partial WHERE nx_project_name IS NOT NULL), `idx_projects_created_at`. See `024_create_projects_table.sql`, `032_projects_unique_nx_project_name.sql`.
- **plan_output_stream** – `idx_plan_output_stream_plan_id`, `idx_plan_output_stream_created_at` (plan_id, created_at). See `007_create_plan_output_stream_table.sql`.
- **notes** – `idx_notes_author`, `idx_notes_created_at`. See `009_create_notes_table.sql`.
- **documentation** – Unique on (repo, sha, path); indexes on path, repo, sha, created_at for filtering and ingest. See migration `019_create_documentation_table.sql` (or equivalent).
- **documentation_embeddings** – `idx_documentation_embeddings_documentation_id`, `idx_documentation_embeddings_vector` (HNSW cosine), `idx_documentation_embeddings_metadata` (GIN). See migration `020_create_documentation_embeddings_table.sql` (or equivalent).
- **users** – `idx_users_github_username` (unique), `idx_users_created_at`, `idx_users_email_unique` (unique on email WHERE email IS NOT NULL for login). See migrations `026_create_users_table.sql`, `031_add_users_password_hash_and_email_unique.sql`.
- **subscriptions** – `idx_subscriptions_stripe_subscription_id` (unique partial), `idx_subscriptions_user_id`, `idx_subscriptions_status`. See migration `035_create_subscriptions_table.sql`.
- **custom_prompts** – `idx_custom_prompts_prompt_type`, `idx_custom_prompts_labels` (GIN), `idx_custom_prompts_user_id` (partial), `idx_custom_prompts_project_id` (partial), `idx_custom_prompts_file_path` (partial), `idx_custom_prompts_created_at`, `idx_custom_prompts_updated_at`, `idx_custom_prompts_type_created_at`, `idx_custom_prompts_active` (partial WHERE deleted_at IS NULL), `idx_custom_prompts_title_trgm` (GIN, pg_trgm for ILIKE). See migration `036_create_custom_prompts_table.sql`.
- **custom_prompt_embeddings** – `idx_custom_prompt_embeddings_custom_prompt_id`, `idx_custom_prompt_embeddings_vector` (HNSW cosine), `idx_custom_prompt_embeddings_metadata` (GIN). See migration `037_create_custom_prompt_embeddings_table.sql`.
- **code_embeddings** – `idx_code_embeddings_workspace_path` (btree on `(workspace_root, path)`; scopes `clear`/`deleteByPaths`), `idx_code_embeddings_vector` (HNSW cosine). No metadata/GIN index. See migration `052_create_code_embeddings_table.sql`.
- **agent_conversations** – `idx_agent_conversations_user_status_updated_at` (user_id, status, updated_at DESC), `idx_agent_conversations_plan_id` (partial WHERE plan_id IS NOT NULL). See migration `051_create_agent_conversations_tables.sql`.
- **agent_conversation_messages** – `idx_agent_conversation_messages_conversation_sort_order` (unique on conversation_id, sort_order). See migration `051_create_agent_conversations_tables.sql`.
- **plan_runs** – `idx_plan_runs_inprogress_heartbeat` (partial WHERE status='IN_PROGRESS'; staleness sweep), `idx_plan_runs_checkout_id` and `idx_plan_runs_branch` (both partial WHERE NOT NULL; the checkout join target and the branch→PR lookup for run provenance), `plan_runs_scheduled_status_scheduled_for_idx` (partial on `(status, scheduled_for)` WHERE status='SCHEDULED'; the boot reconcile scans only SCHEDULED rows by fire time to re-create delayed jobs lost from Redis), `plan_runs_one_scheduled_per_plan_idx` (partial **unique** on `(plan_id)` WHERE status='SCHEDULED'; at most one scheduled run per plan — a violation surfaces as the `PLAN_ALREADY_SCHEDULED` conflict). See migrations `080`, `087`, `140`, `152`.

**When to add new indexes:** Add a new migration when you introduce a **new filter or sort column** used by openthrottle-mcp (via GraphQL), openthrottle-server, or the OpenThrottle app (e.g. a new WHERE or ORDER BY), or a **new query pattern** that would benefit from a composite or partial index. Prefer composite indexes for common filter+sort combinations (e.g. status + created_at). For substring/ILIKE search on text, consider `pg_trgm` and a GIN index (see `018_plans_title_trgm.sql`). Audit notes: `databases/INDEX_AUDIT.md`.

### Embedding dimension strategy

Semantic search (`plan_embeddings`, `task_embeddings`, `documentation_embeddings`, `custom_prompt_embeddings`, `code_embeddings`) uses **one model at one dimension at a time**: by default **`nomic-embed-text-v1.5` at `vector(768)`** (migration `163_embeddings_768_provenance_and_search_tsv.sql`, OT plan `165e86ef`; `code_embeddings` followed in `164_code_embeddings_768_provenance.sql`, OT plan `e489d73d`, after a bake-off against jina-embeddings-v2-base-code found no quality gain for code); a hosted provider swaps in its own model at the same 768 dims (OT plan `7a18c91d`).

- **Code chunks keep their text:** a `code_embeddings` row carries its chunk in `content`, so its vector is a pure cache of that column — migration 164 kept the rows and only NULLed the vectors, and the reconciler re-embeds code rows from `content` like any other stale row. The code-index queue still owns which chunks exist (it chunks the workspace and deletes removed files).

- **Code under a hosted provider is opt-in** (OT plan `1c8b9a90`). Source code is a much larger privacy and cost surface than plan and task text, so under `EMBEDDING_PROVIDER=openai` or `gemini` code indexing refuses unless `CODE_EMBEDDINGS_ALLOW_HOSTED=true`: `codeIndexStatus` and `indexCodeRepository` return `hostedOptInRequired`, nothing is enqueued, and `CodeSearchService.indexCodeWorkspace` throws before reading a file. Under `local` or `ollama` code is always indexed and stays on your hardware. The other four tables embed through whichever provider is configured. With the opt-in set, every chunk of every indexed repository goes to the provider, and a provider switch re-sends all of it. `code_embeddings` rows written under an earlier opt-in are not deleted when it is removed; search over them is gated off along with indexing.

- **Who embeds:** only openthrottle-server. Writes enqueue a job on the BullMQ `embeddings` queue (a TypeORM entity subscriber on plans, tasks and custom prompts), and a repeatable reconciler re-enqueues any row whose embedding is missing or stale — that is both the guarantee and the backfill. Nothing embeds inline, and the ingest scripts only write content rows.
- **Provider:** `EMBEDDING_PROVIDER=local` (default) runs quantized nomic-embed-text-v1.5 in-process (ONNX, worker thread) from `EMBEDDING_MODELS_DIR`; `EMBEDDING_PROVIDER=ollama` runs the **same model** through Ollama (`nomic-embed-text`), so vectors from either are comparable. `EMBEDDING_PROVIDER=openai` (`OPENAI_API_KEY`; `text-embedding-3-small` by default, or `EMBEDDING_MODEL=text-embedding-3-large`) and `EMBEDDING_PROVIDER=gemini` (`GEMINI_API_KEY`; `gemini-embedding-001`) call a hosted API asking for 768-dim output, with `OPENAI_BASE_URL` / `GEMINI_BASE_URL` to point at a proxy. The server process never downloads weights at runtime; the `monorepo:ensure-embedding-model` gate fetches them before each `dev`/`dev-api`/`worker`/`start` boot (OT plan 7803080c), and the production image bakes them in. Missing weights (offline first boot), a missing API key or a dimension that does not match the column fail loudly at boot and surface as `unconfigured` in `health`.
- **Provenance:** every embedding row stores `embedding_model`, `embedding_dims` and `content_hash` (sha256 of the exact text embedded, which carries the nomic `search_document:` prefix; hosted models take no prefix, so their hash is of the bare text). Search compares only vectors whose `embedding_model` equals the configured model. A row with a NULL or different model, or a hash that no longer matches its source, is **stale**: search ignores it and the reconciler re-embeds it. Switching models is therefore a re-embed, never silent corruption.
- **One row per source row:** each table has a UNIQUE index on its source FK (`plan_id`, `task_id`, `documentation_id`, `custom_prompt_id`), so the processor upserts. Task content is title + description + summary + parent plan title, truncated, no chunking.
- **Lexical fallback:** `plans`, `tasks`, `documentation` and `custom_prompts` carry a generated `search_tsv tsvector` (GIN-indexed; titles weighted A). When the embedder is not available, semantic search answers from Postgres full-text (`websearch_to_tsquery` + `ts_rank`) and says so (`mode: 'lexical'` plus a `reason`) instead of returning empty results.
- **Switching provider re-embeds everything.** Each model records its own `embedding_model` (`nomic-embed-text-v1.5`, `text-embedding-3-small`, `gemini-embedding-001`, …) and vectors from different models are never compared, so changing `EMBEDDING_PROVIDER` or `EMBEDDING_MODEL` marks every row stale. The reconciler re-embeds the lot on the next boot cycle; until a row is redone, search skips it. `local` ↔ `ollama` is the one switch that costs nothing, because both run the same model. Switching back re-embeds again.
- **A big re-embed stays in the background** (OT plan `ca13e543`). A model switch or a migration like 164 re-embeds thousands of rows; it may take longer, but search must stay responsive while it runs. The knobs, all optional:

  | Env                                 | Default           | What it does                                                                                                                                      |
  | ----------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `EMBEDDINGS_BATCH_SLICE`            | `2`               | Texts per message to the local worker for background embeds. The worker runs one message at a time, so a search query waits at most one slice.    |
  | `EMBEDDINGS_MAX_TOKENS`             | `2048`            | Tokens kept per input (clamped to the model's 8192). A batch pads to its longest text and attention grows with its square, so this bounds memory. |
  | `EMBEDDINGS_THREADS`                | half the cores    | ONNX intra-op threads for the local worker, leaving the rest of the machine to the API and the other queues.                                      |
  | `EMBEDDINGS_SLICE_PAUSE_MS`         | `0`               | Optional pause between a background embed's slices.                                                                                               |
  | `EMBEDDINGS_CONCURRENCY`            | `1`               | Embeddings jobs in flight. The local model is one thread, so a second job only waits there while holding its texts in memory.                     |
  | `EMBEDDINGS_RATE_LIMIT_MAX`         | `120` (`0` = off) | BullMQ limiter: at most this many embeddings jobs per `EMBEDDINGS_RATE_LIMIT_DURATION_MS`. Paces bursts of single-row entity jobs.                |
  | `EMBEDDINGS_RATE_LIMIT_DURATION_MS` | `60000`           | The limiter's window.                                                                                                                             |

  If a query embed still misses `SEARCH_EMBED_BUDGET_MS` (default `3000`), search answers lexically with `reason: embedder_busy` rather than letting the client time out.

  `pnpm run embeddings:bench-backfill -- --database-url <url>` measures a backfill against real `code_embeddings` texts: throughput, query-embed latency, peak RSS and CPU.

  What a big re-embed costs, measured on a 10-core Apple M1 Max re-embedding the 5,760 `code_embeddings` rows that migration 164 nulled (bench over 400 of them; server over the full set while searching every 3s):

  |                                  | Before (as of #843)             | After (defaults above)                              |
  | -------------------------------- | ------------------------------- | --------------------------------------------------- |
  | Backfill throughput              | ~1 chunk/s (~0.6 in the server) | ~4–5 chunks/s (~20 min for all 5,760)               |
  | Query embed during backfill      | p50 21s, p95 77s                | p50 0.2s, p95 1.1s                                  |
  | `search` GraphQL during backfill | timed out at 15s                | p50 0.46s, p95 1.3s, max 1.7s (hybrid, no fallback) |
  | Peak RSS                         | 20–30 GB                        | 3.4 GB (bench), 4.4 GB (server)                     |
  | CPU                              | every core                      | about half the cores                                |

- **Choosing a provider:**

  |                  | `local` / `ollama` (default)                                                | `openai` / `gemini`                                                                                                                                                                                                                                                     |
  | ---------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | **Privacy**      | Text never leaves your hardware.                                            | Every plan, task, document and prompt body is sent to the provider, at every write and on every re-embed — and source code too, if `CODE_EMBEDDINGS_ALLOW_HOSTED=true`. Check its data-retention terms before pointing it at private work.                              |
  | **Cost**         | Free; CPU time and ~130 MB of quantized weights (or the Ollama host's GPU). | Billed per input token. Steady-state writes are cheap, but a provider switch re-embeds the whole corpus in one go. See the provider's current pricing; `text-embedding-3-small` is OpenAI's cheaper model.                                                              |
  | **Quality**      | A strong small open model, trained for retrieval with task prefixes.        | Larger models that generally rank higher on retrieval benchmarks. They are cut down to 768 dims (Matryoshka truncation), which costs a little of that edge. Gemini gets `RETRIEVAL_DOCUMENT` / `RETRIEVAL_QUERY` task types. Measure on your own data before switching. |
  | **Availability** | No network dependency once the weights are cached.                          | Needs the network and a valid key. 429s and 5xx back off and retry (4 attempts, honouring `Retry-After`); a longer outage degrades search to lexical until the provider recovers.                                                                                       |

  Not supported: Vertex AI (it needs Google Cloud credentials rather than an API key), `gemini-embedding-2` (it drops task types in favour of in-prompt instructions), and Voyage (no 768-dim option).

- **Changing the dimension** means a new migration altering the four columns (delete the vectors; they cannot be cast) plus `EMBEDDING_DIMS`; the reconciler re-embeds everything afterwards.

SQL migrations live in `databases/openthrottle/migrations/` and are applied in filename order by `pnpm run database:migrate`, which migrates every registered database in turn, this one first, each against its own ledger (see [`databases/AGENTS.md`](../AGENTS.md)).

### Run-once / idempotent (schema_migrations ledger)

Every entrypoint — `pnpm run database:migrate`, the `monorepo:ensure-migrations` dev gate, and the `openthrottle/migrations` container image — is **run-once and idempotent**: running it repeatedly is safe and, once the database is up to date, a no-op. All three share one implementation, [`databases/migration-runner.ts`](../migration-runner.ts) (the image runs it through [`databases/migrate.ts`](../migrate.ts)). Applied migrations are tracked in a `schema_migrations` ledger (`filename` PRIMARY KEY, `applied_at`, `checksum`):

- **Skip / apply:** On each run the runner reads the ledger, skips any file already recorded, and applies only new files in filename order. Each migration and its ledger insert run in a **single transaction**, so a failed migration rolls back cleanly (recorded as _not_ applied) and is retried on the next run.
- **One-time cut-over (existing DBs without a ledger):** The first run against a database that already has the schema (empty ledger **and** core tables like `plans`/`tasks` present) applies **every** migration once, in order, and records each. That is what the container image did on every deploy before it adopted the ledger, so it is one last run of the old behavior. It deliberately never marks files applied without running them: a volume last migrated by an older image has not run the files new in this one. Earlier versions of the workspace runner did seed the ledger that way, which is why some ledgers carry rows with a null `checksum`. A genuinely fresh database (no core tables) applies every migration normally.
- **Retired migrations:** `010_normalize_author_to_visormatt.sql` and `013_normalize_assignee_to_visormatt.sql` were one-off personal data fixes whose bodies are now commented no-ops. They keep their filenames (the ledger key) and are listed in `RETIRED_MIGRATIONS`, which exempts them from drift warnings.
- **No-op guarantee:** Two `database:migrate` runs in a row leave data untouched — in particular `plans`/`tasks` `updated_at`, `author`, and `assignee` are unchanged. (This closes the previous non-idempotent behavior, where re-running re-stamped `updated_at` across all rows via the `BEFORE UPDATE` triggers and skewed `daily_stats` completion dates.)
- **Adding a migration:** Drop a new `NNN_*.sql` file into `databases/openthrottle/migrations/`; it is picked up and applied exactly once on the next `database:migrate`. Do **not** edit an already-applied migration in place — the runner warns (does not fail) on checksum drift; revert the edit or add a new migration instead.

Embedding columns are `vector(768)`; see [Embedding dimension strategy](#embedding-dimension-strategy).

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
23. `030_create_doc_ingestion_state_table.sql` – doc_ingestion_state table (scope, path, content_hash, updated_at) for the since-removed Doc Ingestion BullMQ queue; dropped by `143_drop_doc_ingestion_state.sql`.
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
38. `136_add_promoted_status.sql` – Add PROMOTED to `plan_task_status` (plans and tasks), guarded and anchored `AFTER 'PENDING'`; refreshes the `plans.status` / `tasks.status` column comments. No data changes (a newly added enum value cannot be used in the same transaction). See [PROMOTED semantics](../../docs/openthrottle/authoring-plans-via-mcp.md#what-promoted-means).
39. `137_backfill_promoted_task_status.sql` – Move tasks closed by `promote_task` before PROMOTED existed (status SKIPPED + a `promoted` task_tags row) to PROMOTED; untagged SKIPPED rows are left alone and the `promoted` tag stays for one release. Idempotent (the SKIPPED predicate makes a second run a no-op).
40. `143_drop_doc_ingestion_state.sql` – Drop `doc_ingestion_state` and its indexes: it only held content hashes for the removed Doc Ingestion BullMQ queue, so no user data is lost. Idempotent (`DROP TABLE IF EXISTS`). Applied migrations 030 / 039 / 102 still name the table and stay untouched.

### Migration strategy (TypeORM vs SQL)

We keep **SQL files as the single source of truth** for schema. TypeORM is used only for **runtime** (connection pooling via DataSource, raw SQL in openthrottle-server and scripts; entities for type safety). We do **not** use TypeORM’s migration runner.

- **Applying schema changes:** Add a new numbered `.sql` file in `databases/openthrottle/migrations/`, then run `pnpm run database:migrate`. The script `scripts/openthrottle-database-migrations.ts` applies not-yet-recorded `.sql` files in filename order and records each in the `schema_migrations` ledger (see [Run-once / idempotent](#run-once--idempotent-schema_migrations-ledger)).
- **Keeping runtime in sync:** After adding or changing a migration, update TypeORM entities in `@openthrottle/nestjs-repositories` (and any scripts that use OpenThrottle Postgres) so they match the SQL schema. Entity JSDoc should reference the migration(s), e.g. “Matches databases/openthrottle/migrations (002, 012).”
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
| `agent_conversations` / `agent_conversation_messages`        | every chat (soft-deleted, never purged)    |
| `plan_runs`                                                  | every plan execution                       |
| `scheduled_agent_job_runs`                                   | every scheduled-job fire                   |

BullMQ's own JSONL run output is already pruned by `bullmq-run-output-retention.service.ts`; the database side was not. The **Data Retention** queue (`applications/openthrottle-server/src/queues/data-retention/`) closes that gap: one nightly sweep applies a list of declarative per-table policies.

### Dry run by default

**The sweep deletes nothing unless `DATA_RETENTION_ENFORCE=true`.** Retention deletes are irreversible and the rows are real plan history, so enforcement is a deliberate operator decision rather than a deploy side effect. In the default dry-run mode the job still runs on schedule and logs exactly how many rows each policy _would_ remove — which is the signal you want before turning it on.

Only the exact string `true` (case-insensitive, trimmed) enables enforcement. `1`, `yes`, `on` and typos all leave it in dry-run, so a mis-set variable can never quietly start deleting.

| Variable                 | Default        | Meaning                                             |
| ------------------------ | -------------- | --------------------------------------------------- |
| `DATA_RETENTION_ENFORCE` | _unset_        | `true` actually deletes; anything else is a dry run |
| `DATA_RETENTION_CRON`    | `0 30 3 * * *` | 6-field BullMQ cron for the sweep (nightly 03:30)   |
| `DATA_RETENTION_TZ`      | UTC            | Timezone for the cron pattern                       |

### Operator checklist: turning enforcement on

Enforcement is decided per environment by a human. Before setting `DATA_RETENTION_ENFORCE=true` anywhere:

1. **Collect at least a week of dry-run sweeps.** Each nightly run logs one `Data-retention <policy> (<table>): expired=N, deleted=0` line per policy and a closing `Data-retention sweep done (dry-run): … WOULD be deleted` line. The boot line `Data-retention worker started (… mode=dry-run, policies=N)` confirms the mode and the policy count.
2. **Read the per-policy `expired` counts against the table sizes.** A policy whose `expired` is close to its table's whole row count is the one to question before enabling, and `code_embeddings` can free the most at once.
3. **Record the expected counts** (in the plan or task that enables enforcement), so the first enforced sweep can be checked against them.
4. **Set `DATA_RETENTION_ENFORCE=true`** in that environment and restart the worker; the boot line must now say `mode=ENFORCING`.
5. **Check the first enforced sweep**: `deleted` should match the recorded `expired` counts, or run short with `(hit batch cap, remainder next sweep)` on a large first backlog.

An environment that deliberately stays in dry-run (local dev, a demo database) should say so where its environment is configured, so the biweekly database-health job can tell a waiver from an oversight.

### How the sweep behaves

- **Batched.** Each policy deletes at most `DATA_RETENTION_BATCH_SIZE` (1,000) rows per statement, so locks are taken and released in short transactions instead of being held across the whole backlog while the app is still writing.
- **Bounded.** A per-policy cap of 50 batches per sweep stops a first enforced run against a large backlog from becoming one unbounded pass; the next sweep continues where it stopped and the log says so.
- **Idempotent.** A run with nothing past retention counts zero and deletes nothing.
- **Fault-isolated.** A policy that throws is logged and skipped; the remaining policies still run.

### Policies

Each policy lives in `queues/data-retention/policies/` and is registered in `policies/policies.constants.ts`. Adding a table means adding one file and one array entry.

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

This policy and the skill-usage one below are built by the shared `createAgeRetentionPolicy` factory (`policies/policies.utils.ts`), which covers the common case: an append-only table with a timestamp column and no dependents. Postgres cannot bind identifiers as parameters, so the factory interpolates the table and column names and validates them against a strict snake_case pattern — they must be compile-time literals from the policy files, never request input.

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

#### `agent_conversations` (and `agent_conversation_messages`)

Delete conversations whose `status` has been **`deleted` for 30 days**, measured by `updated_at`.

Deleting a chat in the product is a soft delete: `status` flips to `deleted` and the row and every message stay, so the delete can be undone. Nothing ever purged them, and on the audited database deleted conversations outnumbered active ones (144 to 62). `updated_at` is an `@UpdateDateColumn`, so the soft delete itself stamps it and the 30 days run from the delete, not from the last message. A conversation restored within the window leaves `deleted` and is never touched; `active` and `archived` conversations are out of scope at any age.

Messages declare `ON DELETE CASCADE` and go with their conversation, so the policy's unit is the conversation and it cannot leave orphan messages. `agent_token_usage` and `work_sessions` reference conversations `ON DELETE SET NULL`: usage reporting and the work ledger keep their rows and lose only the link.

#### `plan_runs`

Delete a run only when **all** of these hold: its status is terminal (`COMPLETED`, `FAILED`, `CANCELLED`, `STALE`, `MISSED`, `SKIPPED`, `SUPERSEDED`, `USAGE_LIMITED`), it was last updated more than **180 days** ago, it is **not its plan's newest run**, and it has **no `agent_trajectories` row**.

One row is written per plan execution and none was ever deleted (524 runs in six months on the audited database). A run row is attribution — agent, model, branch, worktree — so it earns half a year, but an old settled run answers nothing the plan, its tasks and the git history do not.

- **Never a live run.** `QUEUED`, `SCHEDULED` and `IN_PROGRESS` are not in the terminal set, at any age. `USAGE_LIMITED` is terminal for its own row: a continuation is a new row linked by `resume_of_run_id`.
- **Each plan keeps its newest run**, so every plan that ever ran still shows who ran it last.
- **Runs with a trajectory are kept.** `agent_trajectories.plan_run_id` cascades from the run and `eval_human_labels` cascades from the trajectory, so deleting the run would silently delete hand-written eval labels. Trajectory retention belongs to the eval system and is not decided here.
- Every other reference — `work_sessions.plan_run_id`, `plan_messages.plan_run_id` and the `resume_of_run_id` self-reference — is `ON DELETE SET NULL`, so the work ledger and the plan inbox keep their rows and lose only the link.

#### `scheduled_agent_job_runs`

Delete a run once it is **no longer in flight** (anything but `queued` / `running`), it finished — or, if it never started, was created — more than **180 days** ago, and it is **not its job's newest run**.

One row per cron fire, run-now or usage-limit resume, each with a settings snapshot and raw usage JSON, and none was ever pruned. The in-flight set comes from `SCHEDULED_AGENT_JOB_RUN_IN_FLIGHT_STATUSES` in `@openthrottle/nestjs-repositories`, the same list the scheduler uses, so the policy and the scheduler cannot disagree about what is live. Keeping each job's newest run means the schedule page always shows a job's latest outcome.

The only reference into the table is the `resume_of_run_id` self-reference, `ON DELETE SET NULL`: a resume run outlives the limited run it continued and loses only the link.

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

To check a live database against what the migrations declare, diff `pg_constraint` against the `REFERENCES` clauses in `databases/openthrottle/migrations/`. Tables dropped later (`commit_links` in 075, `workspace_local_repositories` in 078) will show as "declared but missing" and are expected — their declarations are dead letters, not drift.

### One migration per numeric prefix

A `NNN_` prefix must identify exactly one migration. Application order is filename-lexicographic so duplicates still apply deterministically, but the prefix stops being an identifier, which breaks tooling and humans that assume it is one.

`check-migration-hygiene` fails on any collision that this branch is **adding**. Seven prefixes are grandfathered, in two cohorts:

| prefix                               | cohort                                             |
| ------------------------------------ | -------------------------------------------------- |
| `084` ×3, `085`, `087`, `090`, `092` | predate the rule (shipped 2026-08-23, #421)        |
| `110`, `111`                         | landed 2026-09-07..09, **while the rule was live** |

Grandfathering rather than renumbering is not laziness — see [Never renumber an applied migration](#never-renumber-an-applied-migration).

#### What the check compares against, and why

The duplicate-prefix rule judges the **union of your working tree and the tip of the base ref**, because that union is the tree the merge will produce: migrations are only ever added, never renamed and never deleted. It reports a prefix when at least one of the colliding files is absent from the base — the half you are adding.

It deliberately does **not** use the merge-base, and it deliberately does not require your branch to have touched a migration at all. Until 2026-09-10 it did both, and the result was the 110/111 cohort above: branch A adds `110_a`, branch B adds `110_b`, neither has rebased so neither merge-base contains the other's file, each sees the prefix used exactly once, both pass, main collides. Nothing re-checked after the merge, so nothing ever reported it.

A collision that already exists wholly on main is **not** reported on a branch — otherwise one bookkeeping error would fail every unrelated PR. That case belongs to the trunk pass:

```bash
pnpm exec tsx ./scripts/check-migration-hygiene.ts --all
```

`--all` drops the base comparison and judges the whole tree. CI infers it automatically on `push: main`, where the base tip _is_ HEAD. That is the post-merge alarm. Before a merge, the merge-queue run (`merge_group`) judges the tree `main` will have once the entry lands, so it is what stops two concurrently queued PRs taking the same prefix.

#### Never renumber an applied migration

`schema_migrations` declares `filename TEXT PRIMARY KEY`. The filename **is** the ledger key.

Renaming `110_add_user_id_to_skill_usage_events.sql` to `112_…` therefore does two things at once on every database that applied it: the runner stops recognizing the file as applied and re-runs it, and the original ledger row survives naming a file that no longer exists. Migrations here are written idempotent so the re-run is probably survivable — but "probably survivable" is not a migration strategy. The runner also checksums applied migrations and warns on drift, so editing one in place is not an escape either.

What counts is which databases you cannot throw away. **Once a migration merges to `main` it is on the shared dev DB and on every deployed box: grandfather it and record why, never rename it.** Before merge, a branch's migrations run on a disposable database (`pnpm worktree:db isolate`, removed with the worktree), so renumbering to dodge a prefix another branch took is routine and costs nothing. The one leak is a branch migration applied to the shared dev DB, which the shared-DB guard refuses in a worktree but not in the primary checkout; renumbering then leaves an orphan row there, cleaned up per [`databases/AGENTS.md` § Ledger orphans](../AGENTS.md#ledger-orphans).

#### Numeric prefix vs timestamp prefix — decided 2026-09-10: keep numeric

A timestamp prefix (`20260909T1200_…`) is the only scheme that makes a collision structurally impossible rather than merely detected, so it was evaluated properly (OT plan `21841c4f`). The decision is **keep `NNN_`**, for four reasons:

1. **A duplicate prefix has never been a correctness bug.** Application order stays well-defined under lexicographic sort either way. It is an identity and tooling problem, and identity problems are exactly what a cheap static check is good at.
2. **The failure is now detected on both sides of the merge** — pre-merge against the base tip, post-merge on the trunk. The residual cost of the numeric scheme is "rename your file before it merges", which is seconds.
3. **Adoption would be permanent and mixed.** Nothing existing can be renamed (see above), so the directory would carry both schemes forever. That sort is correct only by accident: every current prefix is `0xx` or `1xx`, which sorts before `2026…`. It breaks at **`202_`** — the first numeric prefix that sorts _after_ a 2026 timestamp, because `_` (0x5F) is greater than `6` (0x36). Today's high-water mark is `111`, so that is roughly 90 migrations of headroom, not infinite.
4. **Concurrency pressure is low.** The collisions came from one contributor running parallel agent branches, not from a team racing.

**Revisit when any of these becomes true** — do not re-litigate before then:

- Two or more people are routinely landing migrations in the same week.
- The duplicate-prefix rule fires more than about three times in a quarter, i.e. the renumbering tax is real rather than theoretical.
- The numeric sequence approaches **`190`**, which is the point at which the mixed-scheme sort break at `202_` stops being comfortably far away.

If it is revisited, the migration is new-files-only by construction, and the shared runner (`filterSortSqlFiles` in `databases/migration-runner.ts`) needs an explicit comparator rather than a bare `.sort()` before the first timestamped file lands.
