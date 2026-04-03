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
 *   here as {@link WorkflowRalphRunOptionsShape}; the app type should stay aligned (import/re-export
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
 * | `targetMode` `'plan'` \| `'task'` | `targetMode` + `mode` `'plan-centric'` \| `'task-centric'` | `--plan <uuid>` vs `--task <uuid>` (if only `--task`, plan is resolved from task row). |
 * | `planId` | `planId` | `--plan`; required in plan mode; in task-only mode resolved from DB. |
 * | `taskId` | `taskId` | `--task`; task-centric uses this as the fixed task. Plan-centric: runner picks per-iteration task — **not** duplicated in context for iterations. |
 * | `iterations` | `iterations` + `maxIterations` | `--iterations` (default 10). **Task-centric:** `main()` sets `maxIterations = 1` **ignoring** `--iterations` (single-task rule); `iterations` keeps the user-requested value. |
 * | `prompt` | `prompt` | `--prompt` (default `/agents/ralph`). |
 * | `project` | `project` | `--project` (must be a known Nx project name). |
 * | `model` | `model` | `--model` (default `auto`). |
 * | `debugCli` `'omit'` \| `'debug'` \| `'verbose'` | `debugCli` | `--debug` / `--verbose`; omit uses env / `.workflow-ralph.json` only. |
 * | `iterationTimeoutSeconds` | `iterationTimeoutSeconds` | `--iteration-timeout` (seconds, positive int). |
 * | `executionBackend` | `executionBackend` | `--backend` (default `cursor`; see {@link WORKFLOW_RALPH_DEFAULT_BACKEND}). |
 *
 * **GraphQL `RalphPlanRunTuningInput` ↔ UI:** Same lever names as the UI columns above except
 * `ralphDebugCli` (enum) ↔ `debugCli`, `backend` ↔ `executionBackend`. Optional `promptFile` exists
 * on GraphQL / `RalphNestedRunTuningInput` but not on `WorkflowRalphRunOptionsInput` (UI uses `--prompt` only).
 *
 * **Queue vs local CLI semantics (`WorkflowRunOptions` / `buildRalphPlanRunTuningInputFromWorkflowRunOptions`):**
 * BullMQ jobs are **always plan-scoped** (`--plan <enqueue plan id>`). The panel’s `targetMode` /
 * `taskId` affect the **copy/paste CLI preview** and local runs only — **not** the queued worker argv
 * (nested `workflow-ralph` always receives `--plan <planId>` from the job; tuning is the optional
 * `ralph` payload). Omitting all non-default tuning yields `undefined` `ralph` on enqueue so the
 * worker uses env + `.workflow-ralph.json` in the worktree cwd (CLI > env > file > built-ins).
 */

/** @description Default `--backend` for workflow-ralph; aligned with `tools/workflows` / UI. */
export const WORKFLOW_RALPH_DEFAULT_BACKEND = 'cursor' as const;

/** @description Default `--prompt` path fragment. */
export const WORKFLOW_RALPH_DEFAULT_PROMPT = '/agents/ralph' as const;

/** @description Default `--iterations` (before task-centric override in `main()`). */
export const WORKFLOW_RALPH_DEFAULT_ITERATIONS = 10 as const;

/** @description Default `--model` when unset or `auto`. */
export const WORKFLOW_RALPH_DEFAULT_MODEL = 'auto' as const;

/**
 * @description Execution backend id for `--backend`; keep aligned with `workflow-ralph --backend`
 * and {@link WORKFLOW_RALPH_DEFAULT_BACKEND}.
 */
export type WorkflowRalphExecutionBackendId =
  typeof WORKFLOW_RALPH_DEFAULT_BACKEND;

export type WorkflowRalphTargetMode = 'plan' | 'task';

/**
 * @description Maps to `--debug` / `--verbose` / omit (env-only). Matches CLI precedence in parsers.
 */
export type WorkflowRalphDebugCli = 'omit' | 'debug' | 'verbose';

/**
 * @description Fields aligned with the developer app’s `WorkflowRalphRunOptionsInput` (argv / form).
 * {@link RalphFlowContext} extends this shape plus orchestration-only fields (`kind`, `mode`,
 * `maxIterations`).
 */
export interface WorkflowRalphRunOptionsShape {
  readonly debugCli: WorkflowRalphDebugCli;
  readonly executionBackend: WorkflowRalphExecutionBackendId;
  readonly iterations: number;
  readonly iterationTimeoutSeconds: number | undefined;
  readonly model: string;
  readonly planId: string;
  readonly project: string;
  readonly prompt: string;
  readonly targetMode: WorkflowRalphTargetMode;
  readonly taskId: string;
}

export type WorkflowFlowContext = RalphFlowContext;

/**
 * @description Immutable snapshot of inputs driving the Ralph-shaped orchestration (compare
 * the `main` function in `tools/workflows/src/bin/ralph.ts`). Extends {@link WorkflowRalphRunOptionsShape}
 * with `kind`, `mode`, and effective `maxIterations` after CLI rules.
 */
export interface RalphFlowContext extends WorkflowRalphRunOptionsShape {
  readonly kind: 'ralph';
  /**
   * @description `plan-centric` vs `task-centric` — mirrors `targetMode` (`plan` → `plan-centric`,
   * `task` → `task-centric`).
   */
  readonly mode: 'plan-centric' | 'task-centric';
  /**
   * @description Effective iteration cap after CLI resolution (task-centric forces `1`). Compare
   * {@link WorkflowRalphRunOptionsShape.iterations} for the user/UI value mapped to `--iterations`.
   */
  readonly maxIterations: number;
}
