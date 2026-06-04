import { WorkflowConfig } from '../types/config.js';
import { LifecycleHooksChildJobsOptions } from '../types/lifecycle.js';

/**
 * @description Returns argv segments after `--plan <uuid>` (or `--task`) for nested workflow-ralph invocations.
 */
export const parseWorkflowConfig = (config: WorkflowConfig): string[] => {
  const {
    debug,
    // iterationTimeout,
    iterations,
    model = 'auto',
    // project,
    // prompt,
    runner = 'cursor',
    // timeout,
    worktree,
    worktreeBase,
    worktreeSkipSetup,
  } = config;

  const args: string[] = [];

  // 1. We always have a model - defaults to 'auto'
  args.push('--model', model);

  // 2. Enable any logging
  switch (debug) {
    case 'debug':
      args.push('--debug');
      break;
    case 'verbose':
      args.push('--verbose');
      break;
    case 'omit':
      break;
  }

  // --backend
  if (runner !== undefined && runner !== null && runner !== 'cursor') {
    args.push('--backend', runner);
  }

  // --iterations
  if (iterations !== undefined && iterations !== null) {
    if (iterations > 100) {
      throw new Error('Iterations must be less than 100');
    }

    args.push('--iterations', iterations.toString());
  }

  // 6. Worktree setup
  if (worktree !== undefined && worktree !== null) {
    args.push('--worktree', worktree);
  }

  const base = worktreeBase?.trim();
  if (base !== undefined && base !== '') {
    args.push('--worktree-base', base);
  }

  if (worktreeSkipSetup === true) {
    args.push('--skip-worktree-setup');
  }

  // if (project !== undefined && project !== '') {
  //   args.push('--project', project);
  // }

  // const promptFile = config.promptFile?.trim();
  // if (promptFile !== undefined && promptFile !== '') {
  //   args.push('--prompt-file', promptFile);
  // } else {
  //   const prompt = config.prompt?.trim();
  //   if (
  //     prompt !== undefined &&
  //     prompt !== '' &&
  //     prompt !== DEFAULT_RALPH_PROMPT
  //   ) {
  //     args.push('--prompt', prompt);
  //   }
  // }

  // const project = config.project?.trim();
  // if (project !== undefined && project !== '') {
  //   args.push('--project', project);
  // }

  // if (
  //   config.iterationTimeoutSeconds !== undefined &&
  //   config.iterationTimeoutSeconds !== null &&
  //   config.iterationTimeoutSeconds >= 1
  // ) {
  //   args.push(
  //     '--iteration-timeout',
  //     String(Math.floor(config.iterationTimeoutSeconds)),
  //   );
  // }

  // const worktree =
  //   config.worktree === null || config.worktree === undefined
  //     ? undefined
  //     : config.worktree;

  // args.push(
  //   ...buildWorktreeNestedArgv(worktree, {
  //     worktreeSkipSetup: config.worktreeSkipSetup === true,
  //     worktreeBase:
  //       config.worktreeBase === null || config.worktreeBase === undefined
  //         ? undefined
  //         : config.worktreeBase,
  //   }),
  // );

  return args;
};

/**
 * When false, plan-run hooks run in-process (rollback for child-job orchestration).
 * Default: child BullMQ jobs on the orchestrator path.
 *
 * Precedence when callers pass {@link LifecycleHooksChildJobsOptions.lifecycleHooksChildJobs}:
 * that value wins (already merged from `.workflow-ralph.json` + env). Otherwise only
 * `OPENTHROTTLE_LIFECYCLE_HOOKS_CHILD_JOBS=false` disables child jobs.
 */
export const isLifecycleHooksChildJobsEnabled = (
  options?: LifecycleHooksChildJobsOptions,
): boolean => {
  if (options?.lifecycleHooksChildJobs !== undefined) {
    return options.lifecycleHooksChildJobs;
  }

  const env = options?.env ?? process.env;

  return env.OPENTHROTTLE_LIFECYCLE_HOOKS_CHILD_JOBS !== 'false';
};
