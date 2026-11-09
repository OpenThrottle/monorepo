/**
 * @description Pure helpers for plan-run worktree teardown: the name a server-provisioned worktree
 * carries, and the one plan_output line a teardown writes.
 */

import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { promisify } from 'node:util';

import { PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME } from './plan-run-worktree-teardown.constants.ts';
import type {
  CommandOptions,
  CommandResult,
  PlanRunWorktreeAssessment,
  PlanRunWorktreeTeardownResult,
} from './plan-run-worktree-teardown.types.ts';

const execFileAsync = promisify(execFile);

const MAX_BUFFER_BYTES = 16 * 1024 * 1024;

/** `plan-` plus the first 8 hex characters of the plan id — the name the orchestrator provisions. */
const PLAN_RUN_WORKTREE_NAME_PATTERN = /^plan-[0-9a-f]{8}$/;

/**
 * @description Whether a worktree directory carries the server-provisioned plan-run name. Only the
 * basename is read; the caller still checks the directory sits under the resolved root.
 */
export const isPlanRunWorktreeName = (worktreePath: string): boolean => {
  return PLAN_RUN_WORKTREE_NAME_PATTERN.test(basename(worktreePath));
};

/**
 * @description The primary checkout a linked worktree belongs to: the parent of its git common dir
 * (`<primary>/.git`), which is how `skills/ot-worktree/scripts/common.sh` finds it. Null when the
 * common dir is unknown or is not a `.git` directory.
 */
export const primaryCheckoutFromCommonDir = (
  commonDir: string | null,
): string | null => {
  if (commonDir === null || basename(commonDir) !== '.git') return null;
  return dirname(commonDir);
};

/**
 * @description The single plan_output line describing a teardown or an assessment: what was
 * removed and which branch survives, or why the worktree was kept.
 */
export const describePlanRunWorktreeTeardown = (
  result: PlanRunWorktreeAssessment | PlanRunWorktreeTeardownResult,
): string => {
  const prefix = '[plan-run-worktree-teardown]';

  if (result.outcome === PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.REMOVED) {
    const branch = result.branch ?? '(detached)';
    return `${prefix} removed worktree ${result.worktreePath}; branch ${branch} kept`;
  }
  if (result.outcome === PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.REMOVABLE) {
    return `${prefix} worktree ${result.worktreePath} is safe to remove`;
  }
  if (result.outcome === PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.FAILED) {
    return `${prefix} kept worktree ${result.worktreePath}: teardown failed — ${result.detail}`;
  }
  return `${prefix} kept worktree ${result.worktreePath}: ${result.detail}`;
};

const readStringField = (error: unknown, field: string): string => {
  if (typeof error !== 'object' || error === null) return '';
  if (!(field in error)) return '';
  const value: unknown = Reflect.get(error, field);
  return typeof value === 'string' ? value : '';
};

const readExitCode = (error: unknown): number => {
  if (typeof error !== 'object' || error === null) return 1;
  const code: unknown = Reflect.get(error, 'code');
  return typeof code === 'number' && code !== 0 ? code : 1;
};

/**
 * @description Runs a command and reports its exit code instead of throwing, so each guard reads
 * as a plain branch rather than a try/catch. Shared by teardown and the reaper's probes.
 */
export const runCommand = async (
  file: string,
  args: readonly string[],
  options: CommandOptions,
): Promise<CommandResult> => {
  try {
    const { stderr, stdout } = await execFileAsync(file, [...args], {
      cwd: options.cwd,
      env: process.env,
      maxBuffer: MAX_BUFFER_BYTES,
      timeout: options.timeout,
    });
    return { exitCode: 0, stderr, stdout };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stderr = readStringField(error, 'stderr');
    return {
      exitCode: readExitCode(error),
      stderr: stderr === '' ? message : stderr,
      stdout: readStringField(error, 'stdout'),
    };
  }
};

/** `<directory>/package.json` parsed, or undefined when it is absent or not JSON. */
const readPackageJson = (directory: string): unknown => {
  try {
    const parsed: unknown = JSON.parse(
      readFileSync(join(directory, 'package.json'), 'utf8'),
    );
    return parsed;
  } catch {
    return undefined;
  }
};

/**
 * @description Whether `<directory>/package.json` defines `scripts[scriptName]`. False for a
 * directory with no `package.json`, an unreadable or malformed one, or one without that script —
 * which is how monorepo-only machinery is gated off in a foreign repo.
 */
export const packageDefinesScript = (
  directory: string,
  scriptName: string,
): boolean => {
  const manifest = readPackageJson(directory);
  if (typeof manifest !== 'object' || manifest === null) return false;
  const scripts: unknown = Reflect.get(manifest, 'scripts');
  if (typeof scripts !== 'object' || scripts === null) return false;
  return typeof Reflect.get(scripts, scriptName) === 'string';
};

/** The last 2000 characters of command output, trimmed — enough to name a failure. */
export const tailOutput = (value: string): string => {
  return value.trim().slice(-2000);
};
