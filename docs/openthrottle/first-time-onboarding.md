# First-time onboarding: OpenThrottle MCP after setup

This playbook is for someone who has already configured the **openthrottle-mcp** MCP and can run **openthrottle-server** (and optionally the developer app). It describes what to do next, how the pieces fit together, and gives a copy-paste **prompt sequence** for a minimal end-to-end exercise in your own repo.

**Related:** Schema, migrations, embeddings, and commit-link conventions live in [`databases/README.md`](../../databases/README.md). MCP smoke checks and env alignment are in [`packages/openthrottle-mcp/docs/verification-environment.md`](../../packages/openthrottle-mcp/docs/verification-environment.md).

---

## Quick start

**New clone?** Follow [local-quickstart.md](./local-quickstart.md) first (env → migrate → [bootstrap tokens](#bootstrap-and-auth) → server → verify MCP), then return here.

1. Confirm [Prerequisites](#prerequisites-checklist) (server up, MCP pointed at GraphQL, token env).
2. Read the [Mental model](#mental-model-post-setup) so you know when to use OT MCP vs docs-MCP vs repo rules.
3. Run the [Prompt sequence](#prompt-sequence-minimal-e2e) in Cursor to complete one trivial but real workflow (search → plan → task → commit).
4. If something fails, use [Troubleshooting](#troubleshooting).

---

## Bootstrap and auth

Before MCP tools can create or list plans, you need a long-lived **service account** bearer token — not a human JWT from the developer UI.

| Step                                            | Command / doc                                                                                                                                 |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Migrate (includes service-account seed **045**) | `pnpm run database:migrate` — see [local-quickstart § Database](./local-quickstart.md#2-database-start-and-migrate)                           |
| Mint tokens (shown once)                        | `pnpm run database:bootstrap-service-accounts` — see [local-quickstart § Bootstrap](./local-quickstart.md#3-bootstrap-service-account-tokens) |
| Set env                                         | Copy `OPENTHROTTLE_MCP_AUTH_TOKEN` into `applications/openthrottle-server/.env` and Cursor MCP `env` for **openthrottle-mcp**                 |
| Understand token types, rotation, Cursor `env`  | [AUTH.md](../../packages/openthrottle-mcp/docs/AUTH.md)                                                                                       |

If bootstrap skips an account because a credential already exists, rotate per [AUTH.md § Credential rotation](../../packages/openthrottle-mcp/docs/AUTH.md#credential-rotation) or revoke in admin GraphQL, then re-run the script.

---

## Prerequisites checklist

Use this before relying on OT tools in the agent.

| Check                                                           | Notes                                                                                                                                                                                                                                                                                             |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Postgres + Redis up; migrations applied                         | See [run-openthrottle-server-developer.md](./run-openthrottle-server-developer.md) (`pnpm run database:start`, `pnpm run database:migrate`).                                                                                                                                                      |
| **Service account token** minted and in env                     | `pnpm run database:bootstrap-service-accounts` → `OPENTHROTTLE_MCP_AUTH_TOKEN` in server `.env` and MCP config. [AUTH.md](../../packages/openthrottle-mcp/docs/AUTH.md).                                                                                                                          |
| **openthrottle-server** running                                 | GraphQL defaults to `http://localhost:6021/graphql` (see server `.env`).                                                                                                                                                                                                                          |
| MCP **`API_URL` / `API_URL_INTERNAL`** match the server         | See [verification-environment.md](../../packages/openthrottle-mcp/docs/verification-environment.md).                                                                                                                                                                                              |
| **`OPENTHROTTLE_MCP_AUTH_TOKEN`** (and server embedding config) | Auth: [AUTH.md](../../packages/openthrottle-mcp/docs/AUTH.md). Embeddings: **`OPENAI_API_KEY`** or **`OLLAMA_*`** on **`applications/openthrottle-server/.env`** — `scripts/run-openthrottle-mcp.sh` does not require a root OpenAI key; Ollama-only: [run-locally-oss.md](./run-locally-oss.md). |
| Cursor registers **openthrottle-mcp**                           | `.cursor/mcp.json` or [`.cursor/mcp.json.example`](../../.cursor/mcp.json.example); restart Cursor after changes.                                                                                                                                                                                 |

For database layout, imports, and PRD-style fields on plans/tasks, see [`databases/README.md`](../../databases/README.md).

---

## Mental model (post-setup)

- **OpenThrottle (OT)** stores plans, tasks, embeddings for semantic search over that knowledge, and plan output streams. Agents reach it only via **GraphQL** through **openthrottle-mcp** — not by writing ad hoc Markdown plans in the repo.
- **docs-mcp** searches ingested **repository documentation** (`docs/`). Use it for “what does this repo say about X?” Use **openthrottle-mcp** for “what plans/tasks exist?” and OT-specific tools (`semantic_search`, `list_sources`, `create_plan`, …).
- **Workspace rules** (e.g. [.cursor/rules/commands/openthrottle.mdc](../../.cursor/rules/commands/openthrottle.mdc)) define when to use which OT tool and that **plans/tasks belong in OT**, not in new Markdown plan files under `docs/`.
- **Optional automation:** [workflow-ralph](../../tools/workflows/README.md) and worktrees are advanced paths; you can ignore them until after your first successful manual flow.

### When to use which tool

| Question or intent                            | Use                                                                                                              |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| “What plans/tasks exist?” / status lists      | **openthrottle-mcp** — `list_plans_by_status`, `get_plan`, `get_tasks_by_plan_id`                                |
| “Find plans about X” (meaning, not filenames) | **openthrottle-mcp** — `semantic_search`, then `get_document` for a chunk                                        |
| “What’s in the OT knowledge base?”            | **openthrottle-mcp** — `list_sources`                                                                            |
| “What does this repo’s docs say about X?”     | **docs-mcp** (ingested `docs/`)                                                                                  |
| Create or update a plan/task                  | **openthrottle-mcp** — `create_plan`, `create_task`, `update_task` (never a new plan `.md` in `docs/`)           |
| Log agent iteration output for a plan         | **openthrottle-mcp** — `append_plan_output`                                                                      |
| Tie landed work on `main` to a plan           | After PR merge — `link_commit` or `workflow-link-merge` (see [`databases/README.md`](../../databases/README.md)) |

---

## Prompt sequence (minimal E2E)

Ordered prompts you can paste into the agent. Replace bracketed placeholders with your topic and repo context. Expected outcomes are noted so you can verify each step.

### 1. Warm-up — ask OT

```
Using OpenThrottle MCP only, run semantic_search with query "local onboarding" and limit 5.
Summarize what you found from the retrieved chunks only; do not invent plan content.
```

**Expected:** Bullet summary citing real chunk content, or a clear “nothing relevant found.”

### 2. Create a small plan

```
Create a plan via MCP with title "Onboarding smoke test" and category "documentation".
Add two tasks:
1) "Confirm MCP health tool works"
2) "Add one line to a scratch file in this repo"
Reply with the plan UUID and both task UUIDs.
```

**Expected:** Real UUIDs from `create_plan` / `create_task` (not fabricated).

### 3. Complete one task with traceability

Use the plan and task UUIDs from step 2.

```
Complete the first task from plan <PLAN_UUID> (task <TASK_UUID>).
Make a minimal change (e.g. add a one-line comment in README or a scratch note).
Commit with a conventional commit message and include in the commit body:
Plan-Id: <PLAN_UUID>
Task-Id: <TASK_UUID>
Then update the task status to completed via MCP.
```

**Expected:** One git commit with `Plan-Id` / `Task-Id` footers; task marked completed in OT.

### 4. Confirm visibility

```
Call list_sources via MCP and list_plans_by_status with status "pending".
Summarize how many sources and pending plans you see.
```

**Expected:** Tool results from GraphQL, not guessed counts.

---

## Troubleshooting

| Symptom                              | What to check                                                                                                                                                                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MCP tools missing or “not connected” | Cursor MCP config, restart Cursor; `API_URL_INTERNAL` matches server port ([verification-environment.md](../../packages/openthrottle-mcp/docs/verification-environment.md)).                                                    |
| GraphQL errors / 401 / 403           | Token: `OPENTHROTTLE_MCP_AUTH_TOKEN`; server `APP_ENABLE_AUTHENTICATION=true`. [AUTH.md](../../packages/openthrottle-mcp/docs/AUTH.md). Re-run [bootstrap](./local-quickstart.md#3-bootstrap-service-account-tokens) if needed. |
| Bootstrap script skips account       | Active credential already exists — rotate per [AUTH.md § Credential rotation](../../packages/openthrottle-mcp/docs/AUTH.md#credential-rotation).                                                                                |
| Empty search / no embeddings         | Data imported? Embedding keys and dimension strategy in [`databases/README.md`](../../databases/README.md).                                                                                                                     |
| Agent writes a plan to a `.md` file  | Redirect it: plans belong in OT via MCP; see [.cursor/rules/commands/openthrottle.mdc](../../.cursor/rules/commands/openthrottle.mdc).                                                                                          |

---

## Related documentation

| Topic                                        | Location                                                                                        |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Fresh clone → server + MCP                   | [local-quickstart.md](./local-quickstart.md)                                                    |
| Service account tokens and MCP `env`         | [AUTH.md](../../packages/openthrottle-mcp/docs/AUTH.md)                                         |
| Run server + developer app locally           | [run-openthrottle-server-developer.md](./run-openthrottle-server-developer.md)                  |
| MCP verification, env, smoke checks          | [verification-environment.md](../../packages/openthrottle-mcp/docs/verification-environment.md) |
| MCP config template                          | [`.cursor/mcp.json.example`](../../.cursor/mcp.json.example)                                    |
| DB schema, migrations, imports, commit links | [databases/README.md](../../databases/README.md)                                                |
| OT MCP tool choice and skills                | [openthrottle.mdc](../../.cursor/rules/commands/openthrottle.mdc), `.cursor/skills/ot-*`        |
| Workflow CLI / Ralph (optional)              | [tools/workflows/README.md](../../tools/workflows/README.md)                                    |
| OSS / Ollama path                            | [run-locally-oss.md](./run-locally-oss.md)                                                      |
