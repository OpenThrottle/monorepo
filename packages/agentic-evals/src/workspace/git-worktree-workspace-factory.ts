import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { promisify } from 'node:util';

import type { EvalCase } from '../types/index.ts';
import type { EvalWorkspace, EvalWorkspaceFactory } from './eval-workspace.ts';

const execFileAsync = promisify(execFile);

/**
 * @description Where the worktrees live and what they check out.
 * @public
 */
export interface GitWorktreeWorkspaceFactoryOptions {
  readonly ref: string;
  readonly repoPath: string;
}

/**
 * @description Resolves a setup file's path inside the workspace, or `null` when it would escape it.
 */
const resolveInside = (root: string, path: string): string | null => {
  const target = resolve(root, path);
  const rel = relative(root, target);

  return rel.startsWith('..') || isAbsolute(rel) ? null : target;
};

const writeSetupFiles = async (
  root: string,
  evalCase: EvalCase,
): Promise<void> => {
  const writes = evalCase.input.cwdSetup.files.map(async (file) => {
    const target = resolveInside(root, file.path);

    if (target === null) {
      throw new Error(
        `Setup file "${file.path}" of case "${evalCase.id}" escapes the workspace.`,
      );
    }

    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, file.content, 'utf8');
  });

  await Promise.all(writes);
};

/**
 * @description One `git worktree add --detach` checkout of `ref` per attempt, in a fresh temp
 * directory, with the case's setup files written on top. `dispose` runs `git worktree remove
 * --force` and deletes the temp directory, so an attempt never sees another's edits.
 * @public
 */
export const createGitWorktreeWorkspaceFactory = (
  options: GitWorktreeWorkspaceFactoryOptions,
): EvalWorkspaceFactory => {
  const { ref, repoPath } = options;

  return {
    create: async (evalCase: EvalCase): Promise<EvalWorkspace> => {
      const parent = await mkdtemp(join(tmpdir(), 'ot-eval-'));
      const cwd = join(parent, 'worktree');

      const dispose = async (): Promise<void> => {
        await execFileAsync('git', ['worktree', 'remove', '--force', cwd], {
          cwd: repoPath,
        }).catch(() => {
          // Already gone, or never added: the directory removal below is what matters.
        });
        await rm(parent, { force: true, recursive: true });
      };

      try {
        await execFileAsync('git', ['worktree', 'add', '--detach', cwd, ref], {
          cwd: repoPath,
        });
        await writeSetupFiles(cwd, evalCase);
      } catch (error) {
        await dispose();

        throw error;
      }

      return { cwd, dispose };
    },
  };
};
