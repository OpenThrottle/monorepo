import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { appendCommitFooters } from '../append-commit-footers.ts';
import { buildFallbackCommitMessage } from '../build-fallback-commit-message.ts';
import { createCommitlintLinter } from '../create-commitlint-linter.ts';
import { createRecordingRunner } from './git-fixtures.ts';

describe('buildFallbackCommitMessage', () => {
  it.each([
    ['implementation', 'feat'],
    ['documentation', 'docs'],
    ['docs', 'docs'],
    ['test', 'test'],
    ['Testing', 'test'],
    ['refactor', 'refactor'],
    ['research', 'chore'],
    ['constructor', 'chore'],
    [null, 'chore'],
  ])('maps category %s to %s', (category, type) => {
    expect(buildFallbackCommitMessage({ category, title: 'Add parser' })).toBe(
      `${type}: add parser`,
    );
  });

  it('lower-cases only the first character and collapses whitespace', () => {
    expect(
      buildFallbackCommitMessage({
        category: 'implementation',
        title: '  Parse   the\nREADME file ',
      }),
    ).toBe('feat: parse the README file');
  });

  it('caps the header at 100 characters', () => {
    const header = buildFallbackCommitMessage({
      category: null,
      title: 'x'.repeat(300),
    });

    expect(header).toHaveLength(100);
  });
});

describe('appendCommitFooters', () => {
  it('starts a footer paragraph after the body', () => {
    expect(
      appendCommitFooters('feat: a\n\nBody text', ['Plan-Id: p', 'Task-Id: t']),
    ).toBe('feat: a\n\nBody text\n\nPlan-Id: p\nTask-Id: t\n');
  });

  it('joins an existing trailing footer paragraph', () => {
    expect(
      appendCommitFooters('feat: a\n\nBody\n\nCloses #12', ['Plan-Id: p']),
    ).toBe('feat: a\n\nBody\n\nCloses #12\nPlan-Id: p\n');
  });

  it('drops Plan-Id and Task-Id lines the worker wrote itself', () => {
    expect(
      appendCommitFooters('feat: a\n\nPlan-Id: stale\nTask-Id: stale', [
        'Plan-Id: p',
        'Task-Id: t',
      ]),
    ).toBe('feat: a\n\nPlan-Id: p\nTask-Id: t\n');
  });
});

describe('createCommitlintLinter', () => {
  const makeDir = (): Promise<string> => {
    return mkdtemp(join(tmpdir(), 'ot-loop-lint-'));
  };

  it('accepts any non-empty header when the repo has no commitlint config', async () => {
    const cwd = await makeDir();
    const { calls, runCommand } = createRecordingRunner();
    const lint = createCommitlintLinter({ cwd, runCommand });

    expect(await lint('whatever goes\n')).toEqual({ kind: 'ok' });
    expect((await lint('\n\nbody')).kind).toBe('rejected');
    expect(calls).toHaveLength(0);
  });

  it('runs the repo commitlint through its package manager on a temp file', async () => {
    const cwd = await makeDir();

    await writeFile(join(cwd, 'commitlint.config.mts'), 'export default {};');
    await writeFile(join(cwd, 'pnpm-lock.yaml'), '');

    const { calls, runCommand } = createRecordingRunner(() => {
      return Promise.resolve({
        exitCode: 1,
        stderr: 'subject may not be empty',
        stdout: '',
      });
    });
    const lint = createCommitlintLinter({ cwd, runCommand });
    const verdict = await lint('feat: x\n');

    expect(verdict).toEqual({
      kind: 'rejected',
      output: 'subject may not be empty',
    });
    expect(calls[0]?.command).toBe('pnpm');
    expect(calls[0]?.args.slice(0, 3)).toEqual([
      'exec',
      'commitlint',
      '--edit',
    ]);
  });
});
