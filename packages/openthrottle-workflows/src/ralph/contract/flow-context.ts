/**
 * @description Discriminated flow context for GraphQL-first workflows. Extend with new `kind`
 * variants when adding non-Ralph flows.
 *
 * ## Audit: `WorkflowRalphRunOptionsInput` → `RalphFlowContext` → `workflow-ralph` CLI
 *
 * **Sources of truth (names differ by layer):**
 * - **UI / argv preview:** `WorkflowRalphRunOptionsInput` in
 *   `applications/openthrottle-developer/app/routing/plans/utils/build-workflow-ralph-argv.ts`
 *   (`buildWorkflowRalphOptionArgs`, `formatWorkflowRalphCommandLine`).
 * - **GraphQL enqueue (plan runs):** `RalphPlanRunTuningInput` — tuning only; plan id is the
 *   mutation’s `planId`, not inside `ralph`. See `buildRalphPlanRunTuningInputFromWorkflowRunOptions`.
 * - **Queue → nested CLI:** `RalphNestedRunTuningInput` (`@tools/workflows`,
 *   `buildWorkflowRalphRunTuningArgv`) appended after `pnpm exec workflow-ralph --plan <job.planId>`.
 * - **CLI parse:** `RalphArgs` / `parseRalphArgs` in `tools/workflows/src/utils/parsers.ts`;
 *   loop in `tools/workflows/src/bin/ralph.ts` `main()`.
 *
 * | UI / `WorkflowRalphRunOptionsInput` | Current `RalphFlowContext` | `workflow-ralph` flags / behavior |
 * | --- | --- | --- |
 * | `targetMode` `'plan'` \| `'task'` | `mode` `'plan-centric'` \| `'task-centric'` | `--plan <uuid>` vs `--task <uuid>` (if only `--task`, plan is resolved from task row). |
 * | `planId` | `planId` | `--plan`; required in plan mode; in task-only mode resolved from DB. |
 * | `taskId` | `focusTaskId` | `--task`; task-centric uses this as the fixed task. Plan-centric: runner picks per-iteration task — **not** duplicated in context today. |
 * | `iterations` | `maxIterations` | `--iterations` (default 10). **Task-centric:** `main()` sets `maxIterations = 1` **ignoring** `--iterations` (single-task rule). |
 * | `prompt` | `userPrompt` | `--prompt` (default `/agents/ralph`). |
 * | `project` | `nxProjectName` | `--project` (must be a known Nx project name). |
 * | `model` | *(missing)* | `--model` (default `auto`). |
 * | `debugCli` `'omit'` \| `'debug'` \| `'verbose'` | *(missing)* | `--debug` / `--verbose`; omit uses env / `.workflow-ralph.json` only. |
 * | `iterationTimeoutSeconds` | *(missing)* | `--iteration-timeout` (seconds, positive int). |
 * | `executionBackend` | *(missing)* | `--backend` (default `cursor`; see `WORKFLOW_RALPH_DEFAULT_BACKEND` in UI module). |
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
export type WorkflowFlowContext = RalphFlowContext;

/**
 * @description Immutable snapshot of inputs driving the Ralph-shaped orchestration (compare
 * the `main` function in `tools/workflows/src/bin/ralph.ts`).
 */
export interface RalphFlowContext {
  readonly kind: 'ralph';
  /** Resolved OpenThrottle plan id (from `--plan` or derived from `--task`). */
  readonly planId: string;
  /**
   * @description When `--task` is set, the focused task; in plan-centric mode the runner may
   * still set focus per iteration — that runtime value is not duplicated here; use iteration
   * state in the orchestrator implementation.
   */
  readonly focusTaskId: string | undefined;
  readonly mode: 'plan-centric' | 'task-centric';
  /** After CLI resolution: task-centric forces 1. */
  readonly maxIterations: number;
  /** User prompt fragment before OpenThrottle plan/task injection. */
  readonly userPrompt: string;
  readonly nxProjectName: string | undefined;
}
