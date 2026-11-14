import type {
  AtifToolCall,
  AtifTrajectory,
} from '@openthrottle/openthrottle-agentic-utils';
import { describe, expect, it } from 'vitest';

import type { SandboxToolCall } from '../../sandbox/createSandboxMcpServer.ts';
import {
  cliGradeBoundaryOf,
  cliSelectionOf,
  isReadOnlyOtTool,
  otCallOf,
} from '../cli-selection.ts';
import { TOOL_SELECTION_CASES } from '../data/data.cases.ts';
import type { CaseExpectation } from '../eval-case.ts';
import { gradeCase } from '../gradeCase.ts';

const OT = new Set(['create_plan', 'get_plan', 'get_task', 'update_task']);

const call = (
  name: string,
  args: Readonly<Record<string, unknown>> = {},
): AtifToolCall => {
  return { arguments: args, function_name: name, tool_call_id: name };
};

const trajectory = (calls: readonly AtifToolCall[]): AtifTrajectory => {
  return {
    agent: { name: 'claude', version: '1' },
    schema_version: 'ATIF-v1.8',
    steps: [
      { message: 'go', source: 'user', step_id: 1 },
      { message: '', source: 'agent', step_id: 2, tool_calls: calls },
      { message: 'done', source: 'agent', step_id: 3 },
    ],
  };
};

const served = (tool: string, args = {}): SandboxToolCall => {
  return { args, tool, ts: '2026-11-13T00:00:00.000Z' };
};

describe('otCallOf', () => {
  it('reads claude-style mcp__<server>__<tool> names', () => {
    expect(otCallOf(call('mcp__openthrottle-mcp__create_plan'), OT)).toEqual({
      server: 'openthrottle-mcp',
      tool: 'create_plan',
    });
  });

  it('reads codex mcp_tool_call items', () => {
    expect(
      otCallOf(
        call('mcp_tool_call', { server: 'openthrottle-mcp', tool: 'get_plan' }),
        OT,
      ),
    ).toEqual({ server: 'openthrottle-mcp', tool: 'get_plan' });
  });

  it('ignores harness tools and MCP tools off the OT surface', () => {
    expect(otCallOf(call('Bash'), OT)).toBeUndefined();
    expect(otCallOf(call('mcp__github__create_issue'), OT)).toBeUndefined();
  });
});

describe('cliSelectionOf', () => {
  describe('when the first OT call matches the sandbox log', () => {
    it('keeps the harness calls before it and takes the arguments the sandbox received', () => {
      const outcome = cliSelectionOf(
        trajectory([
          call('Bash', { command: 'ls' }),
          call('mcp__openthrottle-mcp__create_plan', { title: 'from-trace' }),
          call('mcp__openthrottle-mcp__get_plan'),
        ]),
        [served('create_plan', { title: 'from-log' }), served('get_plan')],
        OT,
        'first-ot-call',
      );

      expect(outcome).toMatchObject({
        kind: 'selection',
        selection: {
          calls: [
            { input: { command: 'ls' }, name: 'Bash' },
            { input: { title: 'from-log' }, name: 'create_plan' },
          ],
          text: 'done',
        },
      });
    });
  });

  describe('when no OT tool was called', () => {
    it('returns every harness call, so a control case can pass', () => {
      const outcome = cliSelectionOf(
        trajectory([call('Read')]),
        [],
        OT,
        'first-ot-call',
      );

      expect(outcome).toMatchObject({
        kind: 'selection',
        selection: { calls: [{ name: 'Read' }] },
      });
    });
  });

  describe('when an OT call went to another server', () => {
    it('is a leak', () => {
      const outcome = cliSelectionOf(
        trajectory([call('mcp__openthrottle__create_plan')]),
        [],
        OT,
        'first-ot-call',
      );

      expect(outcome.kind).toBe('leak');
    });
  });

  describe('when the trajectory shows more OT calls than the sandbox served', () => {
    it('is a mismatch, since a call to the sandbox name that was not logged failed in transit', () => {
      const outcome = cliSelectionOf(
        trajectory([
          call('mcp__openthrottle-mcp__create_plan'),
          call('mcp__openthrottle-mcp__get_plan'),
        ]),
        [served('create_plan')],
        OT,
        'first-ot-call',
      );

      expect(outcome.kind).toBe('mismatch');
    });
  });

  describe('when the trajectory and the log disagree', () => {
    it('is a mismatch for a different first tool', () => {
      const outcome = cliSelectionOf(
        trajectory([call('mcp__openthrottle-mcp__create_plan')]),
        [served('get_plan')],
        OT,
        'first-ot-call',
      );

      expect(outcome.kind).toBe('mismatch');
    });

    it('is a mismatch when only the sandbox saw a call', () => {
      expect(
        cliSelectionOf(
          trajectory([]),
          [served('get_plan')],
          OT,
          'first-ot-call',
        ).kind,
      ).toBe('mismatch');
    });
  });
});

const found = TOOL_SELECTION_CASES.find((testCase) => {
  return testCase.id === 'task-complete';
});
if (found === undefined) {
  throw new Error('the task-complete case is missing from data.cases.ts');
}
const taskComplete = found;
const { prompt } = taskComplete;
const TASK_ID = /[0-9a-f-]{36}/.exec(prompt)?.[0] ?? '';

const readThenWrite = trajectory([
  call('ToolSearch', { query: 'select:mcp__openthrottle-mcp__update_task' }),
  call('mcp__openthrottle-mcp__get_task', { id: TASK_ID }),
  call('mcp__openthrottle-mcp__update_task', {
    id: TASK_ID,
    status: 'COMPLETED',
  }),
]);

const readThenWriteLog = [
  served('get_task', { id: TASK_ID }),
  served('update_task', { id: TASK_ID, status: 'COMPLETED' }),
];

describe('isReadOnlyOtTool', () => {
  it('treats get_*, list_* and semantic_search as reads', () => {
    expect(
      ['get_task', 'list_sources', 'semantic_search'].every(isReadOnlyOtTool),
    ).toBe(true);
  });

  it('treats everything else as a write', () => {
    expect(
      ['update_task', 'create_plan', 'claim_plan_messages'].some(
        isReadOnlyOtTool,
      ),
    ).toBe(false);
  });
});

describe('cliGradeBoundaryOf', () => {
  it('grades a case expecting only writes to the first write', () => {
    expect(cliGradeBoundaryOf(taskComplete.expect)).toBe('first-write');
  });

  it('grades a case expecting a read to the first OT call', () => {
    const expectation: CaseExpectation = {
      args: {},
      kind: 'call',
      tools: ['get_remaining_tasks_for_plan', 'get_tasks_by_plan_id'],
    };

    expect(cliGradeBoundaryOf(expectation)).toBe('first-ot-call');
  });

  it('grades a control case to the first OT call', () => {
    expect(cliGradeBoundaryOf({ kind: 'no-call' })).toBe('first-ot-call');
  });
});

describe('cliSelectionOf with a first-write boundary', () => {
  describe('when the agent reads before it writes', () => {
    it('keeps the read and ends at the write, so task-complete passes', () => {
      const outcome = cliSelectionOf(
        readThenWrite,
        readThenWriteLog,
        OT,
        'first-write',
      );

      expect(outcome).toMatchObject({
        kind: 'selection',
        selection: {
          calls: [
            { name: 'ToolSearch' },
            { input: { id: TASK_ID }, name: 'get_task' },
            {
              input: { id: TASK_ID, status: 'COMPLETED' },
              name: 'update_task',
            },
          ],
        },
      });
      if (outcome.kind !== 'selection') {
        throw new Error(`expected a selection, got ${outcome.kind}`);
      }
      expect(gradeCase(taskComplete, outcome.selection, OT)).toEqual({
        pass: true,
      });
    });

    it('still fails at the first OT call under the first-ot-call boundary', () => {
      const outcome = cliSelectionOf(
        readThenWrite,
        readThenWriteLog,
        OT,
        'first-ot-call',
      );
      if (outcome.kind !== 'selection') {
        throw new Error(`expected a selection, got ${outcome.kind}`);
      }

      expect(gradeCase(taskComplete, outcome.selection, OT)).toEqual({
        pass: false,
        reason: 'expected update_task, got ToolSearch, get_task',
      });
    });
  });

  describe('when the agent only reads', () => {
    it('grades every call and fails task-complete', () => {
      const outcome = cliSelectionOf(
        trajectory([
          call('ToolSearch'),
          call('mcp__openthrottle-mcp__get_task', { id: TASK_ID }),
        ]),
        [served('get_task', { id: TASK_ID })],
        OT,
        'first-write',
      );
      if (outcome.kind !== 'selection') {
        throw new Error(`expected a selection, got ${outcome.kind}`);
      }

      expect(gradeCase(taskComplete, outcome.selection, OT)).toEqual({
        pass: false,
        reason: 'expected update_task, got ToolSearch, get_task',
      });
    });
  });

  describe('when a graded read disagrees with the sandbox log', () => {
    it('is a mismatch', () => {
      const outcome = cliSelectionOf(
        readThenWrite,
        [served('get_plan'), served('update_task')],
        OT,
        'first-write',
      );

      expect(outcome.kind).toBe('mismatch');
    });
  });
});
