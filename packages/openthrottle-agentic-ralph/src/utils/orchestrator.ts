/* eslint-disable no-await-in-loop */ // FIXME: We can better handle these instances

import type { WorkflowRunResult } from '@openthrottle/openthrottle-agentic-workflow';
import type {
  WorkflowFailedReason,
  WorkflowFinishedReason,
  WorkflowOrchestrator,
} from '../types.js';
import {
  GetPlanDocument,
  GetServerHealthDocument,
  GetTaskDocument,
  GetTasksByPlanIdDocument,
  UpdatePlanDocument,
  UpdateTaskDocument,
} from '../__generated__/graphql.js';
import type { WorkflowRalphOrchestratorDeps } from '../contract/ralph-orchestrator-deps.js';
import {
  parseAgentOutput,
  parseAgentCompleteTaskSignals,
  agentOutputHasPromiseComplete,
} from '../utils/output.js';
import { formatPlanAndTasksForPrompt } from '../utils/index.js';

const REMAINING_TASK_STATUS = new Set([
  'PENDING',
  'QUEUED',
  'IN_PROGRESS',
  'BLOCKED',
]);

const onFinished = (
  reason: WorkflowFinishedReason,
): WorkflowRunResult<WorkflowFinishedReason, WorkflowFailedReason> => ({
  exitCode: 0,
  reason,
  status: 'finished',
});

const onFailure = (
  reason: WorkflowFailedReason,
): WorkflowRunResult<WorkflowFinishedReason, WorkflowFailedReason> => ({
  exitCode: 1,
  reason,
  status: 'failed',
});

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
    const { executeGraphqlV2, iterationRunner, onChunk } = deps;

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
          return onFailure('unhandled');
        }

        effectivePlanId = taskLookup.task.planId;
      } else if (planIdTrim === '' && taskIdTrim === '') {
        return onFailure('unhandled');
      }

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
        return onFailure('unhandled');
      }

      // prompt.build
      const injectedContext = formatPlanAndTasksForPrompt(planRow, tasksRows);
      const basePrompt =
        `${context.prompt}\n\n${injectedContext}\n\n` +
        `Plan-Id: ${effectivePlanId}.` +
        (taskIdTrim ? ` Task-Id: ${taskIdTrim}.` : '') +
        ' Use the plan and tasks above (injected from OpenThrottle by Ralph). Do not call get_plan or get_tasks_by_plan_id; the context is provided. When you complete a task output <ralph:task-complete>TASK_UUID</ralph:task-complete>.';

      // plan.guard
      if (planRow.status === 'COMPLETED' || planRow.status === 'SKIPPED') {
        // 🟡 If the plan is already terminal, we return a finished outcome
        return onFinished('plan_already_terminal');
      }

      // plan.mark_in_progress
      await executeGraphqlV2(UpdatePlanDocument, {
        input: { id: effectivePlanId, status: 'IN_PROGRESS' },
      });

      // task.mark_in_progress
      if (taskIdTrim) {
        await executeGraphqlV2(UpdateTaskDocument, {
          input: { id: taskIdTrim, status: 'IN_PROGRESS' },
        });
      }

      const {
        abortSignal,
        iterations: maxIterations,
        iterationTimeout,
        timeout,
      } = context;

      const iterationTimeoutSeconds = iterationTimeout ?? timeout ?? undefined;
      const timeoutMs =
        iterationTimeoutSeconds != null
          ? iterationTimeoutSeconds * 1000
          : undefined;

      if (abortSignal?.aborted) {
        return onFinished('cancelled');
      }

      let lastIterationTaskId: string | undefined;
      let lastIterationTaskCompleted = false;

      /**
       * This is where we run our guarded loop (max iterations) chipping away
       * at the plan and its tasks.
       */
      for (let iteration = 1; iteration <= maxIterations; iteration++) {
        // iteration.guard
        if (abortSignal?.aborted) {
          return onFinished('cancelled');
        }

        let agentPrompt = basePrompt;
        let firstPendingForIteration: string | undefined;

        // task.guard
        if (!isTaskCentric) {
          // task.load
          const planTasks = await executeGraphqlV2(GetTasksByPlanIdDocument, {
            input: { planId: effectivePlanId },
          });

          // task.filter
          const remaining = planTasks.tasksByPlanId.filter((t) =>
            REMAINING_TASK_STATUS.has(t.status),
          );

          if (remaining.length === 0) {
            await executeGraphqlV2(UpdatePlanDocument, {
              input: { id: effectivePlanId, status: 'COMPLETED' },
            });

            // 🟢 If we've exhausted the tasks, we return a finished outcome
            return onFinished('tasks_exhausted');
          }

          // Grab any tasks that may already be marked in progress
          const firstInProgress = remaining.find(
            (t) => t.status === 'IN_PROGRESS',
          );

          const nextAvailableTask = remaining.find((t) =>
            ['QUEUED', 'PENDING'].includes(t.status),
          );

          // Otherwise we'll pick up the next available task
          const taskForIteration = firstInProgress ?? nextAvailableTask;

          if (taskForIteration) {
            firstPendingForIteration = taskForIteration.id;

            const isPending = taskForIteration.status === 'PENDING';
            const isQueued = taskForIteration.status === 'QUEUED';

            if (isPending || isQueued) {
              await executeGraphqlV2(UpdateTaskDocument, {
                input: { id: taskForIteration.id, status: 'IN_PROGRESS' },
              });
            }

            agentPrompt = `${basePrompt} Current task for this iteration: ${taskForIteration.id}. When you complete it output <ralph:task-complete>${taskForIteration.id}</ralph:task-complete> so the CLI can mark it completed.`;
          }
        }

        /**
         * All that setup and now we have our prompt ready to go on with a
         * fresh invocation of the agent
         */

        // iteration.run
        let agentOutput: string;
        try {
          agentOutput = await iterationRunner.run({
            agentPrompt,
            iteration,
            model: context.model,
            onChunk,
            runner: context.runner,
            signal: abortSignal,
            skipWorktreeSetup: context.skipWorktreeSetup,
            timeoutMs,
            worktree: context.worktree,
            worktreeBase: context.worktreeBase,
          });
        } catch {
          return onFailure('unhandled');
        }

        if (abortSignal?.aborted) {
          return onFinished('cancelled');
        }

        const completeTaskIds = [...parseAgentCompleteTaskSignals(agentOutput)];

        if (
          taskIdTrim &&
          agentOutputHasPromiseComplete(agentOutput) &&
          !completeTaskIds.some((id) => id === taskIdTrim.toLowerCase())
        ) {
          completeTaskIds.push(taskIdTrim.toLowerCase());
        }

        const currentTaskAlreadyMarked =
          firstPendingForIteration !== undefined &&
          completeTaskIds.some(
            (id) => id === firstPendingForIteration.toLowerCase(),
          );

        if (
          !taskIdTrim &&
          firstPendingForIteration &&
          agentOutputHasPromiseComplete(agentOutput) &&
          !currentTaskAlreadyMarked
        ) {
          completeTaskIds.push(firstPendingForIteration.toLowerCase());
        }

        // tasks.apply_completions
        for (const taskId of completeTaskIds) {
          try {
            await executeGraphqlV2(UpdateTaskDocument, {
              input: { id: taskId, status: 'COMPLETED' },
            });
          } catch {
            // Parity with ralph.ts: log side effects are CLI-only; continue.
          }
        }

        const currentTaskId = taskIdTrim || firstPendingForIteration;

        lastIterationTaskId = currentTaskId;
        lastIterationTaskCompleted = currentTaskId
          ? completeTaskIds.some((id) => id === currentTaskId.toLowerCase())
          : false;

        // agent.parse_control (order is specific)
        const control = parseAgentOutput(agentOutput);

        // 1. 🔴 We check for any errors
        if (control === 'ERROR') {
          return onFailure('agent_error');
        }

        // 2. 🟡 Then we check for any input required
        if (control === 'INPUT_REQUIRED') {
          return onFailure('input_required');
        }

        // 3. 🟢 Then we check for any completion
        if (control === 'COMPLETE') {
          return onFinished('agent_complete');
        }
      } // ---> looping ... done

      // 4. 🟡 If we have a task id and it's not completed, we mark it as pending
      if (lastIterationTaskId && !lastIterationTaskCompleted) {
        try {
          await executeGraphqlV2(UpdateTaskDocument, {
            input: { id: lastIterationTaskId, status: 'PENDING' },
          });
        } catch {
          // Best-effort reset (ralph.ts warns on failure).
        }
      }

      // 5. 🟡 We've successfully completed the iterations, but we've hit our limit
      return onFinished('max_iterations');
    } catch {
      return onFailure('unhandled');
    }
  },
});
