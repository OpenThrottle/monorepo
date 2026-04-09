# 🧰 @openthrottle/ai-mcp

MCP server for plans knowledge base (semantic search over Cortex Postgres).

## Deprecation (direct Postgres)

**Direct Cortex Postgres access from this package is deprecated.** Prefer **@openthrottle/mcp-developer** for all Cortex MCP tools (see `packages/openthrottle/mcp-developer/README.md`). mcp-developer talks to Cortex **via GraphQL only** (openthrottle-server); it does not connect to Postgres. It has feature parity with ai-mcp (notes, plans, tasks, commit links, activity, output stream, search, health). See [DEPRECATION.md](./DEPRECATION.md) for migration. This package remains available for legacy or transition; new usage should use mcp-developer.

## Environment

- **Cortex Postgres** — connection uses either:
  - **`POSTGRES_URL`** — full connection string (e.g. `postgresql://user:pass@host:port/db`), or
  - **`POSTGRES_*`** — `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` (see `.env.default` and `databases/cortex/README.md`).
- **Embeddings** — either:
  - **OpenAI** — set **`OPENAI_API_KEY`** so the server can embed queries with `text-embedding-3-small` (1536 dimensions); or
  - **Ollama (local)** — set **`OLLAMA_BASE_URL`** (default `http://localhost:11434`) and/or **`OLLAMA_EMBEDDING_MODEL`** (e.g. `nomic-embed-text`). When either is set, Ollama is used for embeddings; when neither is set, OpenAI is used. See root `.env.default` and `databases/cortex/README.md` § Embedding dimension strategy.

No raw SQL or credentials are exposed to the MCP client.

## Is Cortex running?

**Quick check:** Invoke the **`health`** tool from Cursor (MCP Tools) or [MCP Inspector](https://github.com/modelcontextprotocol/inspector). It returns `server: ok` and `cortex: not_configured` | `reachable` | `unreachable`.

Steps:

1. **Start Cortex** (if needed): from repo root, `docker compose -f docker-compose-databases.yml up -d cortex`. See `databases/cortex/README.md` for env and migrations.
2. **From Cursor:** In the MCP Tools panel, call the **`health`** tool (no arguments). You get `server: ok` and either `cortex: not_configured`, `cortex: reachable`, or `cortex: unreachable`.
3. **Server-only ping (default):** Calling **`health`** with no arguments only verifies the MCP server is responding. Pass `checkDb: true` to also verify Cortex Postgres.
4. **From the terminal:** Run `pnpm nx run @openthrottle/ai-mcp:serve` and connect with MCP Inspector, then call the `health` tool.

## Tools and resources

- **`health`** — health check: returns server ok and optionally whether Cortex Postgres is reachable. Argument: optional `checkDb` (boolean; default false). Set `checkDb: true` to verify Cortex DB; omit for a fast server-only ping.
- **`semantic_search`** — search the plans knowledge base by meaning (vector similarity over plan/task chunks). Arguments: `query` (string), optional `limit` (1–50).
- **`get_document`** — fetch a single chunk by id (UUID from plan_embeddings or task_embeddings). Argument: `id` (UUID string). Use after `semantic_search` to read full chunk content.
- **`list_sources`** — list knowledge-base sources (`plan`, `task`) and plan titles from Cortex. No arguments.
- **`list_plans_by_status`** — list plans in Cortex filtered by status (from plan JSON metadata). Argument: `status` (string, e.g. `BACKLOG`, `BLOCKED`, `CANCELED`, `COMPLETED`, `IN_PROGRESS`, `PENDING`, `SKIPPED`). Use to answer e.g. "what plans are pending?". Status semantics: canceled = closed with no work; completed = work done; skipped = deferred or skipped for now.
- **`append_plan_output`** — append a chunk of streaming output (e.g. agent iteration log) to a plan. Arguments: `planId` (UUID), `content` (string), optional `iteration` (integer).
- **`get_plan_output`** — fetch all streaming output chunks for a plan, ordered by created_at ascending. Argument: `planId` (UUID).
- **`get_activity_by_date`** — fetch activity (commits, plan output chunks, tasks updated) for "worked on / shipped on X date or X days ago" answers. Arguments: optional `date` (YYYY-MM-DD) for that day, or optional `daysBack` (1–365) for the last N days. Uses `commit_links`, `plan_output_stream`, and task `updated_at`.
- **`get_last_activity`** — answer "What was the last thing we did for \<plan\> or \<task\>?" Returns the single most recent activity: last commit (commit_links), last plan output chunk, or last task update. Arguments: `planId` (UUID), optional `taskId` (UUID) to scope to that task.
- **`list_tasks_by_category`** — list tasks filtered by category (e.g. infra, documentation) across plans. Use when you need tasks for a given category rather than per-plan. Arguments: `category` (required); optional `status`, `planId` (UUID), `limit` (1–200). Returns task list (each task includes `planId`, `id`, `title`, `description`, `category`, `status`, etc.) ordered by `created_at`.
- **`link_commit`** — associate a git commit with a plan (and optionally a task). Arguments: `planId` (UUID), `repo` (string), `sha` (string); optional `taskId` (UUID), `message` (string). Use after `/github/commit` in Ralph so commits are linked to the plan/task.
- **In progress and recently worked on:** Use `list_plans_by_status("IN_PROGRESS")` plus `get_activity_by_date(daysBack)` (e.g. 7) to answer "What am I currently working on, in progress, and recently worked on?"
- **Resource `knowledge-base://chunk/{id}`** — read a chunk by id via MCP resources. URI format: `knowledge-base://chunk/{id}`.

## Building

Run `pnpm nx run @openthrottle/ai-mcp:build` to build the library.

## Running the MCP server (stdio for Cursor)

- **Via Nx:** `pnpm nx run @openthrottle/ai-mcp:serve` (builds then runs the server on stdio).
- **Via npx (after publish):** `npx @openthrottle/ai-mcp`.
- **From package dir:** `node dist/bin.js` (after `pnpm nx run @openthrottle/ai-mcp:build`).
