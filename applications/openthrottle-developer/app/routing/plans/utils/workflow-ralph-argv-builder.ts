/**
 * @description Builds `workflow-ralph` CLI segments (the argv after
 * `workflow-ralph`), the single-line display/copy command, and the queue
 * job-detail path. Flag names match the CLI (`--iteration-timeout` in seconds,
 * etc.) and flags are omitted when values match CLI defaults so invocations stay
 * minimal. Aligned with `tools/workflows/src/utils/parsers.ts` (`parseRalphArgs`).
 */

import {
  DEFAULT_RALPH_ITERATIONS,
  DEFAULT_RALPH_MODEL,
  DEFAULT_RALPH_PROMPT,
  DEFAULT_RALPH_RUNNER,
  PLAN_RUN_BULLMQ_QUEUE_NAME,
  WORKFLOW_RALPH_WORKTREE_FLAG_ONLY,
  type WorkflowRalphRunOptionsInput,
} from './workflow-ralph-config';
import { buildPlanRunWorktreeName } from '@openthrottle/openthrottle-plan-config';

/**
 * @description Resolves agent CLI worktree for argv / GraphQL (flag-only uses {@link WORKFLOW_RALPH_WORKTREE_FLAG_ONLY}).
 */
export const resolveWorkflowRalphWorktreeArgvValue = (
  input: WorkflowRalphRunOptionsInput,
): string | undefined => {
  switch (input.worktreeCli) {
    case 'flag-only':
      return WORKFLOW_RALPH_WORKTREE_FLAG_ONLY;

    case 'named': {
      const name = input.worktreeName.trim();
      if (name !== '') {
        return name;
      }
      // Blank means "derive it from the plan", the same way the server does at enqueue, so the
      // preview shows the worktree the run will actually get instead of dropping the flag.
      const planId = input.planId.trim();
      return planId === '' ? undefined : buildPlanRunWorktreeName(planId);
    }

    case 'omit':
      return undefined;
  }
};

const appendWorkflowRalphWorktreeOptionArgs = (
  args: string[],
  input: WorkflowRalphRunOptionsInput,
): void => {
  const worktree = resolveWorkflowRalphWorktreeArgvValue(input);
  if (worktree === undefined) {
    return;
  }

  if (worktree === WORKFLOW_RALPH_WORKTREE_FLAG_ONLY) {
    args.push('--worktree');
  } else {
    args.push('--worktree', worktree);
  }

  if (input.executionBackend !== 'cursor') {
    return;
  }

  const base = input.worktreeBase.trim();
  if (base !== '') {
    args.push('--worktree-base', base);
  }

  if (input.skipWorktreeSetup) {
    args.push('--skip-worktree-setup');
  }
};

/**
 * @description Builds argv segments after `workflow-ralph` (not including `pnpm exec workflow-ralph`). Flag names match CLI (`--iteration-timeout` in seconds, etc.).
 */
export const buildWorkflowRalphOptionArgs = (
  input: WorkflowRalphRunOptionsInput,
): readonly string[] => {
  const args: string[] = [];

  if (input.targetMode === 'plan') {
    args.push('--plan', input.planId.trim());
  } else {
    args.push('--task', input.taskId.trim());
  }

  if (input.executionBackend !== DEFAULT_RALPH_RUNNER) {
    args.push('--backend', input.executionBackend);
  }

  if (input.promptLayer === 'file') {
    const promptFile = input.promptFile.trim();
    if (promptFile !== '') {
      args.push('--prompt-file', promptFile);
    }
  } else {
    const prompt = input.prompt.trim();
    if (prompt !== '' && prompt !== DEFAULT_RALPH_PROMPT) {
      args.push('--prompt', prompt);
    }
  }

  if (input.iterations !== DEFAULT_RALPH_ITERATIONS) {
    args.push('--iterations', String(input.iterations));
  }

  if (
    input.iterationTimeoutSeconds != null &&
    input.iterationTimeoutSeconds >= 1
  ) {
    args.push(
      '--iteration-timeout',
      String(Math.floor(input.iterationTimeoutSeconds)),
    );
  }

  const model = input.model.trim();
  if (model !== '' && model !== DEFAULT_RALPH_MODEL) {
    args.push('--model', model);
  }

  const project = input.project.trim();
  if (project !== '') {
    args.push('--project', project);
  }

  switch (input.debugCli) {
    case 'debug':
      args.push('--debug');
      break;

    case 'verbose':
      args.push('--verbose');
      break;

    case 'omit':
      break;
  }

  appendWorkflowRalphWorktreeOptionArgs(args, input);

  return args;
};

/**
 * @description Minimal POSIX-ish quoting for display; safe for typical OpenThrottle UUIDs and paths.
 */
const quoteShellArg = (arg: string): string => {
  if (arg === '') {
    return `''`;
  }

  if (/[\s\\$`'"]/.test(arg)) {
    return `'${arg.replace(/'/g, `'\\''`)}'`;
  }

  return arg;
};

/**
 * @description Single-line shell command for display/copy; quotes args when needed.
 */
export const formatWorkflowRalphCommandLine = (
  optionArgs: readonly string[],
): string => {
  const head = 'pnpm exec workflow-ralph';
  if (optionArgs.length === 0) {
    return head;
  }

  return `${head} ${optionArgs.map(quoteShellArg).join(' ')}`;
};

/**
 * @description Path to the queue job detail route for a plan-run job id.
 */
export const planRunJobDetailPath = (jobId: string): string => {
  const q = encodeURIComponent(PLAN_RUN_BULLMQ_QUEUE_NAME);
  const j = encodeURIComponent(jobId.trim());

  return `/queues/${q}/${j}`;
};
