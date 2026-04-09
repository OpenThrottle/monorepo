/* eslint-disable no-await-in-loop */ // FIXME: We can better handle these instances

import {
  GetPlanDocument,
  GetServerHealthDocument,
  GetTaskDocument,
  GetTasksByPlanIdDocument,
  UpdatePlanDocument,
  UpdateTaskDocument,
} from '../../__generated__/graphql.js';
import type { WorkflowRalphContext } from './contract/flow-context.js';
import type {
  WorkflowFailedReason,
  WorkflowFinishedReason,
  WorkflowOrchestrator,
  LegacyWorkflowResult,
} from './contract/orchestrator.js';
import type { WorkflowRalphOrchestratorDeps } from './contract/ralph-orchestrator-deps.js';
import {
  parseRalphAgentParseControl,
  parseRalphCompleteTaskSignals,
  ralphOutputHasPromiseComplete,
} from './ralph-agent-output.js';
import { formatPlanAndTasksForPrompt } from './utils/index.js';

const REMAINING_TASK_STATUS = new Set([
  'PENDING',
  'QUEUED',
  'IN_PROGRESS',
  'BLOCKED',
]);

const finished = (reason: WorkflowFinishedReason): LegacyWorkflowResult => ({
  exitCode: 0,
  reason,
  status: 'finished',
});

const failed = (reason: WorkflowFailedReason): LegacyWorkflowResult => ({
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
): WorkflowOrchestrator<WorkflowRalphContext> => ({
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
          return failed('unhandled');
        }

        effectivePlanId = taskLookup.task.planId;
      } else if (planIdTrim === '' && taskIdTrim === '') {
        return failed('unhandled');
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
        return failed('unhandled');
      }

      // prompt.build
      const injectedContext = formatPlanAndTasksForPrompt(planRow, tasksRows);
      const basePrompt =
        `${context.prompt}\n\n${injectedContext}\n\n` +
        `Plan-Id: ${effectivePlanId}.` +
        (taskIdTrim ? ` Task-Id: ${taskIdTrim}.` : '') +
        ' Use the plan and tasks above (injected from Cortex by Ralph). Do not call get_plan or get_tasks_by_plan_id; the context is provided. When you complete a task output <ralph:task-complete>TASK_UUID</ralph:task-complete>.';

      // plan.guard
      if (planRow.status === 'COMPLETED' || planRow.status === 'SKIPPED') {
        // 🟡 If the plan is already terminal, we return a finished outcome
        return finished('plan_already_terminal');
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

      const maxIterations = context.iterations;
      const iterationTimeoutSeconds =
        context.iterationTimeout ?? context.timeout ?? undefined;

      const timeoutMs =
        iterationTimeoutSeconds != null
          ? iterationTimeoutSeconds * 1000
          : undefined;

      const abortSignal = context.abortSignal;

      if (abortSignal?.aborted) {
        return finished('cancelled');
      }

      let lastIterationTaskId: string | undefined;
      let lastIterationTaskCompleted = false;

      for (let iteration = 1; iteration <= maxIterations; iteration++) {
        if (abortSignal?.aborted) {
          return finished('cancelled');
        }

        let agentPrompt = basePrompt;
        let firstPendingForIteration: string | undefined;

        if (!isTaskCentric) {
          const planTasks = await executeGraphqlV2(GetTasksByPlanIdDocument, {
            input: { planId: effectivePlanId },
          });

          const remaining = planTasks.tasksByPlanId.filter((t) =>
            REMAINING_TASK_STATUS.has(t.status),
          );

          if (remaining.length === 0) {
            await executeGraphqlV2(UpdatePlanDocument, {
              input: { id: effectivePlanId, status: 'COMPLETED' },
            });

            // 🟢 If we've exhausted the tasks, we return a finished outcome
            return finished('tasks_exhausted');
          }

          // Grab any tasks that may already be marked in progress
          const firstInProgress = remaining.find(
            (t) => t.status === 'IN_PROGRESS',
          );

          // Otherwise we'll pick up the next available task
          const taskForIteration =
            firstInProgress ??
            remaining.find((t) => ['QUEUED', 'PENDING'].includes(t.status));

          if (taskForIteration) {
            firstPendingForIteration = taskForIteration.id;

            if (
              taskForIteration.status === 'PENDING' ||
              taskForIteration.status === 'QUEUED'
            ) {
              await executeGraphqlV2(UpdateTaskDocument, {
                input: { id: taskForIteration.id, status: 'IN_PROGRESS' },
              });
            }

            agentPrompt = `${basePrompt} Current task for this iteration: ${taskForIteration.id}. When you complete it output <ralph:task-complete>${taskForIteration.id}</ralph:task-complete> so the CLI can mark it completed.`;
          }
        }

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
            timeoutMs,
          });
        } catch {
          return failed('unhandled');
        }

        if (abortSignal?.aborted) {
          return finished('cancelled');
        }

        const completeTaskIds = [...parseRalphCompleteTaskSignals(agentOutput)];

        if (
          taskIdTrim &&
          ralphOutputHasPromiseComplete(agentOutput) &&
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
          ralphOutputHasPromiseComplete(agentOutput) &&
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
        const control = parseRalphAgentParseControl(agentOutput);

        // 1. 🔴 We check for any errors
        if (control === 'ERROR') {
          return failed('agent_error');
        }

        // 2. 🟡 Then we check for any input required
        if (control === 'INPUT_REQUIRED') {
          return failed('input_required');
        }

        // 3. 🟢 Then we check for any completion
        if (control === 'COMPLETE') {
          return finished('agent_complete');
        }
      }

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

      // 5. 🟡 If we've made it this far but we've hit our limit
      return finished('max_iterations');
    } catch {
      return failed('unhandled');
    }
  },
});
