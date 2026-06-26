#!/usr/bin/env node

/**
 * Ralph: agentic plan/task runner. Single flow (Cortex required); see main() for steps.
 */

import { ARTWORK_RALPH, ARTWORK_THANK_YOU, COLORS } from '../config/index';
import { MESSAGE_COMPLETED, MESSAGE_INTRO } from '../config/messages';
import {
  ensureDatabaseReachableOrExit,
  formatPlanAndTasksForPrompt,
  getCortexConfigOrExit,
  getPlanById,
  getTaskById,
  getTasksByPlanId,
  RALPH_WORKFLOW_FATAL_PREFIX,
  reconcilePlanCompletionIfAllTasksTerminal,
  updatePlanStatus,
  updateTaskStatus,
} from '../utils/openthrottle-ralph';
import { isComplete, showConfiguration, showRalphUsage } from '../utils/index';
import { logWorkflowRalphOtDiagnostics } from '../utils/ot-diagnostics';
import type { RalphArgs } from '../utils/parsers';
import {
  parseRalphArgs,
  parseRalphCompleteTaskSignals,
  parseRalphResponse,
} from '../utils/parsers';
import { getNxProjectNames } from '../utils/projects';
import { ralphDebugLogger } from '../utils/ralph-debug-logger';
import type { RunIterationConfig } from './run-iteration';
import { runIteration, runIterationAsync } from './run-iteration';

export type { CursorAgentChunk, RunIterationConfig } from './run-iteration';

/**
 * @description Main entry point. Single flow:
 *
 * 1. Cortex required (getCortexConfigOrExit → ensureDatabaseReachableOrExit)
 * 2. Resolve plan/task (--plan or from task.planId when --task only)
 * 3. Fetch plan and tasks from Postgres; inject into prompt
 * 4. Set plan and current task to IN_PROGRESS
 * 5. Run agent → parse <ralph:task-complete> and <promise>COMPLETE</promise> → update task statuses
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

  const { iterations, plan, prompt, task } = parsedArgs;

  /**
   * Resolve Cortex from env before any NX project-graph work: `createProjectGraphAsync()` runs with
   * `cwd` (e.g. foreign `workingDirectory`) and may load that repo's `.env`, overwriting `POSTGRES_URL`
   * and causing false "Plan not found" against the wrong database.
   */
  const cortexConfig = getCortexConfigOrExit();
  await ensureDatabaseReachableOrExit(cortexConfig);

  if (parsedArgs.project) {
    const allowed = await getNxProjectNames();
    if (!allowed.includes(parsedArgs.project)) {
      console.error(
        `${RALPH_WORKFLOW_FATAL_PREFIX}--project must be an NX project name (application or package). Allowed: ${allowed.join(', ')}`,
      );
      process.exit(1);
    }
  }

  let effectivePlanId: string = plan ?? '';
  if (task && !plan) {
    const taskRow = await getTaskById(cortexConfig, task);
    if (!taskRow) {
      console.error(`${RALPH_WORKFLOW_FATAL_PREFIX}Task not found: ${task}`);
      process.exit(1);
    }
    effectivePlanId = taskRow.planId;
  }

  logWorkflowRalphOtDiagnostics({
    connectionString: cortexConfig.connectionString,
    planId: effectivePlanId,
  });

  const [planRow, tasksRows] = await Promise.all([
    getPlanById(cortexConfig, effectivePlanId),
    getTasksByPlanId(cortexConfig, effectivePlanId),
  ]);

  if (!planRow) {
    console.error(
      `${RALPH_WORKFLOW_FATAL_PREFIX}Plan not found: ${effectivePlanId}`,
    );
    process.exit(1);
  }

  const injectedContext = formatPlanAndTasksForPrompt(planRow, tasksRows);
  const basePrompt =
    `${prompt}\n\n${injectedContext}\n\n` +
    `Plan-Id: ${effectivePlanId}.` +
    (task ? ` Task-Id: ${task}.` : '') +
    ' Use the plan and tasks above (injected from Cortex by Ralph). Do not call get_plan or get_tasks_by_plan_id; the context is provided. When you complete a task output <ralph:task-complete>TASK_UUID</ralph:task-complete>.';

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

  /**
   * Task-centric mode runs a single task once by default (the single-task rule). The opt-in
   * `--task-iterations <n>` / `WORKFLOW_RALPH_TASK_ITERATIONS` override lets a caller loop the same
   * task up to n times (e.g. iterative refinement) without re-enqueueing. Plan mode uses `--iterations`.
   */
  const maxIterations = task ? (parsedArgs.taskIterations ?? 1) : iterations;

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
          } catch (error) {
            const isError = error instanceof Error;
            const msg = isError ? error.message : String(error);
            const message = `⚠️ Could not set task ${taskForIteration.id} to IN_PROGRESS: ${msg}`;

            console.warn(message);
          }
        } else {
          const message = ` - 📌 Resuming task ${COLORS.green}${taskForIteration.id}${COLORS.reset} (already IN_PROGRESS).`;
          console.log(message);
        }

        agentPrompt = `${basePrompt} Current task for this iteration: ${taskForIteration.id}. When you complete it output <ralph:task-complete>${taskForIteration.id}</ralph:task-complete> so the CLI can mark it completed.`;
      }
    }

    const iterationConfig: RunIterationConfig = {
      agentPrompt,
      backend: parsedArgs.backend,
      iteration,
      model: parsedArgs.model,
      skipWorktreeSetup: parsedArgs.skipWorktreeSetup,
      worktree: parsedArgs.worktree,
      worktreeBase: parsedArgs.worktreeBase,
    };
    ralphDebugLogger.debug('main: invoking iteration runner', {
      agentPromptLen: agentPrompt.length,
      backend: parsedArgs.backend,
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
      'main: iteration runner finished (buffer ready for parse)',
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
      const message = ` - 📋 No <ralph:task-complete> signal; marking task ${COLORS.green}${task}${COLORS.reset} COMPLETED from <promise>COMPLETE</promise>.`;

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
      const message = ` - 📋 No <ralph:task-complete> signal; marking current task ${COLORS.green}${firstPendingForIteration}${COLORS.reset} COMPLETED from <promise>COMPLETE</promise>.`;

      console.log(message);
    }

    if (completeTaskIds.length > 0) {
      console.log(
        ` - 📋 Marking ${completeTaskIds.length} task(s) completed: ${completeTaskIds.join(', ')}`,
      );
    } else if (!task && firstPendingForIteration) {
      console.warn(
        `⚠️ No <ralph:task-complete> signal in agent output. Task ${firstPendingForIteration} was set to IN_PROGRESS; the agent must output <ralph:task-complete>${firstPendingForIteration}</ralph:task-complete> when done so the CLI can mark it completed.`,
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
      } catch (error) {
        const isError = error instanceof Error;
        const msg = isError ? error.message : String(error);

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
    } catch (error) {
      const isError = error instanceof Error;
      const message = isError ? error.message : String(error);

      console.warn(
        `⚠️ Could not reset task ${lastIterationTaskId} to PENDING: ${message}`,
      );
    }
  }

  // Terminal reconcile: on this clean exit path (loop finished / max iterations),
  // re-fetch tasks and, if all are COMPLETED/SKIPPED, flip the plan to COMPLETED so
  // it is never stranded IN_PROGRESS. When the last task was just reset to PENDING
  // above, the set is no longer terminal and this is a no-op. Plan-centric only;
  // task-centric runs do not own the plan lifecycle.
  if (!task) {
    try {
      const reconciled = await reconcilePlanCompletionIfAllTasksTerminal(
        cortexConfig,
        effectivePlanId,
      );
      if (reconciled) {
        console.log(
          ` - 📋 All tasks for plan ${COLORS.green}${effectivePlanId}${COLORS.reset} are terminal; marked the plan COMPLETED.`,
        );
      }
    } catch (error) {
      const isError = error instanceof Error;
      const message = isError ? error.message : String(error);

      console.warn(
        `⚠️ Could not reconcile plan ${effectivePlanId} completion: ${message}`,
      );
    }
  }

  console.log(MESSAGE_COMPLETED);
  process.exit(0);
};

if (require.main === module) {
  main().catch((error) => {
    console.error(`${RALPH_WORKFLOW_FATAL_PREFIX}Fatal error:`, error);
    process.exit(1);
  });
}
