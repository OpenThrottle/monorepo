/**
 * @description Maps the run-options UI state to the GraphQL
 * {@link RalphPlanRunTuningInput} consumed by `enqueuePlanRun`, and builds the
 * JSON support bundle (canonical argv + enqueue tuning + queue metadata) for the
 * Configuration panel. Queued BullMQ runs are always plan-scoped; the panel's
 * `--task` / target mode only affects the local CLI preview, not enqueue.
 */

import { RalphNestedDebugCli } from '@openthrottle/openthrottle-developer-codegen';
import type { RalphPlanRunTuningInput } from '~/__generated__/graphql';
import {
  DEFAULT_RALPH_ITERATIONS,
  DEFAULT_RALPH_MODEL,
  DEFAULT_RALPH_PROMPT,
  DEFAULT_RALPH_RUNNER,
  PLAN_RUN_BULLMQ_QUEUE_NAME,
  WORKFLOW_RALPH_CONFIG_PRECEDENCE,
  WORKFLOW_RALPH_WORKTREE_FLAG_ONLY,
  parseWorkflowRunIterationTimeoutSeconds,
  type WorkflowRalphRunOptionsInput,
} from './workflow-ralph-config';
import {
  buildWorkflowRalphOptionArgs,
  formatWorkflowRalphCommandLine,
  resolveWorkflowRalphWorktreeArgvValue,
} from './workflow-ralph-argv-builder';

/**
 * @description Maps workflow run options UI state to GraphQL {@link RalphPlanRunTuningInput} for `enqueuePlanRun`.
 * Queued BullMQ runs are always plan-scoped (the route’s plan id); `--task` / target mode in the panel affects the local CLI preview only, not enqueue.
 * Returns `undefined` when every field matches worktree/CLI defaults so the mutation can omit `ralph`.
 */
export const buildRalphPlanRunTuningInputFromWorkflowRunOptions = (
  input: WorkflowRalphRunOptionsInput,
): RalphPlanRunTuningInput | undefined => {
  const ralph: RalphPlanRunTuningInput = {};

  if (input.executionBackend !== DEFAULT_RALPH_RUNNER) {
    ralph.backend = input.executionBackend;
  }

  if (input.iterations !== DEFAULT_RALPH_ITERATIONS) {
    ralph.iterations = input.iterations;
  }

  if (
    input.iterationTimeoutSeconds != null &&
    input.iterationTimeoutSeconds >= 1
  ) {
    ralph.iterationTimeoutSeconds = Math.floor(input.iterationTimeoutSeconds);
  }

  const model = input.model.trim();
  if (model !== '' && model !== DEFAULT_RALPH_MODEL) {
    ralph.model = model;
  }

  const project = input.project.trim();
  if (project !== '') {
    ralph.project = project;
  }

  if (input.promptLayer === 'file') {
    const path = input.promptFile.trim();
    if (path !== '') {
      ralph.promptFile = path;
    }
  } else {
    const prompt = input.prompt.trim();
    if (prompt !== '' && prompt !== DEFAULT_RALPH_PROMPT) {
      ralph.prompt = prompt;
    }
  }

  const worktree = resolveWorkflowRalphWorktreeArgvValue(input);
  if (
    worktree !== undefined &&
    worktree !== WORKFLOW_RALPH_WORKTREE_FLAG_ONLY
  ) {
    ralph.worktree = worktree;
  }

  if (input.executionBackend === 'cursor') {
    const worktreeBase = input.worktreeBase.trim();
    if (worktreeBase !== '') {
      ralph.worktreeBase = worktreeBase;
    }

    if (input.skipWorktreeSetup) {
      ralph.skipWorktreeSetup = true;
    }
  }

  switch (input.debugCli) {
    case 'debug':
      ralph.ralphDebugCli = RalphNestedDebugCli.Debug;
      break;

    case 'verbose':
      ralph.ralphDebugCli = RalphNestedDebugCli.Verbose;
      break;

    case 'omit':
      break;
  }

  if (Object.keys(ralph).length === 0) {
    return undefined;
  }

  return ralph;
};

interface WorkflowRalphDebugBundleInput {
  readonly iterationTimeoutText: string;
  readonly planId: string;
  readonly workflowInput: WorkflowRalphRunOptionsInput;
}

/**
 * @description JSON bundle for support: plan id, CLI preview target, canonical argv line, optional enqueue tuning object, and queue metadata. Omits secrets.
 */
export const buildWorkflowRalphDebugBundleText = (
  input: WorkflowRalphDebugBundleInput,
): string => {
  const merged: WorkflowRalphRunOptionsInput = {
    ...input.workflowInput,
    iterationTimeoutSeconds: parseWorkflowRunIterationTimeoutSeconds(
      input.iterationTimeoutText,
    ),
  };

  const optionArgs = buildWorkflowRalphOptionArgs(merged);
  const canonicalCommand = formatWorkflowRalphCommandLine(optionArgs);
  const enqueueTuning =
    buildRalphPlanRunTuningInputFromWorkflowRunOptions(merged);

  const payload = {
    argvSegments: optionArgs,
    canonicalCommand,
    cliPreview: {
      note: 'Matches Configuration → Canonical CLI. Toolbar enqueue uses enqueueRalphTuning only (plan-scoped); --task in preview is for local CLI.',
      targetMode: merged.targetMode,
    },
    docs: {
      cliHelp: 'pnpm exec workflow-ralph --help',
      monorepoReadme: 'tools/workflows/README.md',
    },
    enqueueRalphTuning: enqueueTuning ?? null,
    planId: input.planId,
    precedence: WORKFLOW_RALPH_CONFIG_PRECEDENCE,
    queue: {
      jobListPath: `/queues/${PLAN_RUN_BULLMQ_QUEUE_NAME}`,
      name: PLAN_RUN_BULLMQ_QUEUE_NAME,
    },
    taskId:
      merged.targetMode === 'task' && merged.taskId.trim() !== ''
        ? merged.taskId.trim()
        : undefined,
  };

  return `${JSON.stringify(payload, null, 2)}\n`;
};
