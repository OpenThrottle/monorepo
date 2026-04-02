# Ralph workflow runtime configuration (design note)

**Scope:** How operators configure `workflow-ralph` runs—execution agent, iteration limits, and (later) custom prompts—without hard-coding a single path. Complements the workflow behavior in [`ralph-design.md`](./ralph-design.md) and [`tools/workflows/README.md`](../../tools/workflows/README.md).

## Goals

- **Selectable execution agent** — Choose which Cursor/agent profile runs the loop (e.g. different models or agent presets for cost vs. quality), without forking Ralph into multiple binaries.
- **Configurable iteration cap** — Operators must be able to bound work per run (`--iterations` already exists; defaults and programmatic callers should stay aligned).
- **Path toward optional custom prompts** — Support system/user prompt overrides when the runner can apply them, without blocking an MVP that uses the default `/agents/ralph` (or `--prompt`) behavior.

## Config surface (principles)

- **Ad-hoc runs:** Prefer **explicit CLI flags** on `pnpm exec workflow-ralph` so invocations are copy-pasteable and observable in logs. Current entry points: `--plan` / `--task`, plus options such as `--iterations`, `--model`, `--prompt`, `--project`, `--iteration-timeout`, and debug flags (see `pnpm exec workflow-ralph --help`).
- **Defaults:** Use **environment variables** and, where helpful, a **small config file** (e.g. repo-local) so teams do not repeat the same flags. Precedence should be documented when implemented: typically **CLI overrides env overrides file defaults**.
- **Composition:** Nested invocations (e.g. `runChildJob` spawning `workflow-ralph` from BullMQ or worktrees) must forward the same options so behavior matches a manual CLI run.

## Phased scope

1. **Phase 1 — Agent + iteration limit as first-class options** — Expose execution agent selection and iteration limits consistently in the CLI, env, and any programmatic API (`child-job`, processors). Keep backward compatibility: omitting new flags preserves today’s defaults.
2. **Phase 2 — Prompt overrides behind a clear interface** — Once the runner can inject arbitrary system/user content safely, add overrides via **file path** or **stdin** (and document interaction with `--prompt`). Do not duplicate agent definitions in multiple places; reference existing Cursor command/prompt files or a single source of truth.

## Non-goals and risks

- **Avoid duplicating agent definitions** — One canonical prompt path (e.g. `.cursor/commands/agents/ralph.md`) plus optional overrides; no parallel “Ralph prompt v5” in code unless migrated deliberately.
- **Backward compatibility** — Existing `pnpm exec workflow-ralph --plan <uuid>` (and `--task`) invocations without new flags must behave as they do today.
- **Scope creep** — Full “Ralph as a service” UI or arbitrary remote config is out of scope for this note; focus on CLI/config clarity for operators and integrators.

## References

- Canonical workflow: [`ralph-design.md`](./ralph-design.md)
- Package README and debugging: [`tools/workflows/README.md`](../../tools/workflows/README.md)
- Help text: `pnpm exec workflow-ralph --help` (see `tools/workflows/src/config/messages.ts`)
