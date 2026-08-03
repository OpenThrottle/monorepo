#!/usr/bin/env node

/**
 * Ralph: agentic plan/task runner. Single flow (OpenThrottle required); see main() for steps.
 */

import { resolveGitBranchFromCwd } from '@openthrottle/openthrottle-agentic-utils';
import { ARTWORK_RALPH, ARTWORK_THANK_YOU, COLORS } from '../config/index';
import { MESSAGE_COMPLETED, MESSAGE_INTRO } from '../config/messages';
import {
  bumpCliPlanRunHeartbeat,
  captureRunLocation,
  ensureDatabaseReachableOrExit,
  formatPlanAndTasksForPrompt,
  getOpenThrottleConfigOrExit,
  getPlanById,
  getTaskById,
  getTasksByPlanId,
  HEARTBEAT_INTERVAL_MS,
  RALPH_WORKFLOW_FATAL_PREFIX,
  readPlanRunCancelMarker,
  reconcilePlanCompletionIfAllTasksTerminal,
  registerCliPlanRun,
  settleCliPlanRun,
  updatePlanStatus,
  updateTaskStatus,
} from '../utils/openthrottle-ralph';
import { isComplete, showConfiguration, showRalphUsage } from '../utils/index';
import { logWorkflowRalphOtDiagnostics } from '../utils/ot-diagnostics';
import type { RalphArgs } from '../utils/parsers';
import {
  getRalphOutputMarkerFlags,
  parseRalphArgs,
  parseRalphCompleteTaskSignals,
  parseRalphResponse,
} from '../utils/parsers';
import { getNxProjectNames } from '../utils/projects';
import { ralphDebugLogger } from '../utils/ralph-debug-logger';
import type { RunIterationConfig } from './run-iteration';
import { runIteration, runIterationAsync } from './run-iteration';

export type { CursorAgentChunk, RunIterationConfig } from './run-iteration';

/** Poll interval for the detached-CLI durable cancel marker (covers during- and between-iteration). */
const CLI_CANCEL_POLL_INTERVAL_MS = 3000;

/**
 * Outer safety net: main() sets this to its run-settle closure after registering a
 * detached CLI run, so the top-level catch can settle the run FAILED on an otherwise
 * uncaught error before exiting. Null when no run is tracked (TTY / register failed).
 */
let settleActiveCliRunOnFatal: ((status: string) => Promise<void>) | null =
  null;

/**
 * @description Main entry point. Single flow:
 *
 * 1. OpenThrottle required (getOpenThrottleConfigOrExit → ensureDatabaseReachableOrExit)
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
   * Resolve OpenThrottle from env before any NX project-graph work: `createProjectGraphAsync()` runs with
   * `cwd` (e.g. foreign `workingDirectory`) and may load that repo's `.env`, overwriting `POSTGRES_URL`
   * and causing false "Plan not found" against the wrong database.
   */
  const openthrottleConfig = getOpenThrottleConfigOrExit();
  await ensureDatabaseReachableOrExit(openthrottleConfig);

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
    const taskRow = await getTaskById(openthrottleConfig, task);
    if (!taskRow) {
      console.error(`${RALPH_WORKFLOW_FATAL_PREFIX}Task not found: ${task}`);
      process.exit(1);
    }
    effectivePlanId = taskRow.planId;
  }

  logWorkflowRalphOtDiagnostics({
    connectionString: openthrottleConfig.connectionString,
    planId: effectivePlanId,
  });

  const [planRow, tasksRows] = await Promise.all([
    getPlanById(openthrottleConfig, effectivePlanId),
    getTasksByPlanId(openthrottleConfig, effectivePlanId),
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
    ' Use the plan and tasks above (injected from OpenThrottle by Ralph). Do not call get_plan or get_tasks_by_plan_id; the context is provided. When you complete a task output <ralph:task-complete>TASK_UUID</ralph:task-complete>.';

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

  await updatePlanStatus(openthrottleConfig, effectivePlanId, 'IN_PROGRESS');

  if (task) {
    await updateTaskStatus(openthrottleConfig, task, 'IN_PROGRESS');
  }

  // ── Detached-CLI cancelable run wiring ────────────────────────────────────
  // A non-TTY (detached) run registers a first-class plan_runs row so the UI Kill
  // has a row to stamp the durable cancel marker on, then polls that marker and
  // aborts the in-flight agent child when it is set. A TTY run stays UNTRACKED by
  // design (a human at the terminal can Ctrl-C; the UI honestly reports NO_ACTIVE_RUN).
  const isDetached = process.stdin.isTTY !== true;
  let planRunId: string | null = null;
  const abortController = new AbortController();
  let killRequested = false;
  let runSettled = false;
  let markerPollTimer: ReturnType<typeof setInterval> | undefined;
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;

  const stopMarkerPolling = (): void => {
    if (markerPollTimer) {
      clearInterval(markerPollTimer);
      markerPollTimer = undefined;
    }
  };

  const stopHeartbeat = (): void => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = undefined;
    }
  };

  /** Settle the run row exactly once (no-op when the run was never tracked). */
  const settleCliRunSafely = async (status: string): Promise<void> => {
    if (!planRunId || runSettled) {
      return;
    }
    runSettled = true;
    stopMarkerPolling();
    stopHeartbeat();
    try {
      await settleCliPlanRun(openthrottleConfig, planRunId, status);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(
        `⚠️ Could not settle CLI run ${planRunId} (${status}): ${msg}`,
      );
    }
  };
  settleActiveCliRunOnFatal = settleCliRunSafely;

  if (isDetached) {
    try {
      const branch = resolveGitBranchFromCwd();
      planRunId = await registerCliPlanRun(openthrottleConfig, {
        ...(branch != null ? { branch } : {}),
        executionBackend: parsedArgs.backend,
        location: captureRunLocation(),
        planId: effectivePlanId,
      });
      console.log(
        ` - 🏃 Registered detached CLI run ${COLORS.green}${planRunId}${COLORS.reset} (cancelable from the UI).`,
      );
    } catch (error) {
      // Graceful degrade: run un-tracked (today's NO_ACTIVE_RUN behavior). Never abort real work.
      planRunId = null;
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(
        `⚠️ Could not register a cancelable CLI run for plan ${effectivePlanId}; continuing UN-TRACKED (UI Kill will report NO_ACTIVE_RUN). ${msg}`,
      );
    }
  }

  /** Finalize a UI Kill: settle CANCELLED, reset the in-flight task + plan to PENDING, exit. */
  const finishKilledRun = async (
    inFlightTaskId: string | undefined,
  ): Promise<void> => {
    console.log(
      ` - 🛑 UI Kill received; stopping detached CLI run ${planRunId ?? ''}.`,
    );
    await settleCliRunSafely('CANCELLED');

    // The server's cancelRun returns CANCELLATION_REQUESTED for a detached run and
    // deliberately does NOT reset the plan, so the CLI resets task + plan to PENDING
    // itself — else the plan is stranded IN_PROGRESS (plan-completion-no-downward-reconcile).
    if (inFlightTaskId) {
      try {
        await updateTaskStatus(openthrottleConfig, inFlightTaskId, 'PENDING');
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.warn(
          `⚠️ Could not reset task ${inFlightTaskId} to PENDING: ${msg}`,
        );
      }
    }
    try {
      await updatePlanStatus(openthrottleConfig, effectivePlanId, 'PENDING');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(
        `⚠️ Could not reset plan ${effectivePlanId} to PENDING: ${msg}`,
      );
    }
    console.log(ARTWORK_THANK_YOU);
    process.exit(0);
  };

  if (isDetached && planRunId) {
    const myRunId = planRunId;

    // Liveness heartbeat: bump last_heartbeat_at every ~15s on a dedicated wall-clock
    // timer (independent of iteration progress). This is what covers the HARD-crash gap
    // (SIGKILL / laptop sleep / power-loss) that the graceful signal handlers below cannot:
    // when the process dies without settling, the heartbeat simply stops advancing and the
    // server's passive reader (isStale) + staleness sweeper treat the stranded IN_PROGRESS
    // row as dead. Best-effort — a failed bump warns and retries next tick, never aborts work.
    // Initial liveness is already stamped by registerCliRun, so there is no false-stale gap.
    heartbeatTimer = setInterval(() => {
      void bumpCliPlanRunHeartbeat(openthrottleConfig, myRunId).catch(
        (error: unknown) => {
          const msg = error instanceof Error ? error.message : String(error);
          console.warn(
            `⚠️ Heartbeat bump failed for CLI run ${myRunId}: ${msg}`,
          );
        },
      );
    }, HEARTBEAT_INTERVAL_MS);
    heartbeatTimer.unref?.();

    // Best-effort settle on GRACEFUL termination signals (SIGINT/SIGTERM/beforeExit). A
    // HARD crash that skips these handlers is covered by the heartbeat above.
    const settleOnSignal = (signalName: string, code: number): void => {
      console.warn(
        ` - 🛑 ${signalName} received; settling CLI run ${myRunId} (CANCELLED) best-effort.`,
      );
      void settleCliRunSafely('CANCELLED').finally(() => process.exit(code));
    };
    process.once('SIGINT', () => settleOnSignal('SIGINT', 130));
    process.once('SIGTERM', () => settleOnSignal('SIGTERM', 143));
    process.once('beforeExit', () => {
      void settleCliRunSafely('CANCELLED');
    });

    // Single long-lived poll (during- and between-iteration). Aborts the active agent
    // child (run-iteration wires signal → escalateKill) and flags the loop to stop when
    // the marker is set OR another run superseded mine (newest run id !== my run id).
    markerPollTimer = setInterval(() => {
      void (async () => {
        try {
          const marker = await readPlanRunCancelMarker(
            openthrottleConfig,
            effectivePlanId,
          );
          if (!marker) {
            return;
          }
          const superseded = marker.planRunId !== myRunId;
          if (marker.cancelRequestedAt !== null || superseded) {
            killRequested = true;
            stopMarkerPolling();
            abortController.abort();
          }
        } catch {
          // Transient poll failure: retry next tick.
        }
      })();
    }, CLI_CANCEL_POLL_INTERVAL_MS);
    markerPollTimer.unref?.();
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

    // Kill arrived while idle between iterations: stop before starting a new agent.
    // Reset the previous iteration's task only if it was left in-flight (not completed).
    if (killRequested) {
      // eslint-disable-next-line no-await-in-loop
      await finishKilledRun(
        lastIterationTaskCompleted ? undefined : lastIterationTaskId,
      );
    }

    let agentPrompt = basePrompt;
    /** In plan-centric mode, the task id we set to IN_PROGRESS this iteration (for diagnostic if agent omits signal). */
    let firstPendingForIteration: string | undefined = undefined;

    // Plan-centric: resume IN_PROGRESS task or pick first QUEUED/PENDING; set to IN_PROGRESS only when QUEUED or PENDING; include in prompt so agent outputs complete-task signal.
    if (!task) {
      // eslint-disable-next-line no-await-in-loop
      const planTasks = await getTasksByPlanId(
        openthrottleConfig,
        effectivePlanId,
      );
      const remaining = planTasks.filter((t) =>
        ['PENDING', 'QUEUED', 'IN_PROGRESS', 'BLOCKED'].includes(t.status),
      );

      if (remaining.length === 0) {
        // eslint-disable-next-line no-await-in-loop
        await updatePlanStatus(
          openthrottleConfig,
          effectivePlanId,
          'COMPLETED',
        );
        // eslint-disable-next-line no-await-in-loop
        await settleCliRunSafely('COMPLETED');
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
              openthrottleConfig,
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
    // The detached path passes the AbortController signal so the marker poll can kill
    // the in-flight agent child mid-iteration (run-iteration wires signal → escalateKill).
    let result: string;
    try {
      result = isDetached
        ? // eslint-disable-next-line no-await-in-loop -- iterations must run sequentially
          await runIterationAsync({
            ...iterationConfig,
            signal: abortController.signal,
            timeoutMs: parsedArgs.iterationTimeoutMs,
          })
        : runIteration(iterationConfig);
    } catch (error) {
      // Iteration threw (not an abort): settle the tracked run FAILED, then rethrow.
      // eslint-disable-next-line no-await-in-loop
      await settleCliRunSafely('FAILED');
      throw error;
    }

    // The poll fired mid-iteration (marker set or superseded): abort the loop before
    // marking any task complete, reset task + plan to PENDING, settle CANCELLED, exit.
    if (killRequested) {
      // eslint-disable-next-line no-await-in-loop
      await finishKilledRun(task ?? firstPendingForIteration);
    }

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
          openthrottleConfig,
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

    // parseRalphResponse may process.exit synchronously on a terminal marker; settle the
    // tracked run row first so a detached CLI run is never left IN_PROGRESS on those exits.
    const terminalFlags = getRalphOutputMarkerFlags(result);
    if (terminalFlags.hasPromiseComplete) {
      // eslint-disable-next-line no-await-in-loop
      await settleCliRunSafely('COMPLETED');
    } else if (
      terminalFlags.hasPromiseError ||
      terminalFlags.hasPromiseInputRequired
    ) {
      // eslint-disable-next-line no-await-in-loop
      await settleCliRunSafely('FAILED');
    }

    parseRalphResponse(result, iteration, contextLabel);
  }

  if (lastIterationTaskId && !lastIterationTaskCompleted) {
    try {
      await updateTaskStatus(
        openthrottleConfig,
        lastIterationTaskId,
        'PENDING',
      );
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
        openthrottleConfig,
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

  await settleCliRunSafely('COMPLETED');
  console.log(MESSAGE_COMPLETED);
  process.exit(0);
};

if (require.main === module) {
  main().catch(async (error) => {
    // Settle a tracked detached run FAILED before exiting on an otherwise uncaught error.
    if (settleActiveCliRunOnFatal) {
      await settleActiveCliRunOnFatal('FAILED');
    }
    console.error(`${RALPH_WORKFLOW_FATAL_PREFIX}Fatal error:`, error);
    process.exit(1);
  });
}
