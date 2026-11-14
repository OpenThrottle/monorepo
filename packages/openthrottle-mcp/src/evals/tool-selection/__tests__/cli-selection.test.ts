import type {
  AtifToolCall,
  AtifTrajectory,
} from '@openthrottle/openthrottle-agentic-utils';
import { describe, expect, it } from 'vitest';

import type { SandboxToolCall } from '../../sandbox/createSandboxMcpServer.ts';
import { cliSelectionOf, otCallOf } from '../cli-selection.ts';

const OT = new Set(['create_plan', 'get_plan']);

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
      const outcome = cliSelectionOf(trajectory([call('Read')]), [], OT);

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
      );

      expect(outcome.kind).toBe('mismatch');
    });

    it('is a mismatch when only the sandbox saw a call', () => {
      expect(
        cliSelectionOf(trajectory([]), [served('get_plan')], OT).kind,
      ).toBe('mismatch');
    });
  });
});
