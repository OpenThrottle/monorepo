# @openthrottle/openthrottle-plan-config

Isomorphic source of truth for `plans.run_config` and `plan_runs.run_config_snapshot`: the canonical
JSON shapes, their validation, the round-trip between stored config and the developer app's
Configuration tab, and the **defaults** every programmatic plan run inherits. Consumed by
`openthrottle-server` (through `@openthrottle/nestjs-repositories`) and by `openthrottle-developer`,
so neither can drift from the other.

## Defaults for programmatic (BullMQ) plan runs

A plan run enqueued with no explicit configuration gets:

| Setting    | Default                          | Constant                                                             |
| ---------- | -------------------------------- | -------------------------------------------------------------------- |
| Backend    | `cursor`                         | `DEFAULT_PLAN_RUN_RALPH_RUNNER`                                      |
| Logging    | `verbose`                        | `DEFAULT_PLAN_RUN_RALPH_DEBUG_CLI`                                   |
| Worktree   | on, named `plan-<short plan id>` | `DEFAULT_PLAN_RUN_RALPH_WORKTREE_CLI` + `buildPlanRunWorktreeName()` |
| Iterations | `10`                             | `DEFAULT_PLAN_RUN_RALPH_ITERATIONS`                                  |
| Prompt     | `/agents-ralph`                  | `DEFAULT_PLAN_RUN_RALPH_PROMPT`                                      |

`cursor` stays the backend default deliberately: Claude requires a different payment model for
unattended programmatic invocation, so the queue must not silently route to it.

A blank `worktreeName` means "derive it at enqueue", not "no worktree". To opt out per plan, set
`ralph.worktreeCli` to `'omit'` (Settings → the plan's Configuration tab → Worktree → _Off_); an
explicitly persisted value is always preserved, while an absent key resolves to the current default.

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
