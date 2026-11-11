import { describe, expect, it } from 'vitest';

import type { ProfileTask } from '../shard-weights-from-ci.ts';
import {
  mergeWeights,
  parseProfile,
  weighRun,
} from '../shard-weights-from-ci.ts';

const task = (
  project: string,
  target: string,
  seconds: number,
  status = 'success',
): ProfileTask => {
  return { duration: seconds * 1_000_000, project, status, target };
};

describe('parseProfile', () => {
  it('reads complete events from a bare Nx trace array', () => {
    const raw = JSON.stringify([
      { args: { status: 'success', target: { project: 'a', target: 'lint' } }, dur: 2_000_000, name: 'a:lint', ph: 'X' }, // prettier-ignore
      { name: 'process_name', ph: 'M' },
    ]);

    expect(parseProfile(raw)).toEqual([task('a', 'lint', 2)]);
  });

  it('accepts the { traceEvents } wrapper and drops malformed events', () => {
    const raw = JSON.stringify({ traceEvents: [{ dur: 1, ph: 'X' }, 'nope'] });

    expect(parseProfile(raw)).toEqual([]);
  });
});

describe('weighRun', () => {
  it('sums a project’s own lint, typecheck and test', () => {
    const weights = weighRun(
      [task('a', 'lint', 2), task('a', 'typecheck', 3), task('a', 'test', 5)],
      [],
    );

    expect(weights.get('a')).toBe(10_000);
  });

  it('takes the longest copy of a task that ran on several shards', () => {
    const weights = weighRun(
      [task('a', 'typecheck', 3), task('a', 'typecheck', 7)],
      [],
    );

    expect(weights.get('a')).toBe(7_000);
  });

  it('ignores cache hits, other targets and a suite-sharded project’s test', () => {
    const weights = weighRun(
      [
        task('a', 'typecheck', 9, 'local-cache'),
        task('a', 'build', 9),
        task('dev', 'test', 100),
        task('dev', 'lint', 4),
      ],
      ['dev'],
    );

    expect(weights.has('a')).toBe(false);
    expect(weights.get('dev')).toBe(4_000);
  });
});

describe('mergeWeights', () => {
  it('takes the median across runs for measured projects', () => {
    const runs = [
      new Map([['a', 10]]),
      new Map([['a', 30]]),
      new Map([['a', 20]]),
    ];

    expect(mergeWeights(runs, {})).toEqual({ a: 20 });
  });

  it('scales unmeasured previous weights by the shared median ratio', () => {
    const runs = [new Map([['a', 200], ['b', 400]])]; // prettier-ignore

    expect(mergeWeights(runs, { a: 100, b: 200, c: 50 })).toEqual({
      a: 200,
      b: 400,
      c: 100,
    });
  });
});
