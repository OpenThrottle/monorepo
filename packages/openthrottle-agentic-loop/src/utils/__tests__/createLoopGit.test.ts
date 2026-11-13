import { chmod, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { createCommitlintLinter } from '../commit.ts';
import { createLoopGit } from '../createLoopGit.ts';
import { prepareResultDir } from '../worker-result.ts';
import {
  createLocalRepo,
  createRecordingRunner,
  git,
  writeRepoFile,
} from './git-fixtures.ts';
import { makeTask } from './loop-fakes.ts';

const PLAN_ID = 'plan-1';

const makeLoopGit = (cwd: string) => {
  const recording = createRecordingRunner();
  const loopGit = createLoopGit({
    cwd,
    lint: createCommitlintLinter({ cwd, runCommand: recording.runCommand }),
    runCommand: recording.runCommand,
  });

  return { ...recording, loopGit };
};

describe('createLoopGit.commit', () => {
  it('commits the worker message with Plan-Id and Task-Id footers', async () => {
    const cwd = await createLocalRepo();
    const { loopGit } = makeLoopGit(cwd);
    const task = makeTask('task-1', {});

    await writeRepoFile(cwd, 'a.txt', 'a\n');

    const result = await loopGit.commit({
      commitMessage: 'feat(scope): add a',
      planId: PLAN_ID,
      task,
    });
    const message = await git(cwd, ['log', '-1', '--format=%B']);

    expect(result.kind).toBe('committed');
    expect(message).toBe(
      'feat(scope): add a\n\nPlan-Id: plan-1\nTask-Id: task-1',
    );
  });

  it('falls back to a header derived from the task title when the message is missing', async () => {
    const cwd = await createLocalRepo();
    const { loopGit } = makeLoopGit(cwd);

    await writeRepoFile(cwd, 'a.txt', 'a\n');
    await loopGit.commit({
      commitMessage: null,
      planId: PLAN_ID,
      task: makeTask('task-2', {
        category: 'documentation',
        title: 'Write Docs',
      }),
    });

    expect(await git(cwd, ['log', '-1', '--format=%s'])).toBe(
      'docs: write Docs',
    );
  });

  it('makes no commit when no tracked file changed', async () => {
    const cwd = await createLocalRepo();
    const { loopGit } = makeLoopGit(cwd);
    const before = await git(cwd, ['rev-parse', 'HEAD']);
    const result = await loopGit.commit({
      commitMessage: 'feat: nothing',
      planId: PLAN_ID,
      task: makeTask('task-3', {}),
    });

    expect(result).toEqual({ kind: 'nothing_to_commit' });
    expect(await git(cwd, ['rev-parse', 'HEAD'])).toBe(before);
  });

  it('never stages .ot-loop/ because the directory ignores itself', async () => {
    const cwd = await createLocalRepo();
    const { loopGit } = makeLoopGit(cwd);

    await prepareResultDir(cwd);
    await writeRepoFile(cwd, '.ot-loop/result.json', '{}');

    expect(
      await loopGit.commit({
        commitMessage: 'feat: x',
        planId: PLAN_ID,
        task: makeTask('task-4', {}),
      }),
    ).toEqual({ kind: 'nothing_to_commit' });
  });

  it('refuses when a .ot-loop/ path is staged anyway', async () => {
    const cwd = await createLocalRepo();
    const { loopGit } = makeLoopGit(cwd);

    await prepareResultDir(cwd);
    await writeRepoFile(cwd, '.ot-loop/leak.txt', 'leak\n');
    await writeRepoFile(cwd, 'a.txt', 'a\n');
    await git(cwd, ['add', '-f', '.ot-loop/leak.txt']);

    const result = await loopGit.commit({
      commitMessage: 'feat: x',
      planId: PLAN_ID,
      task: makeTask('task-5', {}),
    });

    expect(result.kind).toBe('failed');
    expect(result.kind === 'failed' ? result.output : '').toContain(
      '.ot-loop/leak.txt',
    );
    expect(await git(cwd, ['log', '--format=%s'])).toBe('chore: base');
  });

  it('returns a failed result carrying the pre-commit hook output', async () => {
    const cwd = await createLocalRepo();
    const { loopGit } = makeLoopGit(cwd);
    const hook = join(cwd, '.git', 'hooks', 'pre-commit');

    await writeFile(hook, '#!/bin/sh\necho "lint-staged: boom" >&2\nexit 1\n');
    await chmod(hook, 0o755);
    await writeRepoFile(cwd, 'a.txt', 'a\n');

    const result = await loopGit.commit({
      commitMessage: 'feat: x',
      planId: PLAN_ID,
      task: makeTask('task-6', {}),
    });

    expect(result.kind).toBe('failed');
    expect(result.kind === 'failed' ? result.output : '').toContain(
      'lint-staged: boom',
    );
  });

  it('falls back when commitlint rejects the worker message, and fails when it rejects the fallback too', async () => {
    const cwd = await createLocalRepo();

    await writeFile(join(cwd, 'commitlint.config.mjs'), 'export default {};');

    const verdicts: number[] = [1, 0];
    const recording = createRecordingRunner((call) => {
      if (call.args.includes('commitlint') || call.command === 'npx') {
        return Promise.resolve({
          exitCode: verdicts.shift() ?? 1,
          stderr: 'scope required',
          stdout: '',
        });
      }

      return Promise.resolve(undefined);
    });
    const loopGit = createLoopGit({
      cwd,
      lint: createCommitlintLinter({ cwd, runCommand: recording.runCommand }),
      runCommand: recording.runCommand,
    });

    await writeRepoFile(cwd, 'a.txt', 'a\n');

    const committed = await loopGit.commit({
      commitMessage: 'bad message',
      planId: PLAN_ID,
      task: makeTask('task-7', { title: 'Do Thing' }),
    });

    expect(committed.kind).toBe('committed');
    expect(await git(cwd, ['log', '-1', '--format=%s'])).toBe(
      'chore: do Thing',
    );

    await writeRepoFile(cwd, 'b.txt', 'b\n');

    const rejected = await loopGit.commit({
      commitMessage: 'bad',
      planId: PLAN_ID,
      task: makeTask('task-8', {}),
    });

    expect(rejected).toEqual({ kind: 'failed', output: 'scope required' });
  });

  it('never passes --no-verify', async () => {
    const cwd = await createLocalRepo();
    const { calls, loopGit } = makeLoopGit(cwd);

    await writeRepoFile(cwd, 'a.txt', 'a\n');
    await loopGit.commit({
      commitMessage: 'feat: x',
      planId: PLAN_ID,
      task: makeTask('task-9', {}),
    });

    expect(calls.flatMap((call) => call.args)).not.toContain('--no-verify');
  });
});

describe('createLoopGit.discardTaskChanges', () => {
  it('saves a binary patch with untracked files, returns the stat summary and restores the tree', async () => {
    const cwd = await createLocalRepo();
    const { loopGit } = makeLoopGit(cwd);
    const startSha = await git(cwd, ['rev-parse', 'HEAD']);

    await prepareResultDir(cwd);
    await writeRepoFile(cwd, 'README.md', 'changed\n');
    await writeRepoFile(cwd, 'new/untracked.txt', 'new\n');
    await writeFile(join(cwd, 'blob.bin'), Buffer.from([0, 1, 2, 255, 254]));

    const result = await loopGit.discardTaskChanges({
      taskId: 'task-1',
      taskStartSha: startSha,
    });
    const patch = await readFile(
      join(cwd, '.ot-loop', 'patches', 'task-1.patch'),
      'utf8',
    );

    expect(result.statSummary).toContain('README.md');
    expect(result.statSummary).toContain('new/untracked.txt');
    expect(patch).toContain('new/untracked.txt');
    expect(patch).toContain('GIT binary patch');
    expect(await git(cwd, ['status', '--porcelain'])).toBe('');
    expect(await readFile(join(cwd, 'README.md'), 'utf8')).toBe('base\n');
    await expect(stat(join(cwd, 'new'))).rejects.toThrow();
    // .ot-loop is ignored, so clean never touched it.
    await expect(stat(join(cwd, '.ot-loop', 'patches'))).resolves.toBeDefined();
  });

  it('writes no patch and an empty summary when the task left nothing', async () => {
    const cwd = await createLocalRepo();
    const { loopGit } = makeLoopGit(cwd);
    const result = await loopGit.discardTaskChanges({
      taskId: 'task-2',
      taskStartSha: await git(cwd, ['rev-parse', 'HEAD']),
    });

    expect(result).toEqual({ statSummary: '' });
    await expect(stat(join(cwd, '.ot-loop', 'patches'))).rejects.toThrow();
  });

  it('also discards commits the worker made after the task start sha', async () => {
    const cwd = await createLocalRepo();
    const { loopGit } = makeLoopGit(cwd);
    const startSha = await git(cwd, ['rev-parse', 'HEAD']);

    await writeRepoFile(cwd, 'extra.txt', 'x\n');
    await git(cwd, ['add', '-A']);
    await git(cwd, ['commit', '-q', '-m', 'wip']);
    await loopGit.discardTaskChanges({
      taskId: 'task-3',
      taskStartSha: startSha,
    });

    expect(await git(cwd, ['rev-parse', 'HEAD'])).toBe(startSha);
  });
});

describe('createLoopGit head and restoreHead', () => {
  it('restores the branch when the worker switched to another one', async () => {
    const cwd = await createLocalRepo();
    const { loopGit } = makeLoopGit(cwd);
    const start = await loopGit.head();

    expect(start.branch).toBe('main');

    await git(cwd, ['checkout', '-q', '-b', 'worker-branch']);
    await writeRepoFile(cwd, 'w.txt', 'w\n');
    await git(cwd, ['add', '-A']);
    await git(cwd, ['commit', '-q', '-m', 'worker commit']);
    await loopGit.restoreHead(start);

    expect(await loopGit.head()).toEqual(start);
  });

  it('keeps the worker changes staged when it committed on the run branch', async () => {
    const cwd = await createLocalRepo();
    const { loopGit } = makeLoopGit(cwd);
    const start = await loopGit.head();

    await writeRepoFile(cwd, 'w.txt', 'w\n');
    await git(cwd, ['add', '-A']);
    await git(cwd, ['commit', '-q', '-m', 'worker commit']);
    await loopGit.restoreHead(start);

    expect(await loopGit.head()).toEqual(start);
    expect(await git(cwd, ['status', '--porcelain'])).toBe('A  w.txt');
  });
});
