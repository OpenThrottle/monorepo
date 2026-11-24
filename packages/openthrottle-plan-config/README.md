# @openthrottle/openthrottle-plan-config

Isomorphic source of truth for `plans.run_config` and `plan_runs.run_config_snapshot`: the canonical
JSON shapes, their validation, the round-trip between stored config and the developer app's
Configuration tab, and the **defaults** every programmatic plan run inherits. Consumed by
`openthrottle-server` (through `@openthrottle/nestjs-repositories-server`) and by `openthrottle-developer`,
so neither can drift from the other.

## Shape

`plans.run_config` and `plan_runs.run_config_snapshot` each hold one `run` block next to `target`
and `workspace`:

| Key                                                                                | Where              | Meaning                                      |
| ---------------------------------------------------------------------------------- | ------------------ | -------------------------------------------- |
| `run.driver`, `model`, `effort`, `debugCli`, `worktreeName`, `worktreeCleanup`     | `plans.run_config` | The plan's saved tuning                      |
| `run.iterationTimeoutSeconds`                                                      | both               | Per-attempt agent timeout; absent means none |
| `run.setupCommands`, `validationCommands`, `finalValidationCommands`, `maxRetries` | both               | OT Loop validation fields (optional)         |
| `run.debug`, `worktreeName`                                                        | snapshot           | What the run was enqueued with               |

Both schemas are `.strict()`: a stored key outside this shape is rejected, and a data
migration (`195_backfill_run_config_run_block.sql`) moved every stored row to it.

## Defaults for programmatic (BullMQ) plan runs

A plan run enqueued with no explicit configuration gets:

| Setting  | Default                      | Constant                                                        |
| -------- | ---------------------------- | --------------------------------------------------------------- |
| Driver   | `cursor`                     | `DEFAULT_PLAN_RUN_DRIVER`                                       |
| Model    | `auto`                       | `DEFAULT_PLAN_RUN_MODEL`                                        |
| Logging  | `verbose`                    | `DEFAULT_PLAN_RUN_DEBUG_CLI`                                    |
| Worktree | named `plan-<short plan id>` | `buildPlanRunWorktreeName()` (override with `run.worktreeName`) |
| Cleanup  | `on-pr`                      | `DEFAULT_PLAN_RUN_WORKTREE_CLEANUP`                             |

Plans that leave the driver unset inherit `cursor`. Set it per plan with `run.driver` (Settings →
the plan's Configuration tab). Every run gets a worktree; a blank `worktreeName` means "derive it at
enqueue".

See [docs/openthrottle/plan-run-worktrees.md](../../docs/openthrottle/plan-run-worktrees.md) for the
worktree lifecycle, cleanup rule, and the disk-growth consequence.

## Installation

Install with your preferred package manager (list pnpm first in this monorepo):

**pnpm:**

```bash
pnpm add @openthrottle/openthrottle-plan-config
```

**npm:**

```bash
npm install @openthrottle/openthrottle-plan-config
```
