/** @description Directory prefix no staged path may start with (§ 5): the worker result dir. */
export const LOOP_DIR_PREFIX = '.ot-loop/';

/** @description Where a discarded task's patch is saved, relative to the worktree root (§ 5). */
export const LOOP_PATCHES_DIR = '.ot-loop/patches';

/** @description Conventional-commit header cap (§ 7). */
export const COMMIT_HEADER_MAX_CHARS = 100;

/** @description Fallback commit type when the task category maps to nothing (§ 7). */
export const FALLBACK_COMMIT_TYPE = 'chore';

/** @description Task category (lower-cased) to fallback commit type (§ 7). */
export const FALLBACK_COMMIT_TYPES: Readonly<Record<string, string>> = {
  docs: 'docs',
  documentation: 'docs',
  implementation: 'feat',
  refactor: 'refactor',
  test: 'test',
  testing: 'test',
};

/** @description Files whose presence means the repository configures commitlint (§ 7). */
export const COMMITLINT_CONFIG_FILES = [
  '.commitlintrc',
  '.commitlintrc.cjs',
  '.commitlintrc.js',
  '.commitlintrc.json',
  '.commitlintrc.mjs',
  '.commitlintrc.ts',
  '.commitlintrc.yaml',
  '.commitlintrc.yml',
  'commitlint.config.cjs',
  'commitlint.config.cts',
  'commitlint.config.js',
  'commitlint.config.mjs',
  'commitlint.config.mts',
  'commitlint.config.ts',
] as const;

/** @description Argv prefix that runs the repo's own commitlint, per package-manager runner. */
export const COMMITLINT_RUNNER_ARGV: Readonly<
  Record<string, readonly string[]>
> = {
  npx: ['npx', '--no-install', 'commitlint'],
  pnpm: ['pnpm', 'exec', 'commitlint'],
  yarn: ['yarn', 'commitlint'],
};

/** @description Footer keys the job owns; stripped from a worker-written message before re-adding. */
export const JOB_FOOTER_KEYS = ['Plan-Id', 'Task-Id'] as const;

/** @description Prefix of the temp directories used for commit message files. */
export const COMMIT_TEMP_PREFIX = 'ot-loop-commit-';

/** @description Prior reason handed to `finalizePlanRun` per loop outcome (§ 7). */
export const FINALIZE_PRIOR_REASONS = {
  complete: 'workflow_complete',
  tasks_blocked: 'workflow_tasks_blocked',
} as const;

/** @description Fallback squash header when the range gives none. */
export const SQUASH_FALLBACK_SUBJECT = 'chore: deliver plan tasks';
