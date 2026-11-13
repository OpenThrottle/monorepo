import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { parseWorkerResult } from '../parseWorkerResult.ts';
import {
  clearResultFile,
  prepareResultDir,
  readResultFile,
} from '../result-file.ts';

const valid = {
  commitMessage: 'feat(x): y',
  followUps: [{ category: null, description: 'd', title: 't' }],
  reason: 'did it',
  status: 'done',
  version: 1,
};

const malformedError = (value: unknown): string => {
  const read = parseWorkerResult(
    typeof value === 'string' ? value : JSON.stringify(value),
  );

  return read.kind === 'malformed' ? read.error : `not malformed: ${read.kind}`;
};

describe('parseWorkerResult', () => {
  it('returns missing for undefined', () => {
    expect(parseWorkerResult(undefined)).toEqual({ kind: 'missing' });
  });

  it('returns ok and ignores unknown keys', () => {
    const read = parseWorkerResult(JSON.stringify({ ...valid, extra: 1 }));

    expect(read).toEqual({
      kind: 'ok',
      result: {
        commitMessage: 'feat(x): y',
        followUps: [{ category: null, description: 'd', title: 't' }],
        reason: 'did it',
        status: 'done',
      },
    });
  });

  it('accepts null commitMessage and blocked status', () => {
    const read = parseWorkerResult(
      JSON.stringify({ ...valid, commitMessage: null, status: 'blocked' }),
    );

    expect(read.kind).toBe('ok');
  });

  describe('malformed', () => {
    it('names invalid JSON', () => {
      expect(malformedError('{nope')).toContain('not valid JSON');
    });

    it('rejects non-objects', () => {
      expect(malformedError('[1]')).toContain('JSON object');
    });

    it('names a wrong version', () => {
      expect(malformedError({ ...valid, version: 2 })).toContain('version');
    });

    it('names a bad status', () => {
      expect(malformedError({ ...valid, status: 'nope' })).toContain('status');
    });

    it('names a bad reason', () => {
      expect(malformedError({ ...valid, reason: '   ' })).toContain('reason');
      expect(malformedError({ ...valid, reason: 'x'.repeat(2001) })).toContain(
        'reason',
      );
    });

    it('names a bad commitMessage', () => {
      expect(malformedError({ ...valid, commitMessage: 3 })).toContain(
        'commitMessage',
      );
    });

    it('names a bad follow-up field', () => {
      expect(malformedError({ ...valid, followUps: 'x' })).toContain(
        'followUps',
      );
      expect(
        malformedError({
          ...valid,
          followUps: [{ category: null, description: 'd', title: '' }],
        }),
      ).toContain('followUps[0].title');
      expect(
        malformedError({
          ...valid,
          followUps: Array.from({ length: 11 }, () => valid.followUps[0]),
        }),
      ).toContain('at most 10');
    });
  });
});

describe('result file adapter', () => {
  const roots: string[] = [];

  afterEach(async () => {
    await Promise.all(
      roots.splice(0).map((root) => rm(root, { force: true, recursive: true })),
    );
  });

  const makeRoot = async (): Promise<string> => {
    const root = await mkdtemp(join(tmpdir(), 'ot-loop-result-'));

    roots.push(root);

    return root;
  };

  it('returns undefined when absent', async () => {
    const root = await makeRoot();

    await prepareResultDir(root);

    expect(await readResultFile(root)).toBeUndefined();
  });

  it('reads then deletes the file', async () => {
    const root = await makeRoot();

    await prepareResultDir(root);
    await writeFile(join(root, '.ot-loop', 'result.json'), '{"a":1}');

    expect(await readResultFile(root)).toBe('{"a":1}');
    expect(existsSync(join(root, '.ot-loop', 'result.json'))).toBe(false);
  });

  it('clears a stale file', async () => {
    const root = await makeRoot();

    await prepareResultDir(root);
    await writeFile(join(root, '.ot-loop', 'result.json'), 'stale');
    await clearResultFile(root);

    expect(await readResultFile(root)).toBeUndefined();
  });

  it('can never be staged', async () => {
    const root = await makeRoot();
    const git = (...args: string[]): string => {
      return execFileSync('git', args, { cwd: root, encoding: 'utf8' });
    };

    git('init', '-q');
    await prepareResultDir(root);
    await writeFile(join(root, '.ot-loop', 'result.json'), '{}');
    await writeFile(join(root, 'real.txt'), 'hello');
    git('add', '-A');

    const staged = git('diff', '--cached', '--name-only').split('\n');

    expect(staged).toContain('real.txt');
    expect(staged.filter((path) => path.startsWith('.ot-loop/'))).toEqual([]);
  });
});
