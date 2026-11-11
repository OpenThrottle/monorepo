import { describe, expect, it } from 'vitest';

import type { CiJob, CiRun } from '../ci-timings.ts';
import {
  formatSeconds,
  median,
  parseJobs,
  secondsBetween,
  summarize,
  summarizeRun,
} from '../ci-timings.ts';

const at = (seconds: number): string => {
  return new Date(Date.UTC(2026, 10, 10, 0, 0, seconds)).toISOString();
};

const shard = (
  index: number,
  start: number,
  end: number,
  nx: number,
): CiJob => {
  return {
    completedAt: at(end),
    conclusion: 'success',
    name: `build (${index}, lint,typecheck,test)`,
    startedAt: at(start),
    steps: [
      { completedAt: at(start + 40), conclusion: 'success', name: '🤖 Node Setup', startedAt: at(start) }, // prettier-ignore
      { completedAt: at(start + 70), conclusion: 'success', name: '🧩 Codegen Tasks', startedAt: at(start + 40) }, // prettier-ignore
      { completedAt: at(start + 70 + nx), conclusion: 'success', name: '🧠 NX lint,typecheck,test affected (shard 1/3)', startedAt: at(start + 70) }, // prettier-ignore
    ],
  };
};

const run = (jobs: CiJob[]): CiRun => {
  return { createdAt: at(0), databaseId: 1, jobs, updatedAt: at(900) };
};

describe('secondsBetween', () => {
  it('measures whole seconds', () => {
    expect(secondsBetween(at(10), at(75))).toBe(65);
  });

  it('is undefined when either end is missing', () => {
    expect(secondsBetween(null, at(1))).toBeUndefined();
    expect(secondsBetween(at(1), null)).toBeUndefined();
  });
});

describe('median', () => {
  it('takes the middle of an odd count', () => {
    expect(median([5, 1, 3])).toBe(3);
  });

  it('averages the middle pair of an even count', () => {
    expect(median([1, 2, 3, 10])).toBe(3);
  });

  it('ignores undefined and is undefined for nothing', () => {
    expect(median([undefined, 4])).toBe(4);
    expect(median([])).toBeUndefined();
  });
});

describe('summarizeRun', () => {
  it('reports the slowest shard, the spread and that shard’s NX step', () => {
    const timings = summarizeRun(
      run([
        shard(1, 10, 500, 400),
        shard(2, 10, 800, 700),
        shard(3, 10, 610, 500),
      ]),
    );

    expect(timings).toMatchObject({ critical: 790, nx: 700, spread: 300, wall: 900 }); // prettier-ignore
    expect(timings?.setup).toBe(40);
    expect(timings?.codegen).toBe(30);
  });

  it('drops a run whose build was skipped', () => {
    expect(summarizeRun(run([]))).toBeUndefined();
  });

  it('ignores a shard that did not succeed', () => {
    const failed: CiJob = {
      ...shard(2, 10, 2000, 1900),
      conclusion: 'failure',
    };

    expect(summarizeRun(run([shard(1, 10, 500, 400), failed]))?.critical).toBe(490); // prettier-ignore
  });

  it('reads the gates job when present', () => {
    const gates: CiJob = { completedAt: at(200), conclusion: 'success', name: 'gates', startedAt: at(10), steps: [] }; // prettier-ignore

    expect(summarizeRun(run([shard(1, 10, 500, 400), gates]))?.gates).toBe(190);
  });
});

describe('summarize', () => {
  it('takes per-column medians and counts runs', () => {
    const a = summarizeRun(run([shard(1, 0, 600, 500)]));
    const b = summarizeRun(run([shard(1, 0, 400, 300)]));
    const c = summarizeRun(run([shard(1, 0, 800, 700)]));
    const timings = [a, b, c].filter((value) => value !== undefined);

    expect(summarize(timings)).toMatchObject({ critical: 600, runs: 3 });
  });
});

describe('formatSeconds', () => {
  it('formats minutes and padded seconds', () => {
    expect(formatSeconds(754)).toBe('12m34s');
    expect(formatSeconds(undefined)).toBe('—');
  });
});

describe('parseJobs', () => {
  it('keeps well-formed jobs and treats empty timestamps as missing', () => {
    const raw = JSON.stringify({
      jobs: [
        { completedAt: '', conclusion: 'skipped', name: 'gates', startedAt: '', steps: [] }, // prettier-ignore
        'not a job',
      ],
    });

    expect(parseJobs(raw)).toEqual([
      { completedAt: null, conclusion: 'skipped', name: 'gates', startedAt: null, steps: [] }, // prettier-ignore
    ]);
  });
});
