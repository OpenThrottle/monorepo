# Ralph `--worktree` flag (agent CLI)

OpenThrottle can pass **cursor-agent** and **Claude Code** their native `-w` / `--worktree` flag during Ralph iterations. This is **complementary** to the BullMQ **physical git worktree** model (`WORKTREE_TARGETS`, `runWorktreeWorkflow`, `cwd: handoff.worktreePath`).

## Two layers

| Layer                                | What it does                                                                                                                                 | Controlled by                                            |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| **Physical worktree (OpenThrottle)** | Acquires a repo directory, locks a target, runs `git` / `pnpm` / nested `workflow-ralph` with `cwd = worktreePath`                           | `WORKTREE_TARGETS`, `runWorktreeWorkflow`, `runChildJob` |
| **Agent CLI worktree**               | Tells `cursor-agent` or `claude` to use an isolated worktree under their default roots (`~/.cursor/worktrees/…` or Claude’s worktree layout) | `--worktree [name]` on each iteration                    |

Physical binding stays **cwd-based** for git, nx, and nested `pnpm exec workflow-ralph`. The agent flag does **not** replace `cwd`; it aligns the runner with the same isolation model you get when invoking the CLIs manually with `-w`.

## Precedence (effective worktree name)

### Inside one `workflow-ralph` process

Highest wins:

1. **CLI** — `workflow-ralph --worktree [name]` (flag alone → agent default name; next token is the name unless it starts with `--`)
2. **Environment** — `WORKFLOW_RALPH_WORKTREE` (non-empty value = name; unset = not from env)
3. **Repo file** — `.workflow-ralph.json` → `"worktree": "<name>"`
4. **BullMQ handoff default** — when `runChildJob` has a `ParentJobHandoff` and nothing above set `worktree`, use `handoff.targetId` (the `WORKTREE_TARGETS` id, e.g. `monorepo-worktree-one`)
5. **Omit** — no `-w` / `--worktree` on the agent command

Implementation: `resolveRalphWorktreeName` in `tools/workflows/src/utils/ralph-worktree-cli.ts`.

### Queue / GraphQL (`enqueuePlanRun`, spawn path)

`RunPlanJobData.ralph` (`RalphNestedRunTuningInput`) may set `worktree`, `worktreeBase`, and `skipWorktreeSetup`. Before nested argv is built, `runChildJob` resolves:

1. **Job / GraphQL** — `ralph.worktree` when non-empty (becomes `--worktree` on nested `workflow-ralph`)
2. **Handoff** — `handoff.targetId` when job tuning omits `worktree`
3. **Omit from argv** — nested child still applies env / `.workflow-ralph.json` / handoff inside its own process (same five-step list above)

Orchestrator path (`enqueuePlanRalphOrchestrator`) maps the same tuning fields into `RalphPlanRunContext` and passes them to `createCursorWorkflowRalphIterationRunner` → `runIterationAsync` (no nested CLI argv).

Nested `pnpm exec workflow-ralph` receives `--worktree` / `--worktree <name>` via `buildWorkflowRalphRunTuningArgv` when the spawn-layer name is set (including handoff default).

## Cursor-only extras

When `backend` is `cursor`, optional flags are forwarded if set:

- `--worktree-base <branch>` — env `WORKFLOW_RALPH_WORKTREE_BASE`, file `worktreeBase`, CLI `--worktree-base`
- `--skip-worktree-setup` — env `WORKFLOW_RALPH_SKIP_WORKTREE_SETUP=1|true`, file `skipWorktreeSetup`, CLI `--skip-worktree-setup`

Claude accepts `--worktree [name]` only (no `--worktree-base` in its help).

## Interaction with `workingDirectory`

`enqueuePlanRun.workingDirectory` sets the **worker / nested Ralph process cwd** (another checkout). Agent `--worktree` is still resolved from tuning + handoff; it does not change OpenThrottle’s git worktree allocation. Prefer one primary isolation strategy per run:

- **Queue + `WORKTREE_TARGETS`:** physical worktree + default agent name `targetId` is usually enough.
- **Foreign cwd without targets:** set `ralph.worktree` explicitly if you want agent isolation in that checkout.

## Fail-fast

- Unknown CLI flags still fail in `parseRalphArgs`.
- **No fail-fast** when `handoff.worktreePath` and `--worktree <name>` differ: they are different mechanisms (git path vs agent worktree name). Use the same `targetId` as the CLI name when you want them aligned.
- Invalid `WORKFLOW_RALPH_SKIP_WORKTREE_SETUP` values throw at env read time (same pattern as other `WORKFLOW_RALPH_*` ints/flags).

## Examples

**Local Ralph with named agent worktree:**

```bash
pnpm exec workflow-ralph --plan <uuid> --worktree my-feature
```

**Queue (spawn):** With `WORKTREE_TARGETS` configured, omit `ralph.worktree` to default agent name to the acquired target id; override via GraphQL `ralph { worktree: "custom" }` or job tuning.

**Orchestrator path:** In-process runs use the same resolved `worktree` on `createCursorWorkflowRalphIterationRunner` → `runIterationAsync`.

See also: `tools/workflows/README.md`, `docs/workflows/bullmq-processor-worktree.md`, `tools/workflows/docs/process-model.md`.
