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
import { WORKFLOW_PROMPT_SHELL_COMMAND_GUARDRAIL } from '@openthrottle/openthrottle-agentic-utils';
import {
  buildForeignWorkspacePromptLayer,
  resolveForeignWorkspaceContext,
} from '@openthrottle/openthrottle-agentic-utils';
import type { WorkflowLifecycleTaskContext } from '@openthrottle/openthrottle-agentic-workflow';

import {
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
  pickRalphTaskForIteration,
} from '../utils/index.ts';
import {
  agentOutputHasPromiseComplete,
  parseAgentCompleteTaskSignals,
  parseAgentOutput,
} from '../utils/output.ts';
import { PLAN_RUN_PR_DRAFT_DIR_ENV } from '../utils/plan-run-pr-draft.ts';

/**
 * @description Clamps the iteration ceiling defensively. `WorkflowContext` is built by paths that
 * bypass `resolveWorkflowRunOptions` clamping (e.g. developer UI / `buildRalphFlowContextFromRunOptionsShape`),
 * so a `0`/negative/`NaN` `iterations` could otherwise skip the loop body entirely and report a
 * silent no-op run as success. Falls back to {@link DEFAULT_ITERATIONS}.
 */
const resolveMaxIterations = (iterations: number): number =>
  Number.isInteger(iterations) && iterations >= 1
    ? iterations
    : DEFAULT_ITERATIONS;

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
 */
const FINAL_ITERATION_PROMPT_LINE =
  ' OT_FINAL_ITERATION=1: this is the last runnable task in the plan. After you complete and commit it, run /github-pull-request in draft-only mode (draft directory: $OT_PR_DRAFT_DIR when set, else the skill default) so the host can publish the PR. Never git push and never open, edit or ready the PR yourself.';

/**
 * @description True when `taskId` is the only runnable task left, i.e. finishing it ends the plan.
 */
const isLastRunnableTask = (
  runnable: readonly { readonly id: string }[],
  taskId: string,
): boolean => {
  const lowered = taskId.toLowerCase();

  return (
    runnable.length > 0 &&
    runnable.every((task) => task.id.toLowerCase() === lowered)
  );
};

const toLifecycleTaskContext = (task: {
  readonly category?: string | null;
  readonly id: string;
  readonly status: string;
  readonly title: string;
}): WorkflowLifecycleTaskContext => ({
  category: task.category ?? undefined,
  id: task.id,
  status: task.status,
  title: task.title,
});

const onFinished = (
  reason: Exclude<WorkflowFinishedReason, 'workflow_usage_limited'>,
): WorkflowRunResult => ({
  exitCode: 0,
  reason,
  status: 'finished',
});

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
): ExecuteGraphqlOptionsV2 | undefined =>
  workSessionId != null && workSessionId !== ''
    ? { headers: { 'X-OT-Session-Id': workSessionId } }
    : undefined;

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
 * @description Re-queries the plan's tasks and marks the plan COMPLETED when no non-terminal task
 * remains. The server performs no downward reconcile (see repo memory "no server-side downward
 * reconcile"), so a task-scoped run that completes the plan's last task must reconcile the parent
 * itself — otherwise the plan is stranded non-terminal with every task COMPLETED. Mirrors the
 * plan-mode `remaining.length === 0 → COMPLETED` path. Returns `true` when it reconciled.
 */
const reconcilePlanIfTasksExhausted = async (
  executeGraphqlV2: WorkflowRalphOrchestratorDeps['executeGraphqlV2'],
  planId: string,
  sessionOptions: ExecuteGraphqlOptionsV2 | undefined,
): Promise<boolean> => {
  const planTasks = await executeGraphqlV2(GetTasksByPlanIdDocument, {
    input: { planId },
  });

  const remaining = planTasks.tasksByPlanId.filter(isRunnableRalphTask);

  if (remaining.length > 0) {
    return false;
  }

  await executeGraphqlV2(
    UpdatePlanDocument,
    { input: { id: planId, status: 'COMPLETED' } },
    sessionOptions,
  );

  return true;
};

/**
 * @description Best-effort reset of a task to PENDING (used when an iteration ends without finishing
 * it: max iterations, usage limit). Failure is surfaced as a diagnostic, never thrown (ralph.ts warns).
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
): WorkflowOrchestrator => ({
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
      const prDraftDir =
        runCommand === undefined
          ? undefined
          : await preparePlanRunPrDraftDir({
              cwd: resolveOrchestratorAgentCwd(context),
              runCommand,
            });
      const agentEnv =
        prDraftDir === undefined
          ? undefined
          : { [PLAN_RUN_PR_DRAFT_DIR_ENV]: prDraftDir };

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
      const taskModeFinalLine =
        isTaskCentric &&
        taskIdTrim !== '' &&
        isLastRunnableTask(tasksRows.filter(isRunnableRalphTask), taskIdTrim)
          ? FINAL_ITERATION_PROMPT_LINE
          : '';
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

      const iterationTimeoutSeconds = iterationTimeout ?? timeout ?? undefined;
      const timeoutMs =
        iterationTimeoutSeconds != null
          ? iterationTimeoutSeconds * 1000
          : undefined;

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
      const totalDeadlineMs =
        explicitTotalMs != null
          ? startedAtMs + explicitTotalMs
          : derivedTotalMs != null
            ? startedAtMs + derivedTotalMs
            : undefined;

      if (await shouldStop()) {
        return onFinished('workflow_cancelled');
      }

      let lastIterationTaskId: string | undefined;
      let lastIterationTaskCompleted = false;

      const lifecycleDispatcher = context.lifecycleDispatcher;

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

          return onFinished('workflow_budget_exhausted');
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
          const remaining = planTasks.tasksByPlanId.filter(isRunnableRalphTask);

          if (remaining.length === 0) {
            await executeGraphqlV2(
              UpdatePlanDocument,
              { input: { id: effectivePlanId, status: 'COMPLETED' } },
              sessionOptions,
            );

            // 🟢 If we've exhausted the tasks, we return a finished outcome
            return maybeFinalize(onFinished('workflow_tasks_exhausted'));
          }

          const taskForIteration = pickRalphTaskForIteration(remaining);

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
              (isLastRunnableTask(remaining, taskForIteration.id)
                ? FINAL_ITERATION_PROMPT_LINE
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
        try {
          agentOutput = await iterationRunner.run({
            agentPrompt,
            cwd: agentCwd,
            effort: context.effort,
            ...(agentEnv === undefined ? {} : { env: agentEnv }),
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
        const completeTaskIds = [...parseAgentCompleteTaskSignals(agentOutput)];
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
            const reconciled = await reconcilePlanIfTasksExhausted(
              executeGraphqlV2,
              effectivePlanId,
              sessionOptions,
            );

            if (reconciled) {
              return maybeFinalize(onFinished('workflow_tasks_exhausted'));
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

        // 1. 🔴 We check for any errors
        if (control === 'ERROR') {
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

          return onFailure('workflow_input_required');
        }

        // 3. 🟢 Then we check for any completion
        if (control === 'COMPLETE') {
          return maybeFinalize(onFinished('workflow_complete'));
        }
      } // ---> looping ... done

      // 4. 🟡 If we have a task id and it's not completed, we mark it as pending
      if (lastIterationTaskId && !lastIterationTaskCompleted) {
        await resetTaskToPending(
          executeGraphqlV2,
          lastIterationTaskId,
          sessionOptions,
          onChunk,
        );
      }

      // 5. 🟡 We've successfully completed the iterations, but we've hit our limit
      return onFinished('workflow_max_iterations');
    } catch (error) {
      await emitDiagnostic(onChunk, {
        error,
        phase: 'orchestrator aborted with an unhandled error',
      });

      return onFailure('workflow_unhandled');
    }
  },
});
