import { describe, expect, it } from 'vitest';

import {
  findOrphanWorktrees,
  formatBytes,
  parseLsofCwds,
  parseWorktreeList,
  worktreeOfCwd,
} from '../utils/worktree-orphans.ts';
import type { ProcessRow } from '../utils/worktree-serve.ts';

const BASE = '/home/u/.openthrottle/worktrees/acme/widgets';

const row = (pid: number, pgid: number, command = `cmd ${pid}`): ProcessRow => {
  return { command, pgid, pid, ppid: 1 };
};

describe('parseLsofCwds', () => {
  it('pairs each p<pid> line with the n<path> line that follows it', () => {
    const output = ['p101', 'fcwd', `n${BASE}/gone`, 'p102', 'fcwd', 'n/tmp', ''].join('\n'); // prettier-ignore

    expect([...parseLsofCwds(output)]).toEqual([
      [101, `${BASE}/gone`],
      [102, '/tmp'],
    ]);
  });

  it('ignores a path with no valid pid before it', () => {
    expect(parseLsofCwds('n/orphan\npnope\nn/also').size).toBe(0);
  });
});

describe('worktreeOfCwd', () => {
  it('maps a cwd at or below a worktree to that worktree', () => {
    expect(worktreeOfCwd(`${BASE}/plan-1`, BASE)).toBe(`${BASE}/plan-1`);
    expect(worktreeOfCwd(`${BASE}/plan-1/applications/server`, BASE)).toBe(`${BASE}/plan-1`); // prettier-ignore
    expect(worktreeOfCwd(`${BASE}/plan-1`, `${BASE}/`)).toBe(`${BASE}/plan-1`);
  });

  it('is undefined outside the base directory, or for the base directory itself', () => {
    expect(worktreeOfCwd('/home/u/src/widgets', BASE)).toBeUndefined();
    expect(worktreeOfCwd(BASE, BASE)).toBeUndefined();
    expect(worktreeOfCwd(`${BASE}-other/plan-1`, BASE)).toBeUndefined();
  });
});

describe('parseWorktreeList', () => {
  it('collects the worktree lines of --porcelain output', () => {
    const output = ['worktree /src/widgets', 'HEAD abc', 'branch refs/heads/main', '', `worktree ${BASE}/live`, 'HEAD def', ''].join('\n'); // prettier-ignore

    expect([...parseWorktreeList(output)]).toEqual(['/src/widgets', `${BASE}/live`]); // prettier-ignore
  });
});

describe('findOrphanWorktrees', () => {
  const table = [row(10, 10), row(11, 10), row(12, 12), row(20, 20), row(30, 30), row(99, 99)]; // prettier-ignore

  it('groups processes in unregistered worktrees and lists each group once, leaders first', () => {
    const found = findOrphanWorktrees(
      {
        baseDir: BASE,
        cwds: new Map([
          [11, `${BASE}/gone/applications/server`],
          [10, `${BASE}/gone`],
          [12, `${BASE}/gone`],
          [20, `${BASE}/live`],
          [30, '/elsewhere'],
        ]),
        registered: new Set([`${BASE}/live`]),
        table,
      },
      99,
    );

    expect(found).toEqual([
      {
        path: `${BASE}/gone`,
        pgids: [10, 12],
        processes: [
          { command: 'cmd 10', cwd: `${BASE}/gone`, pgid: 10, pid: 10 },
          { command: 'cmd 11', cwd: `${BASE}/gone/applications/server`, pgid: 10, pid: 11 }, // prettier-ignore
          { command: 'cmd 12', cwd: `${BASE}/gone`, pgid: 12, pid: 12 },
        ],
      },
    ]);
  });

  it('never reports its own process, nor a pid missing from the process table', () => {
    const found = findOrphanWorktrees(
      {
        baseDir: BASE,
        cwds: new Map([
          [99, `${BASE}/gone`],
          [77, `${BASE}/gone`],
        ]),
        registered: new Set(),
        table,
      },
      99,
    );

    expect(found).toEqual([]);
  });

  it('sorts several orphaned worktrees by path', () => {
    const found = findOrphanWorktrees(
      {
        baseDir: BASE,
        cwds: new Map([
          [20, `${BASE}/zeta`],
          [10, `${BASE}/alpha`],
        ]),
        registered: new Set(),
        table,
      },
      99,
    );

    expect(found.map((orphan) => orphan.path)).toEqual([`${BASE}/alpha`, `${BASE}/zeta`]); // prettier-ignore
  });
});

describe('formatBytes', () => {
  it('scales to B, kB and MB', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(12_345)).toBe('12.3 kB');
    expect(formatBytes(244_839_553)).toBe('244.8 MB');
  });
});
