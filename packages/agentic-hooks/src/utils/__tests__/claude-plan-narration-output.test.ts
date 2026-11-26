import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlanNarrationChunk } from '../../index.ts';
import {
  readTaskTitleFromResponse,
  runClaudePlanNarration,
} from '../claude-plan-run-output.ts';

const PLAN_ID = 'plan-2222';
const RUN_ID = 'run-1111';
const TASK_ID = 'task-9';
const START_MS = Date.parse('2026-11-21T10:00:00.000Z');

const toolUse = (
  id: string,
  name: string,
  input: Record<string, unknown>,
  timestamp = '2026-11-21T10:00:00.000Z',
) => {
  return {
    message: { content: [{ id, input, name, type: 'tool_use' }] },
    timestamp,
    type: 'assistant',
  };
};

const toolResult = (toolUseId: string, content: string) => {
  return {
    message: {
      content: [{ content, tool_use_id: toolUseId, type: 'tool_result' }],
    },
    type: 'user',
  };
};

const register = [
  toolUse('r1', 'mcp__ot__register_plan_run', {
    branch: 'feat/x',
    planId: PLAN_ID,
  }),
  toolResult('r1', JSON.stringify({ run: { id: RUN_ID } })),
];
const start = toolUse('u1', 'mcp__ot__update_task', {
  id: TASK_ID,
  status: 'IN_PROGRESS',
});
const complete = toolUse(
  'u2',
  'mcp__ot__update_task',
  { id: TASK_ID, status: 'COMPLETED' },
  '2026-11-21T10:12:30.000Z',
);
const modelNarration = toolUse('n1', 'mcp__ot__append_plan_output', {
  content: 'did the thing',
  planId: PLAN_ID,
  taskId: TASK_ID,
});

const postToolUse = (toolUseId: string, status: string) => {
  return {
    hook_event_name: 'PostToolUse',
    session_id: 'sess',
    tool_input: { id: TASK_ID, status },
    tool_name: 'mcp__ot__update_task',
    tool_response: [
      {
        text: JSON.stringify({ task: { id: TASK_ID, title: 'Ship it' } }),
        type: 'text',
      },
    ],
    tool_use_id: toolUseId,
    transcript_path: '/t.jsonl',
  };
};

const stopPayload = {
  hook_event_name: 'Stop',
  session_id: 'sess',
  transcript_path: '/t.jsonl',
};

describe('runClaudePlanNarration', () => {
  let stateDir: string;
  let appended: PlanNarrationChunk[];

  const deps = (events: readonly unknown[], isUp = true) => {
    return {
      append: vi.fn(async (chunk: PlanNarrationChunk) => {
        if (isUp) appended.push(chunk);
        return isUp;
      }),
      nowMs: () => START_MS + 12.5 * 60_000,
      readEvents: () => events,
      stateDir,
    };
  };

  beforeEach(() => {
    stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plan-narration-'));
    appended = [];
  });

  afterEach(() => {
    fs.rmSync(stateDir, { force: true, recursive: true });
  });

  describe('on a task transition', () => {
    it('writes a labelled chunk with title, elapsed time and branch', async () => {
      const events = [...register, start, complete];
      const keys = await runClaudePlanNarration(
        postToolUse('u2', 'COMPLETED'),
        deps(events),
      );
      expect(keys).toEqual([`${RUN_ID}:${TASK_ID}:COMPLETED`]);
      expect(appended).toHaveLength(1);
      const [chunk] = appended;
      expect(chunk?.planId).toBe(PLAN_ID);
      expect(chunk?.taskId).toBe(TASK_ID);
      expect(chunk?.content).toMatch(/^\[hook:narration\] /);
      expect(chunk?.content).toContain('"Ship it"');
      expect(chunk?.content).toContain('COMPLETED after 12m 30s');
      expect(chunk?.content).toContain('branch feat/x');
    });

    it('writes no elapsed time for the IN_PROGRESS flip itself', async () => {
      await runClaudePlanNarration(
        postToolUse('u1', 'IN_PROGRESS'),
        deps([...register, start]),
      );
      expect(appended[0]?.content).not.toContain(' after ');
    });

    it('stays quiet when the model narrated since the last transition', async () => {
      const events = [...register, start, modelNarration, complete];
      const keys = await runClaudePlanNarration(
        postToolUse('u2', 'COMPLETED'),
        deps(events),
      );
      expect(keys).toEqual([]);
      expect(appended).toEqual([]);
    });

    it('stays quiet for a status it does not narrate', async () => {
      await runClaudePlanNarration(
        postToolUse('u3', 'PENDING'),
        deps([...register, start]),
      );
      expect(appended).toEqual([]);
    });

    it('is a no-op with no active run', async () => {
      const settle = toolUse('s1', 'mcp__ot__settle_plan_run', {});
      await runClaudePlanNarration(
        postToolUse('u1', 'IN_PROGRESS'),
        deps([start]),
      );
      await runClaudePlanNarration(
        postToolUse('u2', 'COMPLETED'),
        deps([...register, start, settle, complete]),
      );
      expect(appended).toEqual([]);
    });

    it('records nothing when the server is down', async () => {
      const keys = await runClaudePlanNarration(
        postToolUse('u2', 'COMPLETED'),
        deps([...register, start, complete], false),
      );
      expect(keys).toEqual([]);
      expect(fs.readdirSync(stateDir)).toEqual([]);
    });
  });

  describe('on Stop', () => {
    it('summarizes a task moved with no narration at all', async () => {
      const keys = await runClaudePlanNarration(
        stopPayload,
        deps([...register, start, complete]),
      );
      expect(keys).toEqual([`${RUN_ID}:${TASK_ID}:SUMMARY`]);
      expect(appended[0]?.content).toContain('IN_PROGRESS → COMPLETED');
    });

    it('skips a task the hook already narrated', async () => {
      const events = [...register, start, complete];
      await runClaudePlanNarration(
        postToolUse('u2', 'COMPLETED'),
        deps(events),
      );
      appended = [];
      await runClaudePlanNarration(stopPayload, deps(events));
      expect(appended).toEqual([]);
    });

    it('skips a task the model narrated', async () => {
      await runClaudePlanNarration(
        stopPayload,
        deps([...register, start, modelNarration, complete]),
      );
      expect(appended).toEqual([]);
    });

    it('summarizes once, not on every turn', async () => {
      const events = [...register, start];
      await runClaudePlanNarration(stopPayload, deps(events));
      await runClaudePlanNarration(stopPayload, deps(events));
      expect(appended).toHaveLength(1);
    });
  });

  describe('when the payload is unusable', () => {
    it('does nothing without a session or transcript', async () => {
      const { session_id: _omitted, ...noSession } = stopPayload;
      expect(await runClaudePlanNarration(noSession, deps([]))).toEqual([]);
      expect(await runClaudePlanNarration('junk', deps([]))).toEqual([]);
    });

    it('never throws when reading the transcript fails', async () => {
      const keys = await runClaudePlanNarration(stopPayload, {
        ...deps([]),
        readEvents: () => {
          throw new Error('boom');
        },
      });
      expect(keys).toEqual([]);
    });
  });
});

describe('readTaskTitleFromResponse', () => {
  it('reads the object, a JSON string, or MCP content blocks', () => {
    const result = { task: { title: 'T' } };
    expect(readTaskTitleFromResponse(result)).toBe('T');
    expect(readTaskTitleFromResponse(JSON.stringify(result))).toBe('T');
    expect(
      readTaskTitleFromResponse({
        content: [{ text: JSON.stringify(result), type: 'text' }],
      }),
    ).toBe('T');
  });

  it('is null for any other shape', () => {
    expect(readTaskTitleFromResponse(null)).toBeNull();
    expect(readTaskTitleFromResponse('not json')).toBeNull();
    expect(readTaskTitleFromResponse([{ text: '{}' }])).toBeNull();
  });
});
