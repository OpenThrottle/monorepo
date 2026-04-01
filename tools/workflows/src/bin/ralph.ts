#!/usr/bin/env node

/**
 * Ralph: agentic plan/task runner. Single flow (Cortex required); see main() for steps.
 */

import { ARTWORK_RALPH, COLORS } from '../config/index';
import { MESSAGE_COMPLETED, MESSAGE_INTRO } from '../config/messages';
import { getNxProjectNames } from '../utils/projects';
import type { RalphArgs } from '../utils/parsers';
import {
  parseRalphArgs,
  parseRalphCompleteTaskSignals,
  parseRalphResponse,
} from '../utils/parsers';
import { ralphDebugLogger } from '../utils/ralph-debug-logger';
import { isComplete, showConfiguration, showRalphUsage } from '../utils/index';
import {
  ensureCortexReachableOrExit,
  formatPlanAndTasksForPrompt,
  getCortexConfigOrExit,
  getPlanById,
  getTaskById,
  getTasksByPlanId,
  updatePlanStatus,
  updateTaskStatus,
  WORKFLOW_FATAL_PREFIX,
} from '../utils/cortex-ralph';
import { ARTWORK_THANK_YOU } from '../config/index';
import {
  runIteration,
  runIterationAsync,
  RunIterationConfig,
} from './run-iteration';

export type { CursorAgentChunk, RunIterationConfig } from './run-iteration';

/**
 * @description Main entry point. Single flow:
 *
 * 1. Cortex required (getCortexConfigOrExit → ensureCortexReachableOrExit)
 * 2. Resolve plan/task (--plan or from task.planId when --task only)
 * 3. Fetch plan and tasks from Postgres; inject into prompt
 * 4. Set plan and current task to IN_PROGRESS
 * 5. Run agent → parse <ralph:complete-task> and <promise>COMPLETE</promise> → update task statuses
 * 6. Exit on COMPLETE, ERROR, or INPUT_REQUIRED (parseRalphResponse) or after max iterations
 *
 * Exit conditions (order of checks):
 * - Plan already COMPLETED or SKIPPED at start → log and exit(0); agent not run.
 * - Plan-centric and no remaining tasks (start of iteration) → set plan COMPLETED, log, exit(0); agent not run for that iteration.
 * - parseRalphResponse: ERROR or INPUT_REQUIRED in agent output → exit(1); COMPLETE → exit(0).
 * - Loop end (max iterations reached without early exit): before exit(0), set the current task (if any) back to PENDING so the next run can resume it; then log and exit(0). See README "Max iterations and task cleanup".
 */
export const main = async (): Promise<void> => {
  let parsedArgs: RalphArgs;

  try {
    /** Applies shim debug from env + `--debug` / `--verbose` (see {@link parseRalphArgs}). */
    parsedArgs = parseRalphArgs();
  } catch (error) {
    const isError = error instanceof Error;
    const errorMessage = isError ? error.message : String(error);

    showRalphUsage(errorMessage);
    process.exit(1);
  }

  if (parsedArgs.project) {
    const allowed = await getNxProjectNames();
    if (!allowed.includes(parsedArgs.project)) {
      console.error(
        `${WORKFLOW_FATAL_PREFIX}--project must be an NX project name (application or package). Allowed: ${allowed.join(', ')}`,
      );
      process.exit(1);
    }
  }

  const { iterations, plan, prompt, task } = parsedArgs;

  const cortexConfig = getCortexConfigOrExit();
  await ensureCortexReachableOrExit(cortexConfig);

  let effectivePlanId: string = plan ?? '';
  if (task && !plan) {
    const taskRow = await getTaskById(cortexConfig, task);
    if (!taskRow) {
      console.error(`${WORKFLOW_FATAL_PREFIX}Task not found: ${task}`);
      process.exit(1);
    }
    effectivePlanId = taskRow.planId;
  }

  const [planRow, tasksRows] = await Promise.all([
    getPlanById(cortexConfig, effectivePlanId),
    getTasksByPlanId(cortexConfig, effectivePlanId),
  ]);

  if (!planRow) {
    console.error(`${WORKFLOW_FATAL_PREFIX}Plan not found: ${effectivePlanId}`);
    process.exit(1);
  }

  const injectedContext = formatPlanAndTasksForPrompt(planRow, tasksRows);
  const basePrompt =
    `${prompt}\n\n${injectedContext}\n\n` +
    `Plan-Id: ${effectivePlanId}.` +
    (task ? ` Task-Id: ${task}.` : '') +
    ' Use the plan and tasks above (injected from Cortex by Ralph). Do not call get_plan or get_tasks_by_plan_id; the context is provided. When you complete a task output <ralph:complete-task>TASK_UUID</ralph:complete-task>.';

  /** Label for parseRalphResponse exit messages (e.g. "Plan <id> is complete"). */
  const contextLabel = effectivePlanId;

  console.log(ARTWORK_RALPH);
  console.log(
    ` - 📝 Context: ${COLORS.green}Plan-Id: ${effectivePlanId}${task ? ` Task-Id: ${task}` : ''}${COLORS.reset}`,
  );

  console.log(MESSAGE_INTRO);
  showConfiguration(parsedArgs);

  if (planRow.status === 'COMPLETED' || planRow.status === 'SKIPPED') {
    console.log(
      ` - 📋 Plan ${COLORS.green}${effectivePlanId}${COLORS.reset} is already ${planRow.status}; Ralph is exiting without running the agent.`,
    );
    process.exit(0);
  }

  await updatePlanStatus(cortexConfig, effectivePlanId, 'IN_PROGRESS');

  if (task) {
    await updateTaskStatus(cortexConfig, task, 'IN_PROGRESS');
  }

  const maxIterations = task ? 1 : iterations;

  /** Task set to IN_PROGRESS for the last iteration; used to reset to PENDING when exiting due to max iterations with work remaining. */
  let lastIterationTaskId: string | undefined = undefined;

  /** Whether that task was marked COMPLETED (in completeTaskIds) in the last iteration. */
  let lastIterationTaskCompleted = false;

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    ralphDebugLogger.debug('main: iteration start', {
      effectivePlanId,
      iteration,
      maxIterations,
      mode: task ? 'task-centric' : 'plan-centric',
    });

    let agentPrompt = basePrompt;
    /** In plan-centric mode, the task id we set to IN_PROGRESS this iteration (for diagnostic if agent omits signal). */
    let firstPendingForIteration: string | undefined = undefined;

    // Plan-centric: resume IN_PROGRESS task or pick first QUEUED/PENDING; set to IN_PROGRESS only when QUEUED or PENDING; include in prompt so agent outputs complete-task signal.
    if (!task) {
      // eslint-disable-next-line no-await-in-loop
      const planTasks = await getTasksByPlanId(cortexConfig, effectivePlanId);
      const remaining = planTasks.filter((t) =>
        ['PENDING', 'QUEUED', 'IN_PROGRESS', 'BLOCKED'].includes(t.status),
      );

      if (remaining.length === 0) {
        // eslint-disable-next-line no-await-in-loop
        await updatePlanStatus(cortexConfig, effectivePlanId, 'COMPLETED');
        console.log(
          ` - 📋 Plan ${COLORS.green}${effectivePlanId}${COLORS.reset} has no remaining tasks; Ralph is exiting.`,
        );
        console.log(ARTWORK_THANK_YOU);
        process.exit(0);
      }

      const firstInProgress = remaining.find((t) => t.status === 'IN_PROGRESS');
      const taskForIteration =
        firstInProgress ??
        remaining.find((t) => ['QUEUED', 'PENDING'].includes(t.status));

      if (taskForIteration) {
        firstPendingForIteration = taskForIteration.id;
        if (
          taskForIteration.status === 'PENDING' ||
          taskForIteration.status === 'QUEUED'
        ) {
          try {
            // eslint-disable-next-line no-await-in-loop
            await updateTaskStatus(
              cortexConfig,
              taskForIteration.id,
              'IN_PROGRESS',
            );

            const message = ` - 📌 Set task ${COLORS.green}${taskForIteration.id}${COLORS.reset} to IN_PROGRESS for this iteration.`;
            console.log(message);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            const message = `⚠️ Could not set task ${taskForIteration.id} to IN_PROGRESS: ${msg}`;

            console.warn(message);
          }
        } else {
          const message = ` - 📌 Resuming task ${COLORS.green}${taskForIteration.id}${COLORS.reset} (already IN_PROGRESS).`;
          console.log(message);
        }
        agentPrompt = `${basePrompt} Current task for this iteration: ${taskForIteration.id}. When you complete it output <ralph:complete-task>${taskForIteration.id}</ralph:complete-task> so the CLI can mark it completed.`;
      }
    }

    const iterationConfig: RunIterationConfig = {
      agentPrompt,
      iteration,
      model: parsedArgs.model,
    };
    ralphDebugLogger.debug('main: invoking cursor-agent', {
      agentPromptLen: agentPrompt.length,
      iteration,
      nonInteractive: process.stdin.isTTY !== true,
      timeoutMs: parsedArgs.iterationTimeoutMs ?? null,
    });

    // Iterations are intentionally sequential (each depends on previous task updates).
    const result =
      process.stdin.isTTY !== true
        ? // eslint-disable-next-line no-await-in-loop -- iterations must run sequentially
          await runIterationAsync({
            ...iterationConfig,
            timeoutMs: parsedArgs.iterationTimeoutMs,
          })
        : runIteration(iterationConfig);

    ralphDebugLogger.debug(
      'main: cursor-agent finished (buffer ready for parse)',
      {
        iteration,
        resultLen: result.length,
      },
    );

    const completeTaskIds = parseRalphCompleteTaskSignals(result);
    const taskIdLower = (id: string): string => id.toLowerCase();

    // Task-centric fallback: if agent emitted COMPLETE but no signal, mark the task COMPLETED.
    if (
      task &&
      isComplete(result) &&
      !completeTaskIds.some((id) => id === taskIdLower(task))
    ) {
      completeTaskIds.push(taskIdLower(task));
      const message = ` - 📋 No <ralph:complete-task> signal; marking task ${COLORS.green}${task}${COLORS.reset} COMPLETED from <promise>COMPLETE</promise>.`;

      console.log(message);
    }

    // Plan-centric fallback: if agent emitted COMPLETE but no complete-task signal, mark current iteration's task COMPLETED.
    const currentTaskAlreadyMarked =
      firstPendingForIteration &&
      completeTaskIds.some(
        (id) => id === firstPendingForIteration.toLowerCase(),
      );

    if (
      !task &&
      firstPendingForIteration &&
      isComplete(result) &&
      !currentTaskAlreadyMarked
    ) {
      completeTaskIds.push(firstPendingForIteration.toLowerCase());
      const message = ` - 📋 No <ralph:complete-task> signal; marking current task ${COLORS.green}${firstPendingForIteration}${COLORS.reset} COMPLETED from <promise>COMPLETE</promise>.`;

      console.log(message);
    }

    if (completeTaskIds.length > 0) {
      console.log(
        ` - 📋 Marking ${completeTaskIds.length} task(s) completed: ${completeTaskIds.join(', ')}`,
      );
    } else if (!task && firstPendingForIteration) {
      console.warn(
        `⚠️ No <ralph:complete-task> signal in agent output. Task ${firstPendingForIteration} was set to IN_PROGRESS; the agent must output <ralph:complete-task>${firstPendingForIteration}</ralph:complete-task> when done so the CLI can mark it completed.`,
      );
    }

    for (const taskId of completeTaskIds) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const updated = await updateTaskStatus(
          cortexConfig,
          taskId,
          'COMPLETED',
        );

        if (updated) {
          const message = ` - ✅ Marked task ${COLORS.green}${taskId}${COLORS.reset} completed.`;
          console.log(message);
        } else {
          const message = `⚠️ Task ${taskId} not found; could not mark completed.`;
          console.warn(message);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);

        console.warn(`⚠️ Could not set task ${taskId} to COMPLETED: ${msg}`);
      }
    }

    const currentTaskId = task ?? firstPendingForIteration;
    lastIterationTaskId = currentTaskId;
    lastIterationTaskCompleted = currentTaskId
      ? completeTaskIds.some((id) => id === currentTaskId.toLowerCase())
      : false;

    parseRalphResponse(result, iteration, contextLabel);
  }

  if (lastIterationTaskId && !lastIterationTaskCompleted) {
    try {
      await updateTaskStatus(cortexConfig, lastIterationTaskId, 'PENDING');
      console.log(
        ` - 📋 Max iterations reached; task ${COLORS.green}${lastIterationTaskId}${COLORS.reset} was reset to PENDING so a future run can resume it.`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(
        `⚠️ Could not reset task ${lastIterationTaskId} to PENDING: ${msg}`,
      );
    }
  }

  console.log(MESSAGE_COMPLETED);
  process.exit(0);
};

if (require.main === module) {
  main().catch((error) => {
    console.error(`${WORKFLOW_FATAL_PREFIX}Fatal error:`, error);
    process.exit(1);
  });
}
