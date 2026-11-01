import { describe, expect, it } from 'vitest';

import {
  describeNxLock,
  orphanedNxOwners,
  parseRunningTaskRows,
  tasksHeldBy,
} from '../utils/nx-running-tasks.ts';

const ROOT = '/w/monorepo/wt';

const rows = parseRunningTaskRows(
  JSON.stringify([
    { cwd: ROOT, pid: 100, task_id: 'openthrottle-server:dev' },
    { cwd: ROOT, pid: 100, task_id: '@openthrottle/nestjs-utils:dev' },
    { cwd: ROOT, pid: 200, task_id: 'openthrottle-developer:dev' },
    { cwd: '/w/monorepo', pid: 300, task_id: 'openthrottle-server:dev' },
    { cwd: ROOT, pid: 400, task_id: 'openthrottle-server:dev-api' },
  ]),
);

describe('parseRunningTaskRows', () => {
  it('reads sqlite3 -json rows and ignores malformed ones', () => {
    expect(rows).toHaveLength(5);
    expect(rows[0]).toEqual({ cwd: ROOT, pid: 100, taskId: 'openthrottle-server:dev' }); // prettier-ignore
    expect(parseRunningTaskRows('')).toEqual([]);
    expect(parseRunningTaskRows('not json')).toEqual([]);
    expect(parseRunningTaskRows('{"pid":1}')).toEqual([]);
    expect(parseRunningTaskRows(JSON.stringify([{ pid: 'x' }, null, 4]))).toEqual([]); // prettier-ignore
  });
});

describe('orphanedNxOwners', () => {
  const alive = (pids: number[]) => (pid: number) => pids.includes(pid);
  const server = ['openthrottle-server:dev', 'openthrottle-server:dev-api'];

  it('returns live owners of the target tasks in this checkout that the helper did not launch', () => {
    expect(orphanedNxOwners(rows, ROOT, server, new Set(), alive([100, 200, 300, 400]))).toEqual([100, 400]); // prettier-ignore
  });

  it('skips tracked pids, dead pids and rows from another checkout', () => {
    expect(orphanedNxOwners(rows, ROOT, server, new Set([100]), alive([100, 400]))).toEqual([400]); // prettier-ignore
    expect(orphanedNxOwners(rows, ROOT, server, new Set(), alive([]))).toEqual([]); // prettier-ignore
    expect(orphanedNxOwners(rows, ROOT, server, new Set(), alive([300]))).toEqual([]); // prettier-ignore
  });

  it('ignores tasks that are not the target (a shared package dev is not a stale lock)', () => {
    expect(orphanedNxOwners(rows, ROOT, ['openthrottle-developer:dev'], new Set(), alive([100, 200]))).toEqual([200]); // prettier-ignore
  });
});

describe('lock descriptions', () => {
  it('lists the tasks a pid holds', () => {
    expect(tasksHeldBy(rows, 100)).toEqual(['openthrottle-server:dev', '@openthrottle/nestjs-utils:dev']); // prettier-ignore
  });

  it('names the owner pid and the worktree-scoped fix', () => {
    const message = describeNxLock(
      rows,
      ROOT,
      'openthrottle-server:dev',
      'server',
    );

    expect(message).toContain('held by nx pid 100');
    expect(message).toContain('pnpm worktree:serve --stop server');
  });
});
