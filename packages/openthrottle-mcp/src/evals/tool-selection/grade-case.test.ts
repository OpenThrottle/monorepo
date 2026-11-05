import { describe, expect, it } from 'vitest';

import type {
  SelectedCall,
  Selection,
  ToolSelectionCase,
} from './eval-case.ts';
import { gradeCase, matchesArg } from './grade-case.ts';

const OT_TOOLS = new Set(['create_plan', 'delete_plan', 'update_task']);

const calls = (...selected: SelectedCall[]): Selection => ({
  calls: selected,
  kind: 'calls',
  text: '',
  usage: {
    cacheReadInputTokens: 0,
    cacheWriteInputTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
  },
});

const callCase: ToolSelectionCase = {
  area: 'task-crud',
  expect: {
    args: {
      id: { kind: 'equals', value: 't1' },
      status: { kind: 'equals', value: 'COMPLETED' },
    },
    kind: 'call',
    tools: ['update_task'],
  },
  forbid: ['delete_plan'],
  id: 'case',
  origin: { kind: 'seed' },
  prompt: 'done',
};

const controlCase: ToolSelectionCase = {
  area: 'control',
  expect: { kind: 'no-call' },
  forbid: [],
  id: 'control',
  origin: { kind: 'seed' },
  prompt: 'rename a variable',
};

describe('matchesArg', () => {
  describe('equals', () => {
    it('is strict', () => {
      expect(
        matchesArg('COMPLETED', { kind: 'equals', value: 'COMPLETED' }),
      ).toBe(true);
      expect(
        matchesArg('completed', { kind: 'equals', value: 'COMPLETED' }),
      ).toBe(false);
    });
  });

  describe('includes', () => {
    it('matches a substring case-insensitively', () => {
      expect(
        matchesArg('Migrate to Astro', { kind: 'includes', value: 'astro' }),
      ).toBe(true);
    });

    it('matches nested strings in arrays and objects', () => {
      const tasks = [{ title: 'design' }, { title: 'Backfill data' }];
      expect(matchesArg(tasks, { kind: 'includes', value: 'backfill' })).toBe(
        true,
      );
      expect(
        matchesArg(['follow-up'], { kind: 'includes', value: 'follow-up' }),
      ).toBe(true);
    });

    it('rejects non-text values', () => {
      expect(matchesArg(42, { kind: 'includes', value: '42' })).toBe(false);
      expect(matchesArg(undefined, { kind: 'includes', value: 'x' })).toBe(
        false,
      );
    });
  });

  describe('present', () => {
    it('rejects only null and undefined', () => {
      expect(matchesArg(false, { kind: 'present' })).toBe(true);
      expect(matchesArg(null, { kind: 'present' })).toBe(false);
      expect(matchesArg(undefined, { kind: 'present' })).toBe(false);
    });
  });
});

describe('gradeCase', () => {
  describe('when the selection is an error', () => {
    it('fails with the error', () => {
      const grade = gradeCase(
        callCase,
        { kind: 'error', message: 'HTTP 500' },
        OT_TOOLS,
      );
      expect(grade).toEqual({ pass: false, reason: 'error: HTTP 500' });
    });
  });

  describe('when a forbidden tool is called', () => {
    it('fails even if the expected call is also present', () => {
      const grade = gradeCase(
        callCase,
        calls(
          { input: { id: 't1', status: 'COMPLETED' }, name: 'update_task' },
          { input: { id: 'p1' }, name: 'delete_plan' },
        ),
        OT_TOOLS,
      );
      expect(grade).toEqual({
        pass: false,
        reason: 'called forbidden delete_plan',
      });
    });
  });

  describe('a call expectation', () => {
    it('passes when any first-turn call matches tool and args', () => {
      const grade = gradeCase(
        callCase,
        calls(
          { input: {}, name: 'bash' },
          { input: { id: 't1', status: 'COMPLETED' }, name: 'update_task' },
        ),
        OT_TOOLS,
      );
      expect(grade).toEqual({ pass: true });
    });

    it('fails naming the tools actually called when the tool is wrong', () => {
      const grade = gradeCase(
        callCase,
        calls({ input: {}, name: 'create_plan' }),
        OT_TOOLS,
      );
      expect(grade).toEqual({
        pass: false,
        reason: 'expected update_task, got create_plan',
      });
    });

    it('fails on no call at all', () => {
      expect(gradeCase(callCase, calls(), OT_TOOLS)).toEqual({
        pass: false,
        reason: 'expected update_task, got no tool call',
      });
    });

    it('fails naming the mismatched args', () => {
      const grade = gradeCase(
        callCase,
        calls({
          input: { id: 't1', status: 'IN_PROGRESS' },
          name: 'update_task',
        }),
        OT_TOOLS,
      );
      expect(grade).toEqual({
        pass: false,
        reason: 'update_task args did not match: status',
      });
    });

    it('treats a non-object input as empty', () => {
      const grade = gradeCase(
        callCase,
        calls({ input: 'oops', name: 'update_task' }),
        OT_TOOLS,
      );
      expect(grade).toEqual({
        pass: false,
        reason: 'update_task args did not match: id, status',
      });
    });
  });

  describe('a no-call (control) expectation', () => {
    it('passes on a text-only answer', () => {
      expect(gradeCase(controlCase, calls(), OT_TOOLS)).toEqual({ pass: true });
    });

    it('passes when only harness tools are called', () => {
      expect(
        gradeCase(
          controlCase,
          calls({ input: {}, name: 'edit_file' }),
          OT_TOOLS,
        ),
      ).toEqual({ pass: true });
    });

    it('fails when an OT tool is called', () => {
      const grade = gradeCase(
        controlCase,
        calls({ input: {}, name: 'create_plan' }),
        OT_TOOLS,
      );
      expect(grade).toEqual({
        pass: false,
        reason: 'expected no OT call, got create_plan',
      });
    });
  });
});
