// `no-await-in-loop` is disabled deliberately, not as tech debt: the awaits in
// this file are intentionally sequential and must NOT be batched with
// `Promise.all`.
//   - The main iteration loop runs exactly one agent invocation at a time;
//     each iteration depends on the prior iteration's task-state mutations.
//   - The per-completion `for…of` loop interleaves a status mutation, a task
//     re-fetch, and an ordered `afterEach` lifecycle hook per task; running it
//     concurrently would fire N concurrent re-fetches and dispatch lifecycle
//     hooks in a non-deterministic order against a shared dispatcher.
/* eslint-disable no-await-in-loop */

import type { ExecuteGraphqlOptionsV2 } from '@openthrottle/nodejs-graphql';
import type { TrajectoryRecord } from '@openthrottle/openthrottle-agentic-utils';
import { WORKFLOW_PROMPT_SHELL_COMMAND_GUARDRAIL } from '@openthrottle/openthrottle-agentic-utils';
import {
  buildForeignWorkspacePromptLayer,
  resolveForeignWorkspaceContext,
} from '@openthrottle/openthrottle-agentic-utils';
import type { WorkflowLifecycleTaskContext } from '@openthrottle/openthrottle-agentic-workflow';

import {
  AppendPlanOutputDocument,
  GetPlanDocument,
  GetServerHealthDocument,
  GetTaskDocument,
  GetTasksByPlanIdDocument,
  UpdatePlanDocument,
  UpdateTaskDocument,
} from '../__generated__/graphql.ts';
import {
  DEFAULT_ITERATIONS,
  resolveRalphMaxTotalMsFromEnv,
} from '../config/index.ts';
import type {
  WorkflowRalphIterationOnChunk,
  WorkflowRalphIterationRunParams,
  WorkflowRalphOrchestratorDeps,
  WorkflowRalphUsageLimit,
} from '../contract/ralph-orchestrator-deps.ts';
import type {
  WorkflowFailedReason,
  WorkflowFinishedReason,
  WorkflowOrchestrator,
  WorkflowRunResult,
} from '../types.ts';
import type { WorkflowContext } from '../types.ts';
import {
  finalizePlanRun,
  preparePlanRunPrDraftDir,
  shouldFinalizePlanRun,
} from '../utils/finalize-plan-run.ts';
import {
  formatPlanAndTasksForPrompt,
  isRalphTerminalStatus,
  isRunnableRalphTask,
  isWorkableRalphTask,
  pickRalphTaskForIteration,
} from '../utils/index.ts';
import {
  agentOutputHasPromiseComplete,
  parseAgentCompleteTaskSignals,
  parseAgentOutput,
} from '../utils/output.ts';
import { PLAN_RUN_PR_DRAFT_DIR_ENV } from '../utils/plan-run-pr-draft.ts';
import { recordIterationTrajectory } from './record-iteration-trajectory.ts';

/**
 * @description Clamps the iteration ceiling defensively. `WorkflowContext` is built by paths that
 * bypass `resolveWorkflowRunOptions` clamping (e.g. developer UI / `buildRalphFlowContextFromRunOptionsShape`),
 * so a `0`/negative/`NaN` `iterations` could otherwise skip the loop body entirely and report a
 * silent no-op run as success. Falls back to {@link DEFAULT_ITERATIONS}.
 */
const resolveMaxIterations = (iterations: number): number => {
  return Number.isInteger(iterations) && iterations >= 1
    ? iterations
    : DEFAULT_ITERATIONS;
};

/**
 * @description Agent cwd and foreign-repo scoping for orchestrator prompts (parity with `ralph.ts`).
 */
const resolveOrchestratorAgentCwd = (context: WorkflowContext): string => {
  const trimmed = context.workingDirectory?.trim() ?? '';

  return trimmed !== '' ? trimmed : process.cwd();
};

const buildOrchestratorBasePrompt = (params: {
  readonly context: WorkflowContext;
  readonly effectivePlanId: string;
  readonly injectedContext: string;
  readonly taskIdTrim: string;
}): string => {
  const { context, effectivePlanId, injectedContext, taskIdTrim } = params;
  const agentCwd = resolveOrchestratorAgentCwd(context);
  const foreignLayer = buildForeignWorkspacePromptLayer(
    resolveForeignWorkspaceContext(agentCwd, process.env),
    { injectedSkillNames: context.injectedSkillNames },
  );

  // Layer ordering is security-relevant. `context.prompt` (a path fragment by
  // default, free text via tuning) and the injected plan/task content
  // (`description`/`title`/`requirements` from OpenThrottle) are
  // **trusted-operator inputs today**, injected verbatim. Keeping
  // `WORKFLOW_PROMPT_SHELL_COMMAND_GUARDRAIL` as the LAST instruction layer —
  // after the operator prompt and after the injected content — means its
  // command-execution safety rules are the final word the agent reads and are
  // not overridden by anything ahead of them. If injected plan content ever
  // becomes attacker-influenced, this ordering is the defense-in-depth seam.
  return (
    `${context.prompt}\n\n` +
    (foreignLayer !== undefined ? `${foreignLayer}\n\n` : '') +
    `${injectedContext}\n\n` +
    `${WORKFLOW_PROMPT_SHELL_COMMAND_GUARDRAIL}\n\n` +
    `Plan-Id: ${effectivePlanId}.` +
    (taskIdTrim !== '' ? ` Task-Id: ${taskIdTrim}.` : '') +
    ' Use the plan and tasks above (injected from OpenThrottle by Ralph). Do not call get_plan or get_tasks_by_plan_id; the context is provided. When you complete a task output <ralph:task-complete>TASK_UUID</ralph:task-complete>.'
  );
};

/**
 * @description Prompt line the agent reads as "this is the plan's last runnable task". The
 * orchestrator states it rather than letting the agent infer it, because the agent can't see
 * completions applied by the host after it exits. On reading it, agents-ralph drafts the PR with
 * `github-pull-request` in draft-only mode once the task is committed; the host publishes the draft.
 * The resolved draft path is written into the line itself, not only into `OT_PR_DRAFT_DIR`, so an
 * agent whose CLI doesn't forward env to its tool shell still knows where to write.
 */
const buildFinalIterationPromptLine = (
  draftDir: string | undefined,
): string => {
  return ` OT_FINAL_ITERATION=1: this is the last runnable task in the plan. After you complete and commit it, run /github-pull-request in draft-only mode (draft directory: ${draftDir === undefined ? '$OT_PR_DRAFT_DIR when set, else the skill default' : `${draftDir} — the same path as $OT_PR_DRAFT_DIR`}) so the host can publish the PR. Never git push and never open, edit or ready the PR yourself.`;
};

/**
 * @description True when `taskId` is the only workable task left, i.e. finishing it ends what this
 * run can do. Pass the **workable** list ({@link isWorkableRalphTask}), not the remaining one: a
 * BLOCKED sibling anywhere in the plan must not suppress the PR-draft line.
 */
const isLastWorkableTask = (
  workable: readonly { readonly id: string }[],
  taskId: string,
): boolean => {
  const lowered = taskId.toLowerCase();

  return (
    workable.length > 0 &&
    workable.every((task) => task.id.toLowerCase() === lowered)
  );
};

const toLifecycleTaskContext = (task: {
  readonly category?: string | null;
  readonly id: string;
  readonly status: string;
  readonly title: string;
}): WorkflowLifecycleTaskContext => {
  return {
    category: task.category ?? undefined,
    id: task.id,
    status: task.status,
    title: task.title,
  };
};

const onFinished = (
  reason: Exclude<WorkflowFinishedReason, 'workflow_usage_limited'>,
): WorkflowRunResult => {
  return {
    exitCode: 0,
    reason,
    status: 'finished',
  };
};

const onUsageLimited = (
  usageLimit: WorkflowRalphUsageLimit,
): WorkflowRunResult => {
  return {
    exitCode: 0,
    reason: 'workflow_usage_limited',
    status: 'finished',
    usageLimit,
  };
};

const onFailure = (reason: WorkflowFailedReason): WorkflowRunResult => {
  return {
    exitCode: 1,
    reason,
    status: 'failed',
  };
};

/**
 * @description Normalizes an unknown thrown value into a single-line, operator-readable description.
 * Preserves `Error.name`/`message` (and a first stack frame when present) without leaking the full
 * stack; falls back to JSON for non-`Error` throws.
 */
const describeError = (error: unknown): string => {
  if (error instanceof Error) {
    const firstFrame = error.stack
      ?.split('\n')
      .map((line) => line.trim())
      .find((line) => line.startsWith('at '));

    return firstFrame
      ? `${error.name}: ${error.message} (${firstFrame})`
      : `${error.name}: ${error.message}`;
  }

  if (typeof error === 'string') {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

/**
 * @description Emits a structured diagnostic line on the iteration `onChunk` stderr stream so operators
 * can distinguish a transient GraphQL/network fault, an agent crash, an auth failure, and a bug — all of
 * which otherwise collapse to an opaque `workflow_unhandled`. Best-effort: a throwing/awaiting `onChunk`
 * must never mask the original failure, so errors here are swallowed. No-op when no `onChunk` is wired.
 */
const emitDiagnostic = async (
  onChunk: WorkflowRalphIterationOnChunk | undefined,
  params: { readonly error: unknown; readonly phase: string },
): Promise<void> => {
  if (!onChunk) {
    return;
  }

  try {
    await onChunk({
      data: `[ralph-orchestrator] ${params.phase}: ${describeError(params.error)}\n`,
      stream: 'stderr',
    });
  } catch {
    // Diagnostics are side effects; never let them mask the underlying failure.
  }
};

/**
 * @description Builds the per-call GraphQL options carrying the run's `X-OT-Session-Id` header so
 * the server attributes status_change artifacts to the run session (G11 in
 * docs/monorepo/work-ledger-sessions.md). Returns
 * `undefined` when no run session is set (CLI/dev paths) so the server opens instant sessions as
 * before. Only status-mutating calls need it; read queries are unaffected.
 */
const buildSessionOptions = (
  workSessionId: string | undefined,
): ExecuteGraphqlOptionsV2 | undefined => {
  return workSessionId != null && workSessionId !== ''
    ? { headers: { 'X-OT-Session-Id': workSessionId } }
    : undefined;
};

/**
 * @description The iteration-runner params that turn on run-transcript capture, or none when the
 * host resolved no plan_runs row (there is nothing to record against). Recording is fail-open:
 * `runIterationAsync` catches a failed record, so a server outage never fails the iteration.
 */
const buildTrajectoryCapture = (params: {
  readonly context: WorkflowContext;
  readonly effectivePlanId: string;
  readonly executeGraphqlV2: WorkflowRalphOrchestratorDeps['executeGraphqlV2'];
  readonly iteration: number;
  readonly sessionOptions: ExecuteGraphqlOptionsV2 | undefined;
  readonly taskId: string | undefined;
}): Pick<
  WorkflowRalphIterationRunParams,
  'onTrajectory' | 'trajectoryFacts'
> => {
  const {
    context,
    effectivePlanId,
    executeGraphqlV2,
    iteration,
    sessionOptions,
    taskId,
  } = params;
  const { planRunId } = context;

  if (planRunId === undefined) {
    return {};
  }

  return {
    onTrajectory: async (record: TrajectoryRecord) => {
      await recordIterationTrajectory(
        executeGraphqlV2,
        {
          driver: context.runner,
          iteration,
          model: context.model,
          planRunId,
          record,
          taskId,
        },
        sessionOptions,
      );
    },
    trajectoryFacts: {
      planId: effectivePlanId,
      planRunId,
      taskId: taskId ?? null,
    },
  };
};

/**
 * @description Promotes plan to IN_PROGRESS via GraphQL (parity with
 * `openthrottle-ralph.promotePlanToInProgressIfNeeded` /
 * `PlanStatusService.promoteParentPlanToInProgress`).
 */
const promotePlanToInProgressIfNeeded = async (
  executeGraphqlV2: WorkflowRalphOrchestratorDeps['executeGraphqlV2'],
  planId: string,
  sessionOptions: ExecuteGraphqlOptionsV2 | undefined,
): Promise<void> => {
  await executeGraphqlV2(
    UpdatePlanDocument,
    { input: { id: planId, status: 'IN_PROGRESS' } },
    sessionOptions,
  );
};

/**
 * @description Writes the plan BLOCKED and narrates which tasks hold it there, on plan output and the
 * iteration stream. Reached when no task is workable but BLOCKED tasks remain: the run has done all
 * it can, and only a human can unblock and re-enqueue it. The status write throws (the caller's
 * error handling applies); the narration is best-effort.
 */
const markPlanBlocked = async (params: {
  readonly blockedTitles: readonly string[];
  readonly executeGraphqlV2: WorkflowRalphOrchestratorDeps['executeGraphqlV2'];
  readonly onChunk: WorkflowRalphIterationOnChunk | undefined;
  readonly planId: string;
  readonly sessionOptions: ExecuteGraphqlOptionsV2 | undefined;
}): Promise<void> => {
  const { blockedTitles, executeGraphqlV2, onChunk, planId, sessionOptions } =
    params;

  await executeGraphqlV2(
    UpdatePlanDocument,
    { input: { id: planId, status: 'BLOCKED' } },
    sessionOptions,
  );

  const titles = blockedTitles.map((title) => `"${title}"`).join(', ');
  const message = `[ralph-orchestrator] plan blocked: no workable task left; ${blockedTitles.length} blocked task(s) need a human: ${titles}. Unblock them and re-enqueue the plan to continue.\n`;

  try {
    await executeGraphqlV2(
      AppendPlanOutputDocument,
      { input: { content: message, planId } },
      sessionOptions,
    );
  } catch {
    // Narration is best-effort; the BLOCKED status is the durable signal.
  }

  if (onChunk) {
    try {
      await onChunk({ data: message, stream: 'stderr' });
    } catch {
      // ignore
    }
  }
};

/**
 * @description What a task load says about the plan: `completed` when no task remains (BLOCKED
 * counts as remaining), `blocked` when tasks remain but none is workable, else `workable` with the
 * workable list for picking and last-task detection.
 */
type PlanTaskProgress<TTask> =
  | { readonly blockedTitles: readonly string[]; readonly kind: 'blocked' }
  | { readonly kind: 'completed' }
  | { readonly kind: 'workable'; readonly workable: readonly TTask[] };

const classifyPlanTasks = <
  TTask extends Parameters<typeof isWorkableRalphTask>[0] & {
    readonly title: string;
  },
>(
  tasks: readonly TTask[],
): PlanTaskProgress<TTask> => {
  const remaining = tasks.filter(isRunnableRalphTask);

  if (remaining.length === 0) {
    return { kind: 'completed' };
  }

  const workable = remaining.filter(isWorkableRalphTask);

  if (workable.length === 0) {
    return {
      blockedTitles: remaining.map((task) => task.title),
      kind: 'blocked',
    };
  }

  return { kind: 'workable', workable };
};

/**
 * @description Re-queries the plan's tasks and settles the parent when this run can do no more:
 * COMPLETED when no non-terminal task remains, BLOCKED when only BLOCKED tasks remain. The server
 * performs no downward reconcile (see repo memory "no server-side downward reconcile"), so a
 * task-scoped run must reconcile the parent itself — otherwise the plan is stranded non-terminal.
 * Mirrors the plan-mode task-load exits. Returns the finished reason when it reconciled, else
 * `undefined`.
 */
const reconcilePlanIfTasksExhausted = async (params: {
  readonly executeGraphqlV2: WorkflowRalphOrchestratorDeps['executeGraphqlV2'];
  readonly onChunk: WorkflowRalphIterationOnChunk | undefined;
  readonly planId: string;
  readonly sessionOptions: ExecuteGraphqlOptionsV2 | undefined;
}): Promise<
  'workflow_tasks_blocked' | 'workflow_tasks_exhausted' | undefined
> => {
  const { executeGraphqlV2, onChunk, planId, sessionOptions } = params;
  const planTasks = await executeGraphqlV2(GetTasksByPlanIdDocument, {
    input: { planId },
  });

  const progress = classifyPlanTasks(planTasks.tasksByPlanId);

  if (progress.kind === 'workable') {
    return undefined;
  }

  if (progress.kind === 'blocked') {
    await markPlanBlocked({
      blockedTitles: progress.blockedTitles,
      executeGraphqlV2,
      onChunk,
      planId,
      sessionOptions,
    });

    return 'workflow_tasks_blocked';
  }

  await executeGraphqlV2(
    UpdatePlanDocument,
    { input: { id: planId, status: 'COMPLETED' } },
    sessionOptions,
  );

  return 'workflow_tasks_exhausted';
};

/**
 * @description Settles a plan-mode run that stopped and needs a human to act — an iteration or
 * budget limit, or an agent ERROR / INPUT_REQUIRED marker. Re-reads the tasks, because the last
 * iteration may have finished the plan: nothing remaining → plan COMPLETED and `completed`.
 * Otherwise the plan is written BLOCKED — never left IN_PROGRESS, where no live run owns it and
 * nothing would ever move it — narrated with `label`, and `blocked` is returned. A manual re-enqueue
 * resumes a BLOCKED plan. A failed re-read or status write is surfaced as a diagnostic and returns
 * `blocked`, so committed work is pushed regardless.
 */
const settlePlanAwaitingHuman = async (params: {
  readonly executeGraphqlV2: WorkflowRalphOrchestratorDeps['executeGraphqlV2'];
  readonly label: string;
  readonly onChunk: WorkflowRalphIterationOnChunk | undefined;
  readonly planId: string;
  readonly sessionOptions: ExecuteGraphqlOptionsV2 | undefined;
}): Promise<'blocked' | 'completed'> => {
  const { executeGraphqlV2, label, onChunk, planId, sessionOptions } = params;

  try {
    const planTasks = await executeGraphqlV2(GetTasksByPlanIdDocument, {
      input: { planId },
    });
    const remaining = planTasks.tasksByPlanId.filter(isRunnableRalphTask);

    if (remaining.length === 0) {
      await executeGraphqlV2(
        UpdatePlanDocument,
        { input: { id: planId, status: 'COMPLETED' } },
        sessionOptions,
      );

      return 'completed';
    }

    const blockedCount = remaining.filter(
      (task) => task.status === 'BLOCKED',
    ).length;
    const pendingCount = remaining.length - blockedCount;

    await executeGraphqlV2(
      UpdatePlanDocument,
      { input: { id: planId, status: 'BLOCKED' } },
      sessionOptions,
    );

    const message = `[ralph-orchestrator] ${label}; ${pendingCount} task(s) still pending, ${blockedCount} blocked. Re-run to continue.\n`;

    try {
      await executeGraphqlV2(
        AppendPlanOutputDocument,
        { input: { content: message, planId } },
        sessionOptions,
      );
    } catch {
      // Narration is best-effort; the BLOCKED status is the durable signal.
    }

    if (onChunk) {
      try {
        await onChunk({ data: message, stream: 'stderr' });
      } catch {
        // ignore
      }
    }
  } catch (error) {
    await emitDiagnostic(onChunk, {
      error,
      phase: `plan ${planId} settle after "${label}" failed`,
    });
  }

  return 'blocked';
};

/**
 * @description Settles a plan-mode run that used up its iteration or budget limit (see
 * {@link settlePlanAwaitingHuman}): `workflow_tasks_exhausted` when the last iteration finished the
 * plan, else the limit reason. Either reason finalizes.
 */
const settlePlanAtRunLimit = async (params: {
  readonly executeGraphqlV2: WorkflowRalphOrchestratorDeps['executeGraphqlV2'];
  readonly limitLabel: string;
  readonly onChunk: WorkflowRalphIterationOnChunk | undefined;
  readonly planId: string;
  readonly reason: 'workflow_budget_exhausted' | 'workflow_max_iterations';
  readonly sessionOptions: ExecuteGraphqlOptionsV2 | undefined;
}): Promise<
  | 'workflow_budget_exhausted'
  | 'workflow_max_iterations'
  | 'workflow_tasks_exhausted'
> => {
  const { limitLabel, reason, ...rest } = params;
  const settled = await settlePlanAwaitingHuman({ ...rest, label: limitLabel });

  return settled === 'completed' ? 'workflow_tasks_exhausted' : reason;
};

/**
 * @description Best-effort move of a task to BLOCKED (an agent INPUT_REQUIRED marker: only a human
 * can answer). Failure is surfaced as a diagnostic, never thrown.
 */
const markTaskBlocked = async (
  executeGraphqlV2: WorkflowRalphOrchestratorDeps['executeGraphqlV2'],
  taskId: string,
  sessionOptions: ExecuteGraphqlOptionsV2 | undefined,
  onChunk: WorkflowRalphIterationOnChunk | undefined,
): Promise<void> => {
  try {
    await executeGraphqlV2(
      UpdateTaskDocument,
      { input: { id: taskId, status: 'BLOCKED' } },
      sessionOptions,
    );
  } catch (error) {
    await emitDiagnostic(onChunk, {
      error,
      phase: `BLOCKED write for task ${taskId} failed`,
    });
  }
};

/**
 * @description Best-effort reset of a task to PENDING (used when an iteration ends without finishing
 * it: max iterations, usage limit, an agent ERROR marker). Failure is surfaced as a diagnostic, never thrown (ralph.ts warns).
 */
const resetTaskToPending = async (
  executeGraphqlV2: WorkflowRalphOrchestratorDeps['executeGraphqlV2'],
  taskId: string | undefined,
  sessionOptions: ExecuteGraphqlOptionsV2 | undefined,
  onChunk: WorkflowRalphIterationOnChunk | undefined,
): Promise<void> => {
  if (taskId === undefined || taskId === '') {
    return;
  }

  try {
    await executeGraphqlV2(
      UpdateTaskDocument,
      { input: { id: taskId, status: 'PENDING' } },
      sessionOptions,
    );
  } catch (error) {
    await emitDiagnostic(onChunk, {
      error,
      phase: `PENDING reset for task ${taskId} failed`,
    });
  }
};

/**
 * @description GraphQL-backed Ralph pipeline: resolves plan, loads state, guards terminal plans,
 * marks progress, runs iterations via {@link WorkflowRalphOrchestratorDeps.iterationRunner}, applies
 * task completions, and interprets `<promise>` markers (parity with `tools/workflows/src/bin/ralph.ts`
 * `main()`).
 */
export const createWorkflowRalphOrchestrator = (
  deps: WorkflowRalphOrchestratorDeps,
): WorkflowOrchestrator => {
  return {
    execute: async ({ context }) => {
      const { executeGraphqlV2, iterationRunner, onChunk, runCommand } = deps;
      const sessionOptions = buildSessionOptions(context.workSessionId);

      try {
        // bootstrap — context must identify a plan or a task
        const planIdTrim = context.planId.trim();
        const taskIdTrim = context.taskId.trim();
        const isTaskCentric = context.mode === 'task';

        // healthcheck
        await executeGraphqlV2(GetServerHealthDocument, {});

        // target.resolve
        let effectivePlanId = planIdTrim;
        if (taskIdTrim && planIdTrim === '') {
          const taskLookup = await executeGraphqlV2(GetTaskDocument, {
            id: taskIdTrim,
          });

          if (!taskLookup.task) {
            await emitDiagnostic(onChunk, {
              error: new Error(`task ${taskIdTrim} not found`),
              phase: 'target resolution failed',
            });

            return onFailure('workflow_unhandled');
          }

          effectivePlanId = taskLookup.task.planId;
        } else if (planIdTrim === '' && taskIdTrim === '') {
          await emitDiagnostic(onChunk, {
            error: new Error('context supplied neither a planId nor a taskId'),
            phase: 'target resolution failed',
          });

          return onFailure('workflow_unhandled');
        }

        // pr.draft.prepare — finalize is host-owned and opt-in via `runCommand`, so only then does
        // the agent get a draft dir. Stale drafts from an earlier run are removed here, and the dir
        // is handed to the agent as `OT_PR_DRAFT_DIR` and to finalize, so both use the same path.
        let prDraftDir: string | undefined;
        if (runCommand !== undefined) {
          prDraftDir = await preparePlanRunPrDraftDir({
            cwd: resolveOrchestratorAgentCwd(context),
            runCommand,
          });
        }
        let agentEnv: Record<string, string> | undefined;
        if (prDraftDir !== undefined) {
          agentEnv = { [PLAN_RUN_PR_DRAFT_DIR_ENV]: prDraftDir };
        }

        /**
         * Host-owned push + PR after a plan-finishing reason. Failures become
         * `workflow_complete_handoff_owed` (never FAILED). Other finished/failed
         * outcomes pass through unchanged.
         */
        const maybeFinalize = async (
          result: WorkflowRunResult,
        ): Promise<WorkflowRunResult> => {
          // Finalize is host-owned and opt-in via `deps.runCommand`. Unit tests that
          // omit it keep today's loop-only behavior; the server deps factory wires the
          // real `git`/`gh` runner so scheduled orchestrator runs always finalize.
          if (runCommand === undefined) {
            return result;
          }
          if (result.status !== 'finished') {
            return result;
          }
          if (result.reason === 'workflow_usage_limited') {
            return result;
          }
          if (!shouldFinalizePlanRun(result.reason)) {
            return result;
          }

          const trimmedBase = context.worktreeBase?.trim() ?? '';
          const baseBranch = trimmedBase !== '' ? trimmedBase : 'main';

          return finalizePlanRun({
            baseBranch,
            cwd: resolveOrchestratorAgentCwd(context),
            draftDir: prDraftDir,
            executeGraphqlV2,
            onChunk,
            planId: effectivePlanId,
            priorReason: result.reason,
            runCommand,
          });
        };

        // state.load
        const [planResult, tasksResult] = await Promise.all([
          executeGraphqlV2(GetPlanDocument, { id: effectivePlanId }),
          executeGraphqlV2(GetTasksByPlanIdDocument, {
            input: { planId: effectivePlanId },
          }),
        ]);

        const planRow = planResult.plan ?? null;
        const tasksRows = tasksResult.tasksByPlanId;

        if (!planRow) {
          await emitDiagnostic(onChunk, {
            error: new Error(`plan ${effectivePlanId} not found`),
            phase: 'plan state load failed',
          });

          return onFailure('workflow_unhandled');
        }

        // prompt.build
        const injectedContext = formatPlanAndTasksForPrompt(planRow, tasksRows);
        const agentCwd = resolveOrchestratorAgentCwd(context);
        // Task mode never re-reads tasks per iteration, so decide "last task" from the state load.
        let taskModeFinalLine = '';
        if (
          isTaskCentric &&
          taskIdTrim !== '' &&
          isLastWorkableTask(tasksRows.filter(isWorkableRalphTask), taskIdTrim)
        ) {
          taskModeFinalLine = buildFinalIterationPromptLine(prDraftDir);
        }
        const basePrompt =
          buildOrchestratorBasePrompt({
            context,
            effectivePlanId,
            injectedContext,
            taskIdTrim,
          }) + taskModeFinalLine;

        // plan.guard
        if (isRalphTerminalStatus(planRow.status)) {
          // 🟡 If the plan is already terminal, we return a finished outcome
          return onFinished('workflow_plan_already_terminal');
        }

        // plan.mark_in_progress
        await promotePlanToInProgressIfNeeded(
          executeGraphqlV2,
          effectivePlanId,
          sessionOptions,
        );

        // task.mark_in_progress
        if (taskIdTrim) {
          await executeGraphqlV2(
            UpdateTaskDocument,
            { input: { id: taskIdTrim, status: 'IN_PROGRESS' } },
            sessionOptions,
          );
        }

        const {
          abortSignal,
          isCancellationRequested,
          iterationTimeout,
          timeout,
        } = context;
        const maxIterations = resolveMaxIterations(context.iterations);

        /**
         * Cooperative stop check at an iteration boundary. Combines the in-memory
         * abort signal (Channel 0/2 — set locally or by the pub/sub subscriber)
         * with the durable cancel marker (Channel 1 — polled here so a missed
         * pub/sub message still stops the run at the next boundary). A failing
         * marker read is swallowed to "not cancelled" so it can never crash a run.
         */
        const shouldStop = async (): Promise<boolean> => {
          if (abortSignal?.aborted) {
            return true;
          }
          if (isCancellationRequested === undefined) {
            return false;
          }
          try {
            return await isCancellationRequested();
          } catch {
            return false;
          }
        };

        const iterationTimeoutSeconds =
          iterationTimeout ?? timeout ?? undefined;
        let timeoutMs: number | undefined;
        if (iterationTimeoutSeconds != null) {
          timeoutMs = iterationTimeoutSeconds * 1000;
        }

        // budget.deadline
        // `maxIterations` (count) and `timeoutMs` (per-iteration) alone allow
        // `iterations × ~iterationTimeout` of unbounded-in-cost wall-clock on a
        // stuck plan. Cap cumulative wall-clock: prefer the explicit
        // `OPENTHROTTLE_RALPH_MAX_TOTAL_MS` env override, else derive a ceiling of
        // `perIterationTimeoutMs × maxIterations`. Checked in the iteration guard.
        const startedAtMs = Date.now();
        const explicitTotalMs = resolveRalphMaxTotalMsFromEnv();
        const derivedTotalMs =
          timeoutMs != null ? timeoutMs * maxIterations : undefined;
        let totalDeadlineMs: number | undefined;
        if (explicitTotalMs != null) {
          totalDeadlineMs = startedAtMs + explicitTotalMs;
        } else if (derivedTotalMs != null) {
          totalDeadlineMs = startedAtMs + derivedTotalMs;
        }

        if (await shouldStop()) {
          return onFinished('workflow_cancelled');
        }

        let lastIterationTaskId: string | undefined;
        let lastIterationTaskCompleted = false;

        const lifecycleDispatcher = context.lifecycleDispatcher;

        /**
         * Exit for the iteration and budget limits. Hands the unfinished task back to PENDING,
         * then, in plan mode, settles the plan (BLOCKED or COMPLETED) and finalizes so committed
         * work is pushed under a draft PR. Task mode only hands the task back: the plan's other
         * tasks are not this run's to judge.
         */
        const settleRunLimit = async (
          reason: 'workflow_budget_exhausted' | 'workflow_max_iterations',
          limitLabel: string,
        ): Promise<WorkflowRunResult> => {
          if (lastIterationTaskId && !lastIterationTaskCompleted) {
            await resetTaskToPending(
              executeGraphqlV2,
              lastIterationTaskId,
              sessionOptions,
              onChunk,
            );
          }

          if (isTaskCentric) {
            return onFinished(reason);
          }

          const settled = await settlePlanAtRunLimit({
            executeGraphqlV2,
            limitLabel,
            onChunk,
            planId: effectivePlanId,
            reason,
            sessionOptions,
          });

          return maybeFinalize(onFinished(settled));
        };

        /**
         * This is where we run our guarded loop (max iterations) chipping away
         * at the plan and its tasks.
         */
        for (let iteration = 1; iteration <= maxIterations; iteration++) {
          // iteration.guard
          if (await shouldStop()) {
            return onFinished('workflow_cancelled');
          }

          if (totalDeadlineMs != null && Date.now() >= totalDeadlineMs) {
            await emitDiagnostic(onChunk, {
              error: new Error(
                `cumulative wall-clock budget exhausted before iteration ${iteration}`,
              ),
              phase: 'budget guard',
            });

            return settleRunLimit(
              'workflow_budget_exhausted',
              `Wall-clock budget exhausted after ${iteration - 1}/${maxIterations} iteration(s)`,
            );
          }

          let agentPrompt = basePrompt;
          let firstPendingForIteration: string | undefined;

          // task.guard
          if (!isTaskCentric) {
            // task.load
            const planTasks = await executeGraphqlV2(GetTasksByPlanIdDocument, {
              input: { planId: effectivePlanId },
            });

            // task.filter — runner-executed hook-tasks are handled by the lifecycle
            // dispatcher (beforeAll/afterAll/beforeEach/afterEach), never picked here.
            const progress = classifyPlanTasks(planTasks.tasksByPlanId);

            if (progress.kind === 'completed') {
              await executeGraphqlV2(
                UpdatePlanDocument,
                { input: { id: effectivePlanId, status: 'COMPLETED' } },
                sessionOptions,
              );

              // 🟢 If we've exhausted the tasks, we return a finished outcome
              return maybeFinalize(onFinished('workflow_tasks_exhausted'));
            }

            if (progress.kind === 'blocked') {
              // 🟡 Only BLOCKED tasks left: no iteration can move them, so stop without
              // spending one. The plan ends BLOCKED and the work so far is still pushed.
              await markPlanBlocked({
                blockedTitles: progress.blockedTitles,
                executeGraphqlV2,
                onChunk,
                planId: effectivePlanId,
                sessionOptions,
              });

              return maybeFinalize(onFinished('workflow_tasks_blocked'));
            }

            const { workable } = progress;
            const taskForIteration = pickRalphTaskForIteration(workable);

            if (taskForIteration) {
              firstPendingForIteration = taskForIteration.id;

              const isPending = taskForIteration.status === 'PENDING';
              const isQueued = taskForIteration.status === 'QUEUED';

              if (isPending || isQueued) {
                await executeGraphqlV2(
                  UpdateTaskDocument,
                  { input: { id: taskForIteration.id, status: 'IN_PROGRESS' } },
                  sessionOptions,
                );

                if (lifecycleDispatcher) {
                  const beforeEachResult = await lifecycleDispatcher.runTask({
                    phase: 'beforeEach',
                    task: toLifecycleTaskContext({
                      ...taskForIteration,
                      status: 'IN_PROGRESS',
                    }),
                  });

                  if (beforeEachResult.blocked) {
                    await executeGraphqlV2(
                      UpdateTaskDocument,
                      { input: { id: taskForIteration.id, status: 'BLOCKED' } },
                      sessionOptions,
                    );

                    await lifecycleDispatcher.runTask({
                      phase: 'afterEach',
                      task: toLifecycleTaskContext({
                        ...taskForIteration,
                        status: 'BLOCKED',
                      }),
                      taskOutcome: 'blocked',
                    });

                    continue;
                  }
                }
              } else {
                await promotePlanToInProgressIfNeeded(
                  executeGraphqlV2,
                  effectivePlanId,
                  sessionOptions,
                );
              }

              agentPrompt =
                `${basePrompt} Current task for this iteration: ${taskForIteration.id}. When you log progress via append_plan_output, pass taskId: ${taskForIteration.id} — the task you are actively working — so the output is attributed to that task and not just the iteration. (One iteration can touch several tasks; if you switch tasks mid-iteration, tag the id of the task you are actually working.) When you complete it output <ralph:task-complete>${taskForIteration.id}</ralph:task-complete> so the CLI can mark it completed.` +
                (isLastWorkableTask(workable, taskForIteration.id)
                  ? buildFinalIterationPromptLine(prDraftDir)
                  : '');
            }
          }

          /**
           * All that setup and now we have our prompt ready to go on with a
           * fresh invocation of the agent
           */

          // iteration.run
          let agentOutput: string;
          // Holder object (not a `let`) so the callback's write is not narrowed away at the read below.
          const usageLimitHit: { current: WorkflowRalphUsageLimit | null } = {
            current: null,
          };
          // iteration.trajectory — only when the host resolved a plan_runs row to record against.
          const trajectoryCapture = buildTrajectoryCapture({
            context,
            effectivePlanId,
            executeGraphqlV2,
            iteration,
            sessionOptions,
            taskId: taskIdTrim || firstPendingForIteration,
          });
          try {
            agentOutput = await iterationRunner.run({
              agentPrompt,
              cwd: agentCwd,
              effort: context.effort,
              ...(agentEnv === undefined ? {} : { env: agentEnv }),
              ...trajectoryCapture,
              iteration,
              model: context.model,
              onChunk,
              onUsageLimit: (limit) => {
                usageLimitHit.current = limit;
              },
              runner: context.runner,
              signal: abortSignal,
              skipWorktreeSetup: context.skipWorktreeSetup,
              timeoutMs,
              worktree: context.worktree,
              worktreeBase: context.worktreeBase,
            });
          } catch (error) {
            await emitDiagnostic(onChunk, {
              error,
              phase: `iteration ${iteration} runner failed`,
            });

            return onFailure('workflow_unhandled');
          }

          if (await shouldStop()) {
            return onFinished('workflow_cancelled');
          }

          // iteration.usage_limit — a limited run exits non-zero with the limit message as its
          // "output". Not a real iteration: no marker parsing, no completions. Hand the in-flight
          // task back and stop cleanly so the host can resume the run after the reset.
          if (usageLimitHit.current !== null) {
            await emitDiagnostic(onChunk, {
              error: new Error(
                `usage limit reached (${usageLimitHit.current.rateLimitType ?? 'unknown window'}); resets at ${usageLimitHit.current.resetsAt ?? 'an unknown time'}`,
              ),
              phase: `iteration ${iteration} stopped`,
            });

            await resetTaskToPending(
              executeGraphqlV2,
              taskIdTrim || firstPendingForIteration,
              sessionOptions,
              onChunk,
            );

            return onUsageLimited(usageLimitHit.current);
          }

          // Completion ids are kept in their original casing so the
          // `UpdateTaskDocument` mutation matches a case-sensitive server-side
          // UUID lookup; comparisons below lowercase both sides explicitly.
          const completeTaskIds = [
            ...parseAgentCompleteTaskSignals(agentOutput),
          ];
          const hasCompletionId = (candidate: string): boolean => {
            const lowered = candidate.toLowerCase();

            return completeTaskIds.some((id) => id.toLowerCase() === lowered);
          };

          if (
            taskIdTrim &&
            agentOutputHasPromiseComplete(agentOutput) &&
            !hasCompletionId(taskIdTrim)
          ) {
            completeTaskIds.push(taskIdTrim);
          }

          const currentTaskAlreadyMarked =
            firstPendingForIteration !== undefined &&
            hasCompletionId(firstPendingForIteration);

          if (
            !taskIdTrim &&
            firstPendingForIteration &&
            agentOutputHasPromiseComplete(agentOutput) &&
            !currentTaskAlreadyMarked
          ) {
            completeTaskIds.push(firstPendingForIteration);
          }

          // tasks.apply_completions
          for (const taskId of completeTaskIds) {
            try {
              await executeGraphqlV2(
                UpdateTaskDocument,
                { input: { id: taskId, status: 'COMPLETED' } },
                sessionOptions,
              );

              if (lifecycleDispatcher && !isTaskCentric) {
                const tasks = await executeGraphqlV2(GetTasksByPlanIdDocument, {
                  input: { planId: effectivePlanId },
                });

                const completedTask = tasks.tasksByPlanId.find(
                  (t) => t.id.toLowerCase() === taskId.toLowerCase(),
                );

                if (completedTask) {
                  await lifecycleDispatcher.runTask({
                    phase: 'afterEach',
                    task: toLifecycleTaskContext({
                      ...completedTask,
                      status: 'COMPLETED',
                    }),
                    taskOutcome: 'completed',
                  });
                }
              }
            } catch (error) {
              // Parity with ralph.ts: a failed completion is non-fatal (the next
              // iteration re-reads task state), but surface it instead of swallowing.
              await emitDiagnostic(onChunk, {
                error,
                phase: `iteration ${iteration} task ${taskId} completion update failed`,
              });
            }
          }

          const currentTaskId = taskIdTrim || firstPendingForIteration;

          lastIterationTaskId = currentTaskId;
          lastIterationTaskCompleted = currentTaskId
            ? hasCompletionId(currentTaskId)
            : false;

          // plan.reconcile (task-centric)
          // Plan mode reconciles at the top of each iteration via the
          // `remaining.length === 0` branch; task mode never enters that branch,
          // so completing the plan's last task here would otherwise strand the
          // parent non-terminal. Reconcile the parent ourselves when this
          // iteration applied a completion.
          if (isTaskCentric && completeTaskIds.length > 0) {
            try {
              const reconciled = await reconcilePlanIfTasksExhausted({
                executeGraphqlV2,
                onChunk,
                planId: effectivePlanId,
                sessionOptions,
              });

              if (reconciled !== undefined) {
                return maybeFinalize(onFinished(reconciled));
              }
            } catch (error) {
              await emitDiagnostic(onChunk, {
                error,
                phase: `iteration ${iteration} plan ${effectivePlanId} reconcile failed`,
              });
            }
          }

          // agent.parse_control (order is specific)
          const control = parseAgentOutput(agentOutput);

          // The task this iteration was working, unless the iteration completed it.
          const candidateTaskId = taskIdTrim || firstPendingForIteration;
          const isUnfinished =
            candidateTaskId !== undefined &&
            candidateTaskId !== '' &&
            !hasCompletionId(candidateTaskId);
          const unfinishedTaskId = isUnfinished ? candidateTaskId : undefined;

          // A failed run is settled FAILED by its host, which moves neither the task nor the plan,
          // so a failure exit must leave both where a human can pick them up — never IN_PROGRESS.
          // In plan mode the plan settles like an iteration-limit stop (BLOCKED, or COMPLETED when
          // nothing is left); a task-centric run leaves its plan alone, as at the iteration limit.
          const settlePlanForFailure = async (label: string): Promise<void> => {
            if (isTaskCentric) {
              return;
            }

            await settlePlanAwaitingHuman({
              executeGraphqlV2,
              label,
              onChunk,
              planId: effectivePlanId,
              sessionOptions,
            });
          };

          // 1. 🔴 We check for any errors. The in-flight task goes back to PENDING (as on a usage
          // limit or the iteration limit). Not BLOCKED — the engine's own timeout/abort sentinel
          // is this same marker, so an ERROR is often transient.
          if (control === 'ERROR') {
            if (unfinishedTaskId !== undefined) {
              await resetTaskToPending(
                executeGraphqlV2,
                unfinishedTaskId,
                sessionOptions,
                onChunk,
              );
            }

            await settlePlanForFailure(
              `Agent reported an error (iteration ${iteration})`,
            );

            return onFailure('workflow_agent_error');
          }

          // 2. 🟡 Then we check for any input required.
          // A finished plan (no runnable tasks left) must not fail just because the
          // agent asked for input after completing everything — that is a
          // non-failing handoff-owed outcome. Re-read tasks here: completions from
          // this same iteration may have just landed.
          if (control === 'INPUT_REQUIRED') {
            try {
              const planTasksAfterInput = await executeGraphqlV2(
                GetTasksByPlanIdDocument,
                { input: { planId: effectivePlanId } },
              );
              const remainingAfterInput =
                planTasksAfterInput.tasksByPlanId.filter(isRunnableRalphTask);

              if (remainingAfterInput.length === 0) {
                return maybeFinalize(
                  onFinished('workflow_complete_handoff_owed'),
                );
              }
            } catch (error) {
              await emitDiagnostic(onChunk, {
                error,
                phase: `iteration ${iteration} INPUT_REQUIRED remaining-task re-read failed`,
              });
            }

            // The agent is waiting on a human answer, so its task is BLOCKED rather than handed
            // back to PENDING: a re-run alone would ask the same question again.
            if (unfinishedTaskId !== undefined) {
              await markTaskBlocked(
                executeGraphqlV2,
                unfinishedTaskId,
                sessionOptions,
                onChunk,
              );
            }

            await settlePlanForFailure(
              `Agent needs input (iteration ${iteration})`,
            );

            return onFailure('workflow_input_required');
          }

          // 3. 🟢 Then we check for any completion
          if (control === 'COMPLETE') {
            return maybeFinalize(onFinished('workflow_complete'));
          }
        } // ---> looping ... done

        // 4–5. 🟡 We've run every iteration we were given: hand the unfinished task back and
        // settle the plan (BLOCKED, or COMPLETED if the last iteration finished it).
        return settleRunLimit(
          'workflow_max_iterations',
          `Iteration limit reached (${maxIterations}/${maxIterations})`,
        );
      } catch (error) {
        await emitDiagnostic(onChunk, {
          error,
          phase: 'orchestrator aborted with an unhandled error',
        });

        return onFailure('workflow_unhandled');
      }
    },
  };
};
