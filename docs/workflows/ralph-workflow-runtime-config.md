# Ralph workflow runtime configuration (design note)

**Scope:** How operators configure `workflow-ralph` runs without hard-coding a single path. Complements [`ralph-design.md`](./ralph-design.md), [`ralph-per-package-config-adr.md`](./ralph-per-package-config-adr.md) (file schema, precedence, env classification), and [`tools/workflows/README.md`](../../tools/workflows/README.md).

## Mental model: three independent knobs

Think in three layers. They answer different questions; mixing them causes confusion (e.g. a “Marketing **agent**” in product language is usually a **prompt profile**, not the binary that runs the loop).

| Layer                    | Question                                  | Role                                                                                                                                                                                                                                                                                                                    |
| ------------------------ | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Prompt**            | _How should the model approach the work?_ | Supplies context, persona, and constraints—how to read the plan, which tools matter, tone, and domain (e.g. marketing copy vs SEO vs default Ralph). **Default:** Ralph (`/agents/ralph` via `--prompt`).                                                                                                               |
| **2. Execution backend** | _Which tool runs each agentic iteration?_ | **Implemented:** `cursor` (Cursor `cursor-agent`) or `claude` (Anthropic Claude Code CLI). Exactly **one** backend id applies to the **entire** plan run (`--backend`, `WORKFLOW_RALPH_BACKEND`, or `backend` in `.workflow-ralph.json`). Persisted on plan runs in OpenThrottle for auditing when enqueue supplies it. |
| **3. Run tuning**        | _How long and how loud?_                  | Iteration cap, timeouts, debug, model preset when the backend supports it, project context, etc.—anything useful from `pnpm exec workflow-ralph --help`.                                                                                                                                                                |

**Why separate prompt from backend:** A “SEO prompt” or “Marketing prompt” is a **content and behavior preset** (layer 1). Choosing **Cursor vs another runner** (layer 2) is an **integration and capability** choice. You should be able to pair a given prompt with a given backend where supported, subject to what that backend can load and how it maps `--prompt` / files.

## Goals

- **Selectable prompt profile** — Point at the command or file that defines _how_ to tackle the plan (default Ralph; optional profiles such as domain- or team-specific agents implemented as Cursor commands or shared prompt files).
- **Selectable execution backend** — Run the same Ralph loop with **either** Cursor or Claude Code CLI (`pnpm exec workflow-ralph --help`); same prompt injection and parser contract for both where supported.
- **Configurable run limits and flags** — Iterations, timeouts, model selection where applicable, debug, and other flags stay discoverable and overridable (`pnpm exec workflow-ralph --help`).

## Config surface (principles)

- **Ad-hoc runs:** Prefer **explicit CLI flags** so invocations are copy-pasteable and visible in logs. Today: `--plan` / `--task`, `--backend`, `--prompt`, `--model`, `--iterations`, `--project`, `--iteration-timeout`, debug flags (see `--help`).
- **Defaults:** **Environment variables** (`WORKFLOW_RALPH_*`, spawn/diagnostics vars; see `pnpm exec workflow-ralph --help`) and optional **repo-local** `.workflow-ralph.json` in process cwd (JSON schema: `tools/workflows/schemas/workflow-ralph.defaults.schema.json`). Fields include run tuning (`backend`, `prompt` / `promptFile`, `iterations`, `iterationTimeout`, `model`, `project`, worktree flags), **debug** (`omit` | `debug` | `verbose`), **transport** (`graphql` | `postgres-direct`), **spawn** (`home`, `xdgConfigHome`, `otRoot`), **diagnostics** (`ot`, `spawn`), and **lifecycleHooksChildJobs**. Precedence: **CLI overrides env overrides file defaults** over built-ins (see `WORKFLOW_RALPH_CONFIG_PRECEDENCE` in `@tools/workflows`).
- **Composition:** Nested invocations (`runChildJob`, processors, worktrees) must **forward the same three layers** so automated runs match manual CLI behavior. Programmatic `runChildJob` and BullMQ job payloads accept optional `ralph` tuning (including `backend`) alongside plan id and iterations.

## Phased scope

1. **Phase 1 — Prompt + iterations + flags** — Treat `--prompt` (default Ralph) and iteration/timeout/model/debug flags as first-class across CLI, env, and programmatic callers. Keep backward compatibility when options are omitted.
2. **Phase 2 — Execution backend abstraction** — **Implemented:** `--backend cursor|claude`, env, and defaults file; dispatch in `tools/workflows/src/bin/run-iteration.ts`. Nested queue jobs merge persisted execution backend when tuning omits `backend` (see `mergeRalphNestedRunTuningWithExecutionBackend` in `@tools/workflows`).
3. **Phase 3 — Richer prompt delivery** — **Implemented:** In addition to command-style `--prompt` (default `/agents/ralph`), you can pass prompt **text** via `--prompt-file <path>` (UTF-8 file, path relative to cwd or absolute) or `--prompt-stdin` (pipe stdin; not on a TTY). Defaults: `WORKFLOW_RALPH_PROMPT_FILE` and optional `promptFile` in `.workflow-ralph.json` (mutually exclusive with `WORKFLOW_RALPH_PROMPT` / `prompt` in the same layer). Precedence remains **CLI > env > file > built-ins**. `--prompt`, `--prompt-file`, and `--prompt-stdin` are mutually exclusive on the CLI. Nested runs (`runChildJob`) forward `promptFile` as `--prompt-file` when set (over `--prompt`). Point `--prompt-file` at the canonical command file (e.g. `.cursor/commands/agents/ralph.md`) instead of copying it.

## Non-goals and risks

- **Avoid duplicating prompt sources** — One canonical Ralph prompt (e.g. `.cursor/commands/agents/ralph.md`) plus named variants; no shadow copies in code unless migrated deliberately.
- **Avoid naming collisions** — In docs and UI, prefer **prompt profile** / **prompt** for layer 1 and **runner** / **execution backend** for layer 2 so “agent” is not overloaded.
- **Backward compatibility** — `pnpm exec workflow-ralph --plan <uuid>` (and `--task`) without extra flags must behave as today.
- **Scope creep** — Full hosted “Ralph as a service” or arbitrary remote config is out of scope for this note.

## References

- Canonical workflow: [`ralph-design.md`](./ralph-design.md)
- **Migration:** [`ralph-config-migration.md`](./ralph-config-migration.md)
- Per-package ADR: [`ralph-per-package-config-adr.md`](./ralph-per-package-config-adr.md)
- Package README and debugging: [`tools/workflows/README.md`](../../tools/workflows/README.md)
- CLI surface: `pnpm exec workflow-ralph --help` (see `tools/workflows/src/config/messages.ts`)
