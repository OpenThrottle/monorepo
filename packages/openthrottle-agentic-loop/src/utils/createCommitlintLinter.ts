import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { WorkflowRalphCommandRunner } from '@openthrottle/openthrottle-agentic-ralph';

import { FALLBACK_RUNNER, LOCKFILE_RUNNERS } from '../data/data.constants.ts';
import {
  COMMIT_TEMP_PREFIX,
  COMMITLINT_CONFIG_FILES,
  COMMITLINT_RUNNER_ARGV,
} from '../data/data.git.ts';

/** @public */
export type CommitMessageLint =
  | { readonly kind: 'ok' }
  | { readonly kind: 'rejected'; readonly output: string };

/** @public */
export type CommitMessageLinter = (
  message: string,
) => Promise<CommitMessageLint>;

const exists = async (path: string): Promise<boolean> => {
  try {
    await access(path);

    return true;
  } catch {
    return false;
  }
};

const hasPackageJsonConfig = async (cwd: string): Promise<boolean> => {
  try {
    const parsed: unknown = JSON.parse(
      await readFile(join(cwd, 'package.json'), 'utf8'),
    );

    return (
      parsed !== null && typeof parsed === 'object' && 'commitlint' in parsed
    );
  } catch {
    return false;
  }
};

const hasCommitlintConfig = async (cwd: string): Promise<boolean> => {
  const found = await Promise.all(
    COMMITLINT_CONFIG_FILES.map((file) => exists(join(cwd, file))),
  );

  return found.includes(true) || (await hasPackageJsonConfig(cwd));
};

const resolveRunnerArgv = async (cwd: string): Promise<readonly string[]> => {
  const hits = await Promise.all(
    LOCKFILE_RUNNERS.map(async (entry) => {
      return (await exists(join(cwd, entry.file))) ? entry.runner : undefined;
    }),
  );
  const runner = hits.find((hit) => hit !== undefined) ?? FALLBACK_RUNNER;

  return (
    COMMITLINT_RUNNER_ARGV[runner] ?? ['npx', '--no-install', 'commitlint']
  );
};

const headerLint = (message: string): CommitMessageLint => {
  const header = message.split('\n')[0] ?? '';

  return header.trim() === ''
    ? { kind: 'rejected', output: 'commit message header is empty' }
    : { kind: 'ok' };
};

/**
 * @description Commit-message check (docs § 7): the repo's own commitlint (run through its package
 * manager on a temp file) when the repo has a commitlint config, otherwise any non-empty header.
 * @public
 */
export const createCommitlintLinter = (options: {
  readonly cwd: string;
  readonly runCommand: WorkflowRalphCommandRunner;
}): CommitMessageLinter => {
  const { cwd, runCommand } = options;

  return async (message) => {
    if (!(await hasCommitlintConfig(cwd))) {
      return headerLint(message);
    }

    const [command, ...prefix] = await resolveRunnerArgv(cwd);

    if (command === undefined) {
      return headerLint(message);
    }

    const dir = await mkdtemp(join(tmpdir(), COMMIT_TEMP_PREFIX));

    try {
      const file = join(dir, 'COMMIT_EDITMSG');

      await writeFile(file, message, 'utf8');

      const result = await runCommand({
        args: [...prefix, '--edit', file],
        command,
        cwd,
      });

      if (result.exitCode === 0) {
        return { kind: 'ok' };
      }

      return {
        kind: 'rejected',
        output: `${result.stdout}\n${result.stderr}`.trim(),
      };
    } finally {
      await rm(dir, { force: true, recursive: true });
    }
  };
};
