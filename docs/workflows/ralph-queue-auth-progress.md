# Ralph queue auth and session progress

**Purpose:** Single living log when debugging OpenThrottle Developer UI → BullMQ → spawned `workflow-ralph` / Claude auth spans multiple OpenThrottle (OT) plans. Update a row after each meaningful test or code change.

**Related OT plans**

| Plan ID                                | Title                                                                      | Status      |
| -------------------------------------- | -------------------------------------------------------------------------- | ----------- |
| `7aafef66-8b91-42be-9d5a-20465df32261` | Debug Ralph workflow: Claude Code prompts /login despite existing session  | Completed   |
| `002f6dd9-c013-4348-8cf3-b49b1ab80641` | BullMQ Ralph from Dev UI: durable progress doc + session for child process | In progress |

## How to use

1. Before a test run, add a new row (or duplicate the last row and edit) with today’s date and the OT plan id you are executing under.
2. Note **entrypoint**: `Dev UI`, `CLI (pnpm exec workflow-ralph)`, `Docker worker`, etc.
3. Capture **symptom** in one line (e.g. `/login` in terminal, missing `ANTHROPIC_API_KEY`, wrong `HOME`).
4. When you learn something concrete, fill **finding** and optional **PR / commit**.
5. At plan wrap-up, point the plan `summary` field at this file and the last row.

## Progress log

| Date (UTC) | OT plan id                             | Entrypoint                      | Symptom                                                   | Finding                                                                                                                                     | PR / commit |
| ---------- | -------------------------------------- | ------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 2026-05-11 | `7aafef66-8b91-42be-9d5a-20465df32261` | Queue / processor investigation | Claude or flow surfaces `/login` under queue-driven Ralph | Prior plan: compared interactive vs worker HOME, env propagation, spawn wiring; see plan tasks for details                                  | —           |
| 2026-05-11 | `002f6dd9-c013-4348-8cf3-b49b1ab80641` | Dev UI → BullMQ (pending repro) | Child process lacks operator interactive session          | **Open:** reproduce from Dev UI; diff env/cwd vs successful CLI; choose fix (env allowlist, mounts, API key path, or documented limitation) | —           |

## Quick verification checklist (queue path)

Use this when you believe auth is fixed; adjust commands to match your local compose and env.

- [ ] Worker logs show expected `HOME` and cwd for the child job.
- [ ] Required secrets or Claude config paths are present inside the worker (or explicitly documented as host-only with a workaround).
- [ ] Enqueue from **OpenThrottle Developer UI** completes a short plan iteration without an unexpected `/login` or auth redirect loop.
- [ ] Same machine: `pnpm exec workflow-ralph --plan <uuid>` still succeeds (regression check).

## References (code)

- `applications/openthrottle-server/src/queues/workflow/workflow.processor.ts`
- `packages/nestjs-worktrees/src/utils/child-job.ts` (and app-local copies under `tools/workflows` if applicable)
- `tools/workflows/README.md`
