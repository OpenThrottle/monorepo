import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type {
  WorkflowRalphCommandResult,
  WorkflowRalphCommandRunner,
} from '@openthrottle/openthrottle-agentic-ralph';

import type {
  DiscardTaskChangesResult,
  GitCommitResult,
  GitHeadState,
  LoopGit,
} from '../contract/index.ts';
import {
  COMMIT_TEMP_PREFIX,
  LOOP_DIR_PREFIX,
  LOOP_PATCHES_DIR,
} from '../data/data.git.ts';
import type { CommitMessageLinter } from './commit.ts';
import { appendCommitFooters, buildFallbackCommitMessage } from './commit.ts';
import { prepareResultDir } from './worker-result.ts';

export interface CreateLoopGitOptions {
  readonly cwd: string;
  readonly lint: CommitMessageLinter;
  readonly runCommand: WorkflowRalphCommandRunner;
}

const combinedOutput = (result: WorkflowRalphCommandResult): string => {
  return `${result.stdout}\n${result.stderr}`.trim();
};

/**
 * @description The real `LoopGit` over an injected command runner (docs § 5, § 7): per-task
 * commits with `Plan-Id:`/`Task-Id:` footers, patch-and-restore for tasks that do not complete, and
 * the HEAD/branch helpers behind the worker-misbehaviour guard (§ 2). Never `--no-verify`.
 * @public
 */
export const createLoopGit = (options: CreateLoopGitOptions): LoopGit => {
  const { cwd, lint, runCommand } = options;

  const git = (
    args: readonly string[],
  ): Promise<WorkflowRalphCommandResult> => {
    return runCommand({ args, command: 'git', cwd });
  };

  const gitOrThrow = async (args: readonly string[]): Promise<string> => {
    const result = await git(args);

    if (result.exitCode !== 0) {
      throw new Error(
        `git ${args.join(' ')} failed: ${combinedOutput(result)}`,
      );
    }

    return result.stdout;
  };

  const head = async (): Promise<GitHeadState> => {
    const branch = (
      await gitOrThrow(['rev-parse', '--abbrev-ref', 'HEAD'])
    ).trim();
    const sha = (await gitOrThrow(['rev-parse', 'HEAD'])).trim();

    return { branch, sha };
  };

  const restoreHead = async (target: GitHeadState): Promise<void> => {
    if (target.branch !== 'HEAD') {
      const checkout = await git(['checkout', target.branch]);

      if (checkout.exitCode !== 0) {
        // A dirty tree can refuse a checkout; re-point HEAD without touching files.
        await gitOrThrow([
          'symbolic-ref',
          'HEAD',
          `refs/heads/${target.branch}`,
        ]);
      }
    }

    await gitOrThrow(['reset', '--soft', target.sha]);
  };

  const chooseMessage = async (input: {
    readonly commitMessage: string | null;
    readonly footers: readonly string[];
    readonly title: string;
    readonly category: string | null;
  }): Promise<
    | { readonly kind: 'chosen'; readonly message: string }
    | { readonly kind: 'rejected'; readonly output: string }
  > => {
    const worker = input.commitMessage?.trim() ?? '';

    if (worker !== '') {
      const candidate = appendCommitFooters(worker, input.footers);

      if ((await lint(candidate)).kind === 'ok') {
        return { kind: 'chosen', message: candidate };
      }
    }

    const fallback = appendCommitFooters(
      buildFallbackCommitMessage({
        category: input.category,
        title: input.title,
      }),
      input.footers,
    );
    const checked = await lint(fallback);

    return checked.kind === 'ok'
      ? { kind: 'chosen', message: fallback }
      : { kind: 'rejected', output: checked.output };
  };

  const commitWithMessage = async (
    message: string,
  ): Promise<GitCommitResult> => {
    const dir = await mkdtemp(join(tmpdir(), COMMIT_TEMP_PREFIX));

    try {
      const file = join(dir, 'COMMIT_EDITMSG');

      await writeFile(file, message, 'utf8');

      const committed = await git(['commit', '-F', file]);

      if (committed.exitCode !== 0) {
        return { kind: 'failed', output: combinedOutput(committed) };
      }

      return {
        kind: 'committed',
        sha: (await gitOrThrow(['rev-parse', 'HEAD'])).trim(),
      };
    } finally {
      await rm(dir, { force: true, recursive: true });
    }
  };

  const commit: LoopGit['commit'] = async ({ commitMessage, planId, task }) => {
    const added = await git(['add', '-A']);

    if (added.exitCode !== 0) {
      return { kind: 'failed', output: combinedOutput(added) };
    }

    const staged = await git(['diff', '--cached', '--name-only', '-z']);

    if (staged.exitCode !== 0) {
      return { kind: 'failed', output: combinedOutput(staged) };
    }

    const paths = staged.stdout.split('\0').filter((path) => path !== '');
    const leaked = paths.filter((path) => path.startsWith(LOOP_DIR_PREFIX));

    if (leaked.length > 0) {
      await git(['reset', '-q', '--', LOOP_DIR_PREFIX]);

      return {
        kind: 'failed',
        output: `refusing to commit staged ${LOOP_DIR_PREFIX} paths: ${leaked.join(', ')}`,
      };
    }

    if (paths.length === 0) {
      return { kind: 'nothing_to_commit' };
    }

    const chosen = await chooseMessage({
      category: task.category,
      commitMessage,
      footers: [`Plan-Id: ${planId}`, `Task-Id: ${task.id}`],
      title: task.title,
    });

    if (chosen.kind === 'rejected') {
      return { kind: 'failed', output: chosen.output };
    }

    return commitWithMessage(chosen.message);
  };

  const discardTaskChanges: LoopGit['discardTaskChanges'] = async ({
    taskId,
    taskStartSha,
  }): Promise<DiscardTaskChangesResult> => {
    // Untracked files join the diff via intent-to-add; ignored paths (.ot-loop/) never do.
    await gitOrThrow(['add', '-N', '.']);

    const patch = await gitOrThrow(['diff', '--binary', taskStartSha]);
    let statSummary = '';

    if (patch.trim() !== '') {
      await prepareResultDir(cwd);
      await mkdir(join(cwd, LOOP_PATCHES_DIR), { recursive: true });
      await writeFile(
        join(cwd, LOOP_PATCHES_DIR, `${taskId}.patch`),
        patch,
        'utf8',
      );
      statSummary = (await gitOrThrow(['diff', '--stat', taskStartSha])).trim();
    }

    await gitOrThrow(['reset', '--hard', taskStartSha]);
    await gitOrThrow(['clean', '-fd']);

    return { statSummary };
  };

  return { commit, discardTaskChanges, head, restoreHead };
};
