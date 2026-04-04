/**
 * @description Discriminated flow context for GraphQL-first workflows. Extend with new `kind`
 * variants when adding non-Ralph flows.
 *
 * ## Audit: `WorkflowRalphRunOptionsInput` → `RalphFlowContext` → `workflow-ralph` CLI
 *
 * **Sources of truth (names differ by layer):**
 * - **UI / argv preview:** `WorkflowRalphRunOptionsInput` in
 *   `applications/openthrottle-developer/app/routing/plans/utils/build-workflow-ralph-argv.ts`
 *   (`buildWorkflowRalphOptionArgs`, `formatWorkflowRalphCommandLine`). **Shared field shapes** live
 *   here as {@link WorkflowOptions}; the app type should stay aligned (import/re-export
 *   from `@openthrottle/openthrottle-workflows` when the app depends on this package).
 * - **GraphQL enqueue (plan runs):** `RalphPlanRunTuningInput` — tuning only; plan id is the
 *   mutation’s `planId`, not inside `ralph`. See `buildRalphPlanRunTuningInputFromWorkflowRunOptions`.
 * - **Queue → nested CLI:** `RalphNestedRunTuningInput` (`@tools/workflows`,
 *   `buildWorkflowRalphRunTuningArgv`) appended after `pnpm exec workflow-ralph --plan <job.planId>`.
 * - **CLI parse:** `RalphArgs` / `parseRalphArgs` in `tools/workflows/src/utils/parsers.ts`;
 *   loop in `tools/workflows/src/bin/ralph.ts` `main()`.
 *
 * | UI / `WorkflowRalphRunOptionsShape` | `RalphFlowContext` | `workflow-ralph` flags / behavior |
 * | --- | --- | --- |
 * | `mode` `'plan'` \| `'task'` | `mode` + `mode` `'plan'` \| `'task'` | `--plan <uuid>` vs `--task <uuid>` (if only `--task`, plan is resolved from task row). |
 * | `planId` | `planId` | `--plan`; required in plan mode; in task-only mode resolved from DB. |
 * | `taskId` | `taskId` | `--task`; task uses this as the fixed task. plan: runner picks per-iteration task — **not** duplicated in context for iterations. |
 * | `iterations` | `iterations` + `iterations` | `--iterations` (default 10). **task:** `main()` sets `iterations = 1` **ignoring** `--iterations` (single-task rule); `iterations` keeps the user-requested value. |
 * | `prompt` | `prompt` | `--prompt` (default `/agents/ralph`). |
 * | `project` | `project` | `--project` (must be a known Nx project name). |
 * | `model` | `model` | `--model` (default `auto`). |
 * | `debug` `'omit'` \| `'debug'` \| `'verbose'` | `debug` | `--debug` / `--verbose`; omit uses env / `.workflow-ralph.json` only. |
 * | `timeout` | `timeout` + `iterationTimeout` | `--iteration-timeout` (seconds, positive int); both mirror GraphQL `iterationTimeoutSeconds`. |
 * | (iterations cap) | `iterationMax` | User-configured max; equals `iterations` from tuning; task mode keeps this while effective `iterations` becomes `1` in {@link WorkflowRalphContext}. |
 * | `runner` | `runner` | `--backend` (default `cursor`; see {@link DEFAULT_RALPH_RUNNER}). |
 *
 * **GraphQL `RalphPlanRunTuningInput` ↔ UI:** Same lever names as the UI columns above except
 * `ralphDebugCli` (enum) ↔ `debug`, `backend` ↔ `runner`. Optional `promptFile` exists
 * on GraphQL / `RalphNestedRunTuningInput` but not on `WorkflowRalphRunOptionsInput` (UI uses `--prompt` only).
 *
 * **Queue vs local CLI semantics (`WorkflowRunOptions` / `buildRalphPlanRunTuningInputFromWorkflowRunOptions`):**
 * BullMQ jobs are **always plan-scoped** (`--plan <enqueue plan id>`). The panel’s `mode` /
 * `taskId` affect the **copy/paste CLI preview** and local runs only — **not** the queued worker argv
 * (nested `workflow-ralph` always receives `--plan <planId>` from the job; tuning is the optional
 * `ralph` payload). Omitting all non-default tuning yields `undefined` `ralph` on enqueue so the
 * worker uses env + `.workflow-ralph.json` in the worktree cwd (CLI > env > file > built-ins).
 */

/** @description Default `--backend` for workflow-ralph; aligned with `tools/workflows` / UI. */
export const DEFAULT_RALPH_RUNNER = 'cursor';

/** @description Default `--prompt` path fragment. */
export const DEFAULT_RALPH_PROMPT = '/agents/ralph';

/** @description Default `--iterations` (before task override in `main()`). */
export const DEFAULT_RALPH_ITERATIONS = 10;

/** @description Default `--model` when unset or `auto`. */
export const DEFAULT_RALPH_MODEL = 'auto';

/**
 * @description Execution backend id for `--backend`; keep aligned with `workflow-ralph --backend`
 * and {@link DEFAULT_RALPH_RUNNER}.
 */
export type WorkflowRunner = typeof DEFAULT_RALPH_RUNNER;

export type WorkflowMode = 'plan' | 'task';

/**
 * @description Maps to `--debug` / `--verbose` / omit (env-only). Matches CLI precedence in parsers.
 */
export type WorkflowDebug = 'omit' | 'debug' | 'verbose';

export interface WorkflowConfiguration {
  readonly debug: WorkflowDebug;
  readonly iterationMax: number;
  readonly iterations: number;
  readonly iterationTimeout: number | undefined;
  readonly timeout: number | undefined;
}

/**
 * @description Fields aligned with the developer app’s `WorkflowRalphRunOptionsInput` (argv / form).
 * {@link WorkflowRalphContext} extends this shape plus orchestration-only fields (`kind`, `mode`,
 * `iterations`).
 */
export interface WorkflowOptions extends WorkflowConfiguration {
  readonly mode: WorkflowMode;
  readonly model: string;
  readonly planId: string;
  readonly project: string | undefined;
  readonly prompt: string;
  readonly runner: WorkflowRunner;
  readonly taskId: string;
}

export type WorkflowFlowContext = WorkflowRalphContext;

/**
 * @description Immutable snapshot of inputs driving the Ralph-shaped orchestration (compare
 * the `main` function in `tools/workflows/src/bin/ralph.ts`). Extends {@link WorkflowOptions}
 * with `kind`, `mode`, and effective `iterations` after CLI rules.
 */
export interface WorkflowRalphContext extends WorkflowOptions {
  /**
   * When set (e.g. BullMQ worker + in-process abort controller), forwarded to each iteration and
   * checked between steps so user cancel matches the spawn-path behavior.
   */
  readonly abortSignal?: AbortSignal;
  readonly kind: 'ralph';
}
