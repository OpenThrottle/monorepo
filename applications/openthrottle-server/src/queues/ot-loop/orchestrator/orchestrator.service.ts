import { Inject, Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { PlanRunsService } from '@openthrottle/nestjs-repositories';
import type {
  CommandSequenceResult,
  LoopClient,
  LoopDeps,
  LoopOutcome,
  LoopTask,
  ModelRoutingPolicy,
} from '@openthrottle/openthrottle-agentic-loop';
import {
  createCommandValidator,
  createCommitlintLinter,
  createLoopGit,
  createModelRouter,
  DEFAULT_COMMAND_TIMEOUT_MS,
  finalizeOtLoopRun,
  firstErrorLine,
  labelForCommand,
  LOOP_OUTPUT_KIND,
  LOOP_PLAN_STATUS,
  LOOP_TASK_STATUS,
  nodeResolverFs,
  prepareResultDir,
  readModelRoutingPolicyFromRoot,
  resolveOtLoopCommands,
  runCommandSequence,
  runOtLoop,
  spawnShellCommand,
  systemScheduleClock,
} from '@openthrottle/openthrottle-agentic-loop';
import type {
  WorkflowFailedReason,
  WorkflowRunResult,
} from '@openthrottle/openthrottle-agentic-ralph';
import {
  createDefaultWorkflowRalphCommandRunner,
  CreateTaskDocument,
  preparePlanRunPrDraftDir,
} from '@openthrottle/openthrottle-agentic-ralph';
import {
  discoverAgentClis,
  getOpenThrottleRoot,
} from '@openthrottle/openthrottle-agentic-utils';
import type {
  DriverId,
  DriverReasoningEffort,
  UsageLimit,
} from '@openthrottle/openthrottle-drivers';
import {
  DRIVER_REASONING_EFFORTS,
  getDriver,
  parseDriverId,
  runDriverAsync,
} from '@openthrottle/openthrottle-drivers';
import { mergePlanRunTuningWithWorkflowRalphConfig } from '@tools/workflows';

import { PlanRunWorkspaceService } from '../../../services/plan-run-workspace/plan-run-workspace.service.ts';
import {
  OT_LOOP_DEFAULT_BASE_BRANCH,
  OT_LOOP_EXECUTE_GRAPHQL,
  OT_LOOP_FINAL_VALIDATION_TASK_CATEGORY,
  OT_LOOP_FINAL_VALIDATION_TASK_TITLE,
  OT_LOOP_NARRATION_PREFIX,
} from '../ot-loop.constants.ts';
import type {
  OtLoopExecuteGraphql,
  PlanOutputWriter,
} from '../ot-loop.types.ts';
import {
  buildFinalValidationDescription,
  buildSessionOptions,
  buildWorkerEnv,
  formatNarration,
  toTimeoutMs,
} from '../ot-loop.utils.ts';
import { createOtLoopClient } from '../ot-loop-client.factory.ts';
import { createOtLoopWorkerRunner } from '../ot-loop-worker-runner.factory.ts';
import { createPlanOutputWriter } from '../plan-output-writer.factory.ts';
import type { RunOtLoopJobParams } from './orchestrator.types.ts';

const DRIVER_REASONING_EFFORT_VALUES: readonly DriverReasoningEffort[] =
  Object.values(DRIVER_REASONING_EFFORTS);

const toModel = (value: string | null | undefined): string | undefined => {
  return value === undefined || value === null || value.trim() === ''
    ? undefined
    : value.trim();
};

const toEffort = (
  value: string | null | undefined,
): DriverReasoningEffort | undefined => {
  return DRIVER_REASONING_EFFORT_VALUES.find((level) => level === value);
};

const failed = (reason: WorkflowFailedReason): WorkflowRunResult => {
  return { exitCode: 1, reason, status: 'failed' };
};

const cancelled: WorkflowRunResult = {
  exitCode: 0,
  reason: 'workflow_cancelled',
  status: 'finished',
};

const compareByOrder = (a: LoopTask, b: LoopTask): number => {
  if (a.sortOrder !== b.sortOrder) {
    return a.sortOrder - b.sortOrder;
  }

  return a.createdAt.localeCompare(b.createdAt);
};

/**
 * @description The OT Loop runner (docs/workflows/ot-loop-job.md): the BullMQ job is the ot-loop
 * parent and the agent CLI is the step-2 worker. This service builds the loop package's
 * dependencies over the server's worker-scoped GraphQL executor, the shared
 * {@link PlanRunWorkspaceService} (worktree, checkout registration, config; no MCP preflight or skill
 * injection), `runDriverAsync` and the shell, runs the pure state machine, then closes: it writes the
 * final plan status itself, runs the whole-plan validation, and hands push and the draft PR to
 * `finalizeOtLoopRun`. It returns the same `WorkflowRunResult` Ralph does, so `PlansProcessor` settles
 * every exit through its existing branches. A failure at start (no commands, red setup) is a
 * `failed` result; the processor restores the plan's pre-run status.
 */
@Injectable()
export class OtLoopOrchestratorService {
  constructor(
    @Inject(OT_LOOP_EXECUTE_GRAPHQL)
    private readonly executeGraphqlV2: OtLoopExecuteGraphql,
    private readonly logger: LoggerService,
    private readonly planRunsService: PlanRunsService,
    private readonly planRunWorkspaceService: PlanRunWorkspaceService,
  ) {}

  /**
   * @description Runs one OT Loop job. Workspace preparation errors propagate (BullMQ retries, as
   * for Ralph); every later failure becomes a `failed` result.
   */
  async runPlanOrchestratorJob(
    params: RunOtLoopJobParams,
  ): Promise<WorkflowRunResult> {
    const { correlation, jobData, onWorktreeProvisioned, workSessionId } =
      params;
    const { planId } = jobData;
    const signal = params.signal ?? new AbortController().signal;

    const workspace = await this.planRunWorkspaceService.prepare({
      correlation,
      jobData,
      onWorktreeProvisioned,
      skipMcpPreflight: true,
      skipSkillInjection: true,
    });
    const cwd = workspace.workingDirectory;
    const output = createPlanOutputWriter({
      executeGraphqlV2: this.executeGraphqlV2,
      planId,
    });
    const say = (message: string): void => {
      output.write({
        attempt: undefined,
        kind: LOOP_OUTPUT_KIND.LOOP,
        taskId: undefined,
        text: formatNarration(OT_LOOP_NARRATION_PREFIX, message),
      });
    };

    try {
      return await this.execute({
        cwd,
        output,
        params,
        run: workspace.run,
        say,
        signal,
        tuning: mergePlanRunTuningWithWorkflowRalphConfig(
          jobData.ralph,
          workspace.config,
        ),
        workSessionId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      this.logger.warn(
        `OT Loop run for plan ${planId} failed: ${message}`,
        OtLoopOrchestratorService.name,
      );
      say(`run failed: ${message}`);
      await output.settled();

      return failed('workflow_unhandled');
    }
  }

  private async execute(input: {
    readonly cwd: string;
    readonly output: PlanOutputWriter;
    readonly params: RunOtLoopJobParams;
    readonly run: { readonly id: string } | null;
    readonly say: (message: string) => void;
    readonly signal: AbortSignal;
    readonly tuning: ReturnType<
      typeof mergePlanRunTuningWithWorkflowRalphConfig
    >;
    readonly workSessionId: string | null | undefined;
  }): Promise<WorkflowRunResult> {
    const { cwd, output, params, run, say, signal, tuning } = input;
    const { correlation, jobData } = params;
    const { planId } = jobData;
    const runCommand = createDefaultWorkflowRalphCommandRunner();

    // The worktree is authoritative: the same file the enqueue check read from the base checkout.
    const commands = await resolveOtLoopCommands({
      fs: nodeResolverFs,
      otLoop: { validationCommands: jobData.otLoop?.validationCommands },
      worktreeRoot: cwd,
    });

    if (commands.kind !== 'resolved') {
      say(commands.message);
      await output.settled();

      return failed('workflow_input_required');
    }

    const setup = this.pick(jobData.otLoop?.setupCommands, commands.setup);
    const finalValidation = this.pick(
      jobData.otLoop?.finalValidationCommands,
      commands.finalValidation,
    );
    const backend = parseDriverId(
      tuning.backend ?? jobData.executionBackend ?? 'cursor',
    );
    const runModel = toModel(tuning.model);
    const client = createOtLoopClient({
      executeGraphqlV2: this.executeGraphqlV2,
      externalRef: correlation?.queueJobId,
      output,
      planId,
      planRunId: run?.id,
      workSessionId: input.workSessionId,
    });

    say(
      `starting: backend=${backend}, validation from ${commands.source}; per-iteration lifecycle events are not emitted by this runner (known gap)`,
    );
    await prepareResultDir(cwd);

    const setupResult = await this.runCommands({
      commands: setup,
      cwd,
      output,
      signal,
    });

    if (setupResult.kind === 'aborted') {
      return cancelled;
    }

    if (setupResult.kind === 'red') {
      say(
        `setup failed: ${setupResult.command} exited ${setupResult.exitCode}\n${setupResult.tail}`,
      );
      await output.settled();

      return failed('workflow_unhandled');
    }

    const usage: { current: UsageLimit | undefined } = { current: undefined };
    const deps = await this.buildDeps({
      backend,
      client,
      commands: commands.validation,
      cwd,
      effort: toEffort(tuning.effort),
      output,
      planId,
      runCommand,
      runModel,
      say,
      signal,
      timeoutMs: toTimeoutMs(tuning.iterationTimeoutSeconds),
      usage,
    });
    const onlyTaskId = jobData.mode === 'task' ? jobData.taskId : undefined;
    const outcome = await runOtLoop({
      deps,
      maxRetries: jobData.otLoop?.maxRetries,
      planId,
      taskId: onlyTaskId,
    });

    await output.settled();

    return this.close({
      baseBranch: tuning.worktreeBase?.trim() || OT_LOOP_DEFAULT_BASE_BRANCH,
      client,
      cwd,
      finalValidation,
      onlyTaskId,
      outcome,
      output,
      planId,
      runCommand,
      say,
      signal,
      usage: usage.current,
      workSessionId: input.workSessionId,
    });
  }

  /** A plan override wins over the repo file's list when it names any command. */
  private pick(
    override: readonly string[] | undefined,
    fromFile: readonly string[],
  ): readonly string[] {
    return override !== undefined && override.length > 0 ? override : fromFile;
  }

  private async runCommands(input: {
    readonly commands: readonly string[];
    readonly cwd: string;
    readonly output: PlanOutputWriter;
    readonly signal: AbortSignal;
  }): Promise<CommandSequenceResult> {
    if (input.commands.length === 0) {
      return { kind: 'green' };
    }

    return runCommandSequence({
      clock: systemScheduleClock,
      commands: input.commands,
      cwd: input.cwd,
      onOutput: ({ text }) => {
        input.output.write({
          attempt: undefined,
          kind: LOOP_OUTPUT_KIND.VALIDATION,
          taskId: undefined,
          text,
        });
      },
      signal: input.signal,
      spawn: spawnShellCommand,
      timeoutMs: DEFAULT_COMMAND_TIMEOUT_MS,
    });
  }

  private async buildDeps(input: {
    readonly backend: DriverId;
    readonly client: LoopClient;
    readonly commands: readonly string[];
    readonly cwd: string;
    readonly effort: DriverReasoningEffort | undefined;
    readonly output: PlanOutputWriter;
    readonly planId: string;
    readonly runCommand: ReturnType<
      typeof createDefaultWorkflowRalphCommandRunner
    >;
    readonly runModel: string | undefined;
    readonly say: (message: string) => void;
    readonly signal: AbortSignal;
    readonly timeoutMs: number | undefined;
    readonly usage: { current: UsageLimit | undefined };
  }): Promise<LoopDeps> {
    const { cwd, output, planId, runCommand, signal } = input;
    const modelFor = await this.buildModelRouter(input);

    return {
      cancel: {
        isCancelled: async () => {
          if (signal.aborted) {
            return true;
          }

          try {
            return (
              (await this.planRunsService.readCancelRequested(planId)) !== null
            );
          } catch {
            // A transient read failure is "not cancelled" (as in Ralph's marker poll).
            return false;
          }
        },
        signal,
      },
      client: input.client,
      clock: { now: () => Date.now() },
      git: createLoopGit({
        cwd,
        lint: createCommitlintLinter({ cwd, runCommand }),
        runCommand,
      }),
      modelFor,
      validator: createCommandValidator({
        clock: systemScheduleClock,
        commands: input.commands,
        cwd,
        onChunk: (chunk) => {
          output.write({
            attempt: chunk.attempt,
            kind: LOOP_OUTPUT_KIND.VALIDATION,
            taskId: chunk.taskId,
            text: chunk.text,
          });
        },
        spawn: spawnShellCommand,
        timeoutMs: DEFAULT_COMMAND_TIMEOUT_MS,
      }),
      worker: createOtLoopWorkerRunner({
        cwd,
        driver: getDriver(input.backend),
        effort: input.effort,
        env: buildWorkerEnv(),
        onUsageLimit: (usageLimit) => {
          input.usage.current = usageLimit;
        },
        output,
        runDriver: runDriverAsync,
        timeoutMs: input.timeoutMs,
      }),
    };
  }

  /**
   * @description Per-task model routing (§ 8). The policy is read from the OpenThrottle root, never
   * the worktree: a foreign repo has no `skills/` directory. An unreadable policy or a missing
   * root falls back to the run's own model, said in plan output.
   */
  private async buildModelRouter(input: {
    readonly backend: string;
    readonly runModel: string | undefined;
    readonly say: (message: string) => void;
  }): Promise<LoopDeps['modelFor']> {
    const { backend, runModel, say } = input;
    const root = getOpenThrottleRoot(process.env);
    const policy: ModelRoutingPolicy | undefined =
      root === undefined ? undefined : await this.readPolicy(root, say);

    if (policy === undefined) {
      return () => runModel;
    }

    const router = await createModelRouter({
      discoverModels: async () => {
        const discovery = await discoverAgentClis();

        return (
          discovery.agents.find((agent) => agent.backend === backend)?.models ??
          []
        );
      },
      policy,
      runModel,
    });

    return router.modelFor;
  }

  private async readPolicy(
    root: string,
    say: (message: string) => void,
  ): Promise<ModelRoutingPolicy | undefined> {
    const result = await readModelRoutingPolicyFromRoot(root);

    if (result.kind === 'invalid') {
      say(`model routing disabled, using the run model: ${result.reason}`);

      return undefined;
    }

    return result.policy;
  }

  /**
   * @description Maps the loop's outcome to a `WorkflowRunResult` (docs § 1): cancelled and
   * usage-limited pass through, a failed loop is `failed`, and complete or tasks-blocked first runs
   * the whole-plan validation, writes the plan's final status, then finalizes (push + draft PR).
   */
  private async close(input: {
    readonly baseBranch: string;
    readonly client: LoopClient;
    readonly cwd: string;
    readonly finalValidation: readonly string[];
    readonly onlyTaskId: string | undefined;
    readonly outcome: LoopOutcome;
    readonly output: PlanOutputWriter;
    readonly planId: string;
    readonly runCommand: ReturnType<
      typeof createDefaultWorkflowRalphCommandRunner
    >;
    readonly say: (message: string) => void;
    readonly signal: AbortSignal;
    readonly usage: UsageLimit | undefined;
    readonly workSessionId: string | null | undefined;
  }): Promise<WorkflowRunResult> {
    const { outcome, planId, say } = input;

    if (outcome.kind === 'cancelled') {
      return cancelled;
    }

    if (outcome.kind === 'usage_limited') {
      return {
        exitCode: 0,
        reason: 'workflow_usage_limited',
        status: 'finished',
        usageLimit: input.usage ?? { rateLimitType: null, resetsAt: null },
      };
    }

    if (outcome.kind === 'failed') {
      say(`loop failed: ${outcome.reason}`);
      await input.output.settled();

      return failed('workflow_unhandled');
    }

    const closing = await this.runFinalValidation(input, outcome);

    if (closing === 'aborted') {
      return cancelled;
    }

    const blocked = closing.kind === 'tasks_blocked';

    // Task-centric runs settle the plan through the processor's backstop: one task says nothing
    // about whether the plan is finished.
    if (input.onlyTaskId === undefined) {
      await this.writePlanStatus(input, blocked);
    }

    const tasks = await input.client.listTasks(planId);
    const taskIds = tasks
      .filter(
        (task) =>
          task.status === LOOP_TASK_STATUS.COMPLETED &&
          (input.onlyTaskId === undefined || task.id === input.onlyTaskId),
      )
      .sort(compareByOrder)
      .map((task) => task.id);
    const draftDir = await preparePlanRunPrDraftDir({
      cwd: input.cwd,
      runCommand: input.runCommand,
    });
    const finalized = await finalizeOtLoopRun({
      baseBranch: input.baseBranch,
      cwd: input.cwd,
      draftDir,
      executeGraphqlV2: this.executeGraphqlV2,
      onChunk: (chunk) => {
        input.output.write({
          attempt: undefined,
          kind: LOOP_OUTPUT_KIND.LOOP,
          taskId: undefined,
          text: chunk.data,
        });
      },
      outcome: blocked ? 'tasks_blocked' : 'complete',
      planId,
      runCommand: input.runCommand,
      squashSubject: undefined,
      taskIds,
    });

    await input.output.settled();

    return finalized;
  }

  /**
   * @description A complete plan runs the final validation (§ 6). Red creates a BLOCKED task carrying
   * the tail, so the three-way close ends the plan BLOCKED and the PR stays a draft.
   */
  private async runFinalValidation(
    input: {
      readonly cwd: string;
      readonly finalValidation: readonly string[];
      readonly output: PlanOutputWriter;
      readonly planId: string;
      readonly say: (message: string) => void;
      readonly signal: AbortSignal;
      readonly workSessionId: string | null | undefined;
    },
    outcome: Extract<LoopOutcome, { kind: 'complete' | 'tasks_blocked' }>,
  ): Promise<
    'aborted' | Extract<LoopOutcome, { kind: 'complete' | 'tasks_blocked' }>
  > {
    if (outcome.kind !== 'complete' || input.finalValidation.length === 0) {
      return outcome;
    }

    input.say(`final validation: ${input.finalValidation.length} command(s)`);

    const result = await this.runCommands({
      commands: input.finalValidation,
      cwd: input.cwd,
      output: input.output,
      signal: input.signal,
    });

    if (result.kind === 'aborted') {
      return 'aborted';
    }

    if (result.kind === 'green') {
      return outcome;
    }

    const created = await this.executeGraphqlV2(
      CreateTaskDocument,
      {
        input: {
          category: OT_LOOP_FINAL_VALIDATION_TASK_CATEGORY,
          description: buildFinalValidationDescription(result),
          planId: input.planId,
          status: LOOP_TASK_STATUS.BLOCKED,
          title: OT_LOOP_FINAL_VALIDATION_TASK_TITLE,
        },
      },
      buildSessionOptions(input.workSessionId),
    );

    input.say(
      `final validation failed: ${labelForCommand(result.command)} exited ${result.exitCode}: ${firstErrorLine(result.tail)}; the plan will end BLOCKED`,
    );

    return { blockedTaskIds: [created.createTask.id], kind: 'tasks_blocked' };
  }

  /**
   * @description Writes the plan's final status through the same path Ralph uses (`updatePlan` over
   * the worker GraphQL): BLOCKED when any task is, else COMPLETED. Best effort: the processor's
   * `settlePlanLeftOpenByRun` is the backstop, so a rejected write is reported, not fatal.
   */
  private async writePlanStatus(
    input: {
      readonly client: LoopClient;
      readonly output: PlanOutputWriter;
      readonly planId: string;
      readonly say: (message: string) => void;
    },
    blocked: boolean,
  ): Promise<void> {
    const status = blocked
      ? LOOP_PLAN_STATUS.BLOCKED
      : LOOP_PLAN_STATUS.COMPLETED;

    try {
      await input.client.updatePlanStatus({ planId: input.planId, status });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      input.say(`could not set the plan ${status}: ${message}`);
    }
  }
}
