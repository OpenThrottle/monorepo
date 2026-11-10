import type { TaskFragment } from '@openthrottle/openthrottle-agentic-ralph';
import { describe, expect, it } from 'vitest';

import {
  buildFinalValidationDescription,
  buildSessionOptions,
  buildWorkerEnv,
  formatNarration,
  toLoopTask,
  toTimeoutMs,
} from './ot-loop.utils.ts';

const row = (overrides: Partial<TaskFragment> = {}): TaskFragment => {
  return {
    category: 'implementation',
    createdAt: '2026-11-09T00:00:00.000Z',
    description: 'Do the thing',
    id: 'task-1',
    planId: 'plan-1',
    requirementsJson: JSON.stringify(['it works', '  ']),
    sortOrder: 1000,
    status: 'PENDING',
    title: 'Thing',
    updatedAt: '2026-11-09T00:00:00.000Z',
    ...overrides,
  };
};

describe('toLoopTask', () => {
  it('maps a pending row, parsing the acceptance criteria', () => {
    expect(toLoopTask(row())).toEqual({
      category: 'implementation',
      createdAt: '2026-11-09T00:00:00.000Z',
      description: 'Do the thing',
      id: 'task-1',
      requirements: ['it works'],
      sortOrder: 1000,
      status: 'PENDING',
      title: 'Thing',
    });
  });

  it('keeps every status the loop knows', () => {
    for (const status of [
      'BLOCKED',
      'COMPLETED',
      'IN_PROGRESS',
      'PENDING',
      'QUEUED',
      'SKIPPED',
    ]) {
      expect(toLoopTask(row({ status })).status).toBe(status);
    }
  });

  it('maps a status the loop has no case for to SKIPPED, so it neither runs nor blocks the close', () => {
    expect(toLoopTask(row({ status: 'CANCELED' })).status).toBe('SKIPPED');
    expect(toLoopTask(row({ status: 'PROMOTED' })).status).toBe('SKIPPED');
  });

  it('maps a runner-executed hook task to SKIPPED so the loop never double-runs it', () => {
    const hook = row({
      hookRole: 'beforeAll',
      hookSource: 'skill',
      parentTaskId: null,
    });

    expect(toLoopTask(hook).status).toBe('SKIPPED');
  });

  it('treats a task-level hook (it has a parent) as an ordinary task', () => {
    const hook = row({
      hookRole: 'beforeEach',
      hookSource: 'skill',
      parentTaskId: 'parent-1',
    });

    expect(toLoopTask(hook).status).toBe('PENDING');
  });

  it('defaults a missing description and category', () => {
    const task = toLoopTask(row({ category: null, description: null }));

    expect(task.category).toBeNull();
    expect(task.description).toBe('');
  });
});

describe('buildWorkerEnv', () => {
  it('blanks every OT credential variable the MCP authenticates with', () => {
    expect(buildWorkerEnv()).toEqual({
      OPENTHROTTLE_MCP_AUTH_TOKEN: '',
      OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN: '',
      OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN: '',
      OT_MCP_AUTH_TOKEN_ENV_FILE: '',
    });
  });
});

describe('buildSessionOptions', () => {
  it('carries the run session in X-OT-Session-Id', () => {
    expect(buildSessionOptions('session-1')).toEqual({
      headers: { 'X-OT-Session-Id': 'session-1' },
    });
  });

  it.each([null, undefined, ''])('is undefined for %j', (value) => {
    expect(buildSessionOptions(value)).toBeUndefined();
  });
});

describe('toTimeoutMs', () => {
  it('converts seconds to milliseconds', () => {
    expect(toTimeoutMs(90)).toBe(90_000);
  });

  it.each([null, undefined])('is undefined for %j', (value) => {
    expect(toTimeoutMs(value)).toBeUndefined();
  });
});

describe('formatNarration', () => {
  it('prefixes one trimmed line', () => {
    expect(formatNarration('[ot-loop]', 'hello  \n')).toBe('[ot-loop] hello\n');
  });
});

describe('buildFinalValidationDescription', () => {
  it('names the command, its exit code and the tail', () => {
    const text = buildFinalValidationDescription({
      command: 'pnpm test',
      exitCode: 2,
      tail: 'boom',
    });

    expect(text).toContain('Command: pnpm test');
    expect(text).toContain('Exit code: 2');
    expect(text).toContain('boom');
  });
});
