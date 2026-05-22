# First-time onboarding: OpenThrottle MCP after setup

This playbook is for someone who has already configured the **mcp-developer** MCP and can run **openthrottle-server** (and optionally the developer app). It describes what to do next, how the pieces fit together, and gives a copy-paste **prompt sequence** for a minimal end-to-end exercise in your own repo.

**Related:** Schema, migrations, embeddings, and commit-link conventions live in [`databases/README.md`](../../databases/README.md). MCP smoke checks and env alignment are in [`packages/mcp-developer/docs/verification-environment.md`](../../packages/mcp-developer/docs/verification-environment.md).

---

## Quick start

**New clone?** Follow [local-quickstart.md](./local-quickstart.md) first (env → migrate → bootstrap → server → verify MCP), then return here.

1. Confirm [Prerequisites](#prerequisites-checklist) (server up, MCP pointed at GraphQL, token env).
2. Read the [Mental model](#mental-model-post-setup) so you know when to use OT MCP vs docs-MCP vs repo rules.
3. Run the [Prompt sequence](#prompt-sequence-minimal-e2e) in Cursor to complete one trivial but real workflow (search → plan → task → commit).
4. If something fails, use [Troubleshooting](#troubleshooting).

Later sections in this file will be expanded as the onboarding plan tasks complete (prerequisites detail, full prompt script, optional Ralph/worktrees).

---

## Prerequisites checklist

Use this before relying on OT tools in the agent.

| Check                                                                    | Notes                                                                                                                                        |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Postgres + Redis up; migrations applied                                  | See [run-openthrottle-server-developer.md](./run-openthrottle-server-developer.md) (`pnpm run database:start`, `pnpm run database:migrate`). |
| **openthrottle-server** running                                          | GraphQL defaults to `http://localhost:6021/graphql` (see server `.env`).                                                                     |
| MCP **`API_URL` / `API_URL_INTERNAL`** match the server                  | See [verification-environment.md](../../packages/mcp-developer/docs/verification-environment.md).                                            |
| **`MCP_DEVELOPER_AUTH_TOKEN`** (and any embedding keys your stack needs) | Same doc; root `.env` often holds `OPENAI_API_KEY` for the MCP wrapper script.                                                               |
| Cursor registers **mcp-developer**                                       | `.cursor/mcp.json`; restart Cursor after changes.                                                                                            |

For database layout, imports, and PRD-style fields on plans/tasks, see [`databases/README.md`](../../databases/README.md).

---

## Mental model (post-setup)

- **OpenThrottle (OT)** stores plans, tasks, embeddings for semantic search over that knowledge, and plan output streams. Agents reach it only via **GraphQL** through **mcp-developer** — not by writing ad hoc Markdown plans in the repo.
- **docs-mcp** searches ingested **repository documentation** (`docs/`). Use it for “what does this repo say about X?” Use **mcp-developer** for “what plans/tasks exist?” and OT-specific tools (`semantic_search`, `list_sources`, `create_plan`, …).
- **Workspace rules** (e.g. [.cursor/rules/commands/openthrottle.mdc](../../.cursor/rules/commands/openthrottle.mdc)) define when to use which OT tool and that **plans/tasks belong in OT**, not in new Markdown plan files under `docs/`.
- **Optional automation:** [workflow-ralph](../../tools/workflows/README.md) and worktrees are advanced paths; you can ignore them until after your first successful manual flow.

_(This section will gain a tighter checklist and tool-choice table in the same onboarding effort.)_

---

## Prompt sequence (minimal E2E)

Ordered prompts you can paste into the agent (adjust names to your repo). Expected outcomes are noted so you can verify each step.

1. **Warm-up — ask OT**
   - _Prompt (example):_ “Using OpenThrottle MCP only, run `semantic_search` with query `<your topic>` and limit 5. Summarize what you found.”
   - _Expected:_ Retrieved chunks from the OT KB, no invented plan content.

2. **Create a small plan**
   - _Prompt (example):_ “Create a plan via MCP with title `<short title>` and two tasks: (1) `<task A>` (2) `<task B>`. Reply with plan id and task ids.”
   - _Expected:_ Real UUIDs from `create_plan` / `create_task`.

3. **Complete one task with traceability**
   - _Prompt (example):_ “Complete task `<task id>` with a small doc or code change. Commit using a conventional commit message and include `Plan-Id: <plan uuid>` and `Task-Id: <task uuid>` in the commit body.”
   - _Expected:_ One commit that ties work to OT; optional follow-up to mark the task completed via MCP.

4. **(Optional) List sources or pending plans**
   - _Prompt:_ “Call `list_sources`” or “`list_plans_by_status` with status `pending`” to confirm visibility.

_(The plan’s dedicated task will replace examples with a single concrete scenario and exact copy-paste blocks.)_

---

## Troubleshooting

| Symptom                              | What to check                                                                                                                                                             |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MCP tools missing or “not connected” | Cursor MCP config, restart Cursor; `API_URL_INTERNAL` matches server port ([verification-environment.md](../../packages/mcp-developer/docs/verification-environment.md)). |
| GraphQL errors / 401                 | Token: `MCP_DEVELOPER_AUTH_TOKEN` and server auth ([../../packages/mcp-developer/docs/AUTH.md](../../packages/mcp-developer/docs/AUTH.md) if applicable).                 |
| Empty search / no embeddings         | Data imported? Embedding keys and dimension strategy in [`databases/README.md`](../../databases/README.md).                                                               |
| Agent writes a plan to a `.md` file  | Redirect it: plans belong in OT via MCP; see [.cursor/rules/commands/openthrottle.mdc](../../.cursor/rules/commands/openthrottle.mdc).                                    |

---

## Related documentation

| Topic                                        | Location                                                                                                              |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Run server + developer app locally           | [run-openthrottle-server-developer.md](./run-openthrottle-server-developer.md)                                        |
| MCP verification, env, smoke checks          | [verification-environment.md](../../packages/mcp-developer/docs/verification-environment.md)                          |
| DB schema, migrations, imports, commit links | [databases/README.md](../../databases/README.md)                                                                      |
| OT MCP tool choice and commands              | [openthrottle.mdc](../../.cursor/rules/commands/openthrottle.mdc), [.cursor/commands/ot/](../../.cursor/commands/ot/) |
| Workflow CLI / Ralph (optional)              | [tools/workflows/README.md](../../tools/workflows/README.md)                                                          |
| OSS / Ollama path                            | [run-locally-oss.md](./run-locally-oss.md)                                                                            |
