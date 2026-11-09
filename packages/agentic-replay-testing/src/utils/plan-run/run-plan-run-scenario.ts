/**
 * Run one plan-run scenario through the REAL Ralph orchestrator with the
 * in-memory store and the drivers-engine iteration runner. The recorder and
 * every replay call this with identical inputs; only what `claude` resolves to
 * on PATH differs (the recording shim, or the replay bin).
 */

import { execFileSync } from 'node:child_process';

import {
  createWorkflowRalphOrchestrator,
  type WorkflowRalphIterationStreamChunk,
} from '@openthrottle/openthrottle-agentic-ralph';
import { WORKFLOW_RALPH_OT_ROOT_ENV } from '@openthrottle/openthrottle-agentic-utils';
import type { DriverId } from '@openthrottle/openthrottle-drivers';

import type { PlanRunScenario } from '../../types/plan-run-scenario.ts';
import { createDriversIterationRunner } from './drivers-iteration-runner.ts';
import {
  createPlanRunStore,
  PLAN_RUN_PLAN_ID,
  type PlanRunStore,
} from './plan-run-store.ts';

/** @public */
export interface RunPlanRunScenarioOptions {
  /**
   * Agent cwd (the plan's foreign working directory). An empty directory;
   * it is initialized as a git repository before the run.
   */
  readonly cwd: string;
  /** Model passed to the driver; `auto` leaves it to the CLI. */
  readonly model: string;
  readonly runner: DriverId;
  readonly scenario: PlanRunScenario;
}

/** @public */
export interface RunPlanRunScenarioResult {
  /** Everything the iteration runner streamed, as the host's onChunk saw it. */
  readonly chunks: readonly WorkflowRalphIterationStreamChunk[];
  /** The orchestrator's own outcome. */
  readonly outcome: Awaited<
    ReturnType<ReturnType<typeof createWorkflowRalphOrchestrator>['execute']>
  >;
  readonly store: PlanRunStore;
}

/**
 * Execute the scenario's plan to the end of its iteration budget.
 *
 * @public
 */
export async function runPlanRunScenario(
  options: RunPlanRunScenarioOptions,
): Promise<RunPlanRunScenarioResult> {
  // Real plan runs work in a git checkout, and some CLIs refuse to run outside
  // one (codex: "Not inside a trusted directory"). Initialize it here so the
  // recorder and every replay see the same kind of directory.
  execFileSync('git', ['init', '--quiet'], { cwd: options.cwd });
  // The prompt names the OpenThrottle root, recorded as `<OT_ROOT>` from this
  // checkout. A session launched by a plan run inherits WORKFLOW_RALPH_OT_ROOT
  // pointing at another checkout, which changes the prompt and fails every
  // replay — so resolve the root from this module, as the recorder did.
  const inheritedOtRoot = process.env[WORKFLOW_RALPH_OT_ROOT_ENV];
  delete process.env[WORKFLOW_RALPH_OT_ROOT_ENV];
  try {
    return await executeScenario(options);
  } finally {
    if (inheritedOtRoot !== undefined) {
      process.env[WORKFLOW_RALPH_OT_ROOT_ENV] = inheritedOtRoot;
    }
  }
}

async function executeScenario(
  options: RunPlanRunScenarioOptions,
): Promise<RunPlanRunScenarioResult> {
  const store = createPlanRunStore(options.scenario);
  const chunks: WorkflowRalphIterationStreamChunk[] = [];
  const orchestrator = createWorkflowRalphOrchestrator({
    executeGraphqlV2: store.executeGraphqlV2,
    iterationRunner: createDriversIterationRunner(),
    onChunk: (chunk) => {
      chunks.push(chunk);
    },
  });

  const outcome = await orchestrator.execute({
    context: {
      debug: 'omit',
      iterationMax: options.scenario.iterations,
      iterationTimeout: 300_000,
      iterations: options.scenario.iterations,
      kind: 'ralph',
      mode: 'plan',
      model: options.model,
      planId: PLAN_RUN_PLAN_ID,
      project: '',
      prompt: options.scenario.prompt,
      runner: options.runner,
      skipWorktreeSetup: true,
      taskId: '',
      timeout: 300_000,
      workingDirectory: options.cwd,
      worktree: undefined,
      worktreeBase: undefined,
    },
  });

  return { chunks, outcome, store };
}
