import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { WorkflowRalphCommandRunner } from '@openthrottle/openthrottle-agentic-ralph';

import type { LoopTask } from '../contract/index.ts';
import { FALLBACK_RUNNER, LOCKFILE_RUNNERS } from '../data/data.constants.ts';
import {
  COMMIT_HEADER_MAX_CHARS,
  COMMIT_TEMP_PREFIX,
  COMMITLINT_CONFIG_FILES,
  COMMITLINT_RUNNER_ARGV,
  FALLBACK_COMMIT_TYPE,
  FALLBACK_COMMIT_TYPES,
  JOB_FOOTER_KEYS,
} from '../data/data.git.ts';

const FOOTER_LINE = /^([A-Za-z][A-Za-z-]*: .+|(Closes|Fixes|Resolves) #\d+)$/;

const isJobFooter = (line: string): boolean => {
  return JOB_FOOTER_KEYS.some((key) => line.startsWith(`${key}:`));
};

/**
 * @description Appends the footer lines to a commit message, dropping any `Plan-Id:`/`Task-Id:`
 * the message already carries. Lines join the message's own trailing footer paragraph when it has
 * one, otherwise they start a new paragraph.
 * @public
 */
export const appendCommitFooters = (
  message: string,
  footers: readonly string[],
): string => {
  const kept = message
    .trim()
    .split('\n')
    .filter((line) => !isJobFooter(line.trim()));
  const text = kept.join('\n').trim();
  const paragraphs = text.split(/\n\s*\n/);
  const last = paragraphs.at(-1) ?? '';
  const joinsFooterBlock =
    paragraphs.length > 1 &&
    last.split('\n').every((line) => FOOTER_LINE.test(line.trim()));
  const separator = joinsFooterBlock ? '\n' : '\n\n';

  return `${text}${separator}${footers.join('\n')}\n`;
};

const lowerFirst = (text: string): string => {
  return `${text.charAt(0).toLowerCase()}${text.slice(1)}`;
};

/**
 * @description `<type>: <task title>` fallback header (§ 7): type from the category, subject's
 * first character lower-cased, header capped at 100 characters.
 * @public
 */
export const buildFallbackCommitMessage = (
  task: Pick<LoopTask, 'category' | 'title'>,
): string => {
  const category = (task.category ?? '').trim().toLowerCase();
  const type = Object.hasOwn(FALLBACK_COMMIT_TYPES, category)
    ? (FALLBACK_COMMIT_TYPES[category] ?? FALLBACK_COMMIT_TYPE)
    : FALLBACK_COMMIT_TYPE;
  const subject = lowerFirst(task.title.replace(/\s+/g, ' ').trim());

  return `${type}: ${subject}`.slice(0, COMMIT_HEADER_MAX_CHARS).trimEnd();
};

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
