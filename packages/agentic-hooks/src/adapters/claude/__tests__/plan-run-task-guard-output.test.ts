import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  decideClaudePlanRunTaskGuard,
  decidePlanRunTask,
  formatPlanRunTaskFlag,
  isScratchPath,
  readEditTranscriptPath,
  readTranscriptTail,
} from '../plan-run-task-guard-output.ts';

const RUN_ID = 'run-1111';
const PLAN_ID = 'plan-2222';

const toolUse = (id: string, name: string, input: Record<string, unknown>) => {
  return {
    message: { content: [{ id, input, name, type: 'tool_use' }] },
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
  toolUse('r1', 'mcp__ot__register_plan_run', { planId: PLAN_ID }),
  toolResult('r1', JSON.stringify({ run: { id: RUN_ID } })),
];
const setStatus = (id: string, status: string) => {
  return toolUse(id, 'mcp__ot__update_task', { id: 'task-1', status });
};
const settle = toolUse('s1', 'mcp__ot__settle_plan_run', {});

describe('decidePlanRunTask', () => {
  it('passes a session with no plan run', () => {
    expect(decidePlanRunTask([setStatus('u1', 'COMPLETED')])).toEqual({
      kind: 'pass',
    });
  });

  it('flags an edit after register and before any status flip', () => {
    expect(decidePlanRunTask(register)).toEqual({
      kind: 'flag',
      runId: RUN_ID,
    });
  });

  it('passes an edit after the IN_PROGRESS flip', () => {
    expect(
      decidePlanRunTask([...register, setStatus('u1', 'IN_PROGRESS')]),
    ).toEqual({
      kind: 'pass',
    });
  });

  it('flags again once the task is completed and none is started', () => {
    const events = [
      ...register,
      setStatus('u1', 'IN_PROGRESS'),
      setStatus('u2', 'completed'),
    ];
    expect(decidePlanRunTask(events)).toEqual({ kind: 'flag', runId: RUN_ID });
  });

  it('passes after settle_plan_run', () => {
    expect(decidePlanRunTask([...register, settle])).toEqual({ kind: 'pass' });
  });

  it('ignores update_task calls that carry no status', () => {
    const events = [
      ...register,
      setStatus('u1', 'IN_PROGRESS'),
      toolUse('u2', 'mcp__ot__update_task', { id: 'task-1', summary: 'x' }),
    ];
    expect(decidePlanRunTask(events)).toEqual({ kind: 'pass' });
  });

  it('only counts statuses set after the latest register', () => {
    const events = [setStatus('u0', 'IN_PROGRESS'), ...register];
    expect(decidePlanRunTask(events)).toEqual({ kind: 'flag', runId: RUN_ID });
  });

  it('falls back to the planId when the register result is missing', () => {
    const events = [
      toolUse('r1', 'mcp__ot__register_plan_run', { planId: PLAN_ID }),
    ];
    expect(decidePlanRunTask(events)).toEqual({ kind: 'flag', runId: PLAN_ID });
  });

  it('ignores sidechain lines and unparseable events', () => {
    const events = [
      ...register,
      { ...setStatus('u1', 'IN_PROGRESS'), isSidechain: true },
      'garbage',
      null,
    ];
    expect(decidePlanRunTask(events)).toEqual({ kind: 'flag', runId: RUN_ID });
  });
});

describe('readEditTranscriptPath', () => {
  it('reads the transcript path of an edit tool payload', () => {
    expect(
      readEditTranscriptPath({
        tool_name: 'Edit',
        transcript_path: '/t.jsonl',
      }),
    ).toBe('/t.jsonl');
  });

  it('is null for other tools and payloads without a path', () => {
    expect(
      readEditTranscriptPath({ tool_name: 'Bash', transcript_path: '/t' }),
    ).toBeNull();
    expect(readEditTranscriptPath({ tool_name: 'Write' })).toBeNull();
    expect(readEditTranscriptPath('nope')).toBeNull();
  });

  it('is null for an edit to a scratch file under a temp directory', () => {
    expect(
      readEditTranscriptPath({
        tool_input: { file_path: '/private/tmp/scratchpad/squash-msg.txt' },
        tool_name: 'Write',
        transcript_path: '/t.jsonl',
      }),
    ).toBeNull();
  });

  it('keeps an edit to a repo or worktree file', () => {
    expect(
      readEditTranscriptPath({
        tool_input: { file_path: '/Users/me/worktrees/repo/src/a.ts' },
        tool_name: 'Edit',
        transcript_path: '/t.jsonl',
      }),
    ).toBe('/t.jsonl');
  });
});

describe('isScratchPath', () => {
  it('matches paths under a temp dir only', () => {
    expect(isScratchPath('/tmp/x/a.md', ['/tmp'])).toBe(true);
    expect(isScratchPath('/tmpfoo/a.md', ['/tmp'])).toBe(false);
    expect(isScratchPath('/repo/a.md', ['/tmp'])).toBe(false);
  });
});

describe('decideClaudePlanRunTaskGuard', () => {
  it('renders an additionalContext warning without a permission decision', () => {
    const output = decideClaudePlanRunTaskGuard(
      { tool_name: 'Write', transcript_path: '/t' },
      () => register,
    );
    expect(output).not.toBeNull();
    const parsed: unknown = JSON.parse(output ?? '');
    expect(parsed).toEqual({
      hookSpecificOutput: {
        additionalContext: formatPlanRunTaskFlag(RUN_ID),
        hookEventName: 'PreToolUse',
      },
    });
  });

  it('prints nothing on pass', () => {
    expect(
      decideClaudePlanRunTaskGuard(
        { tool_name: 'Edit', transcript_path: '/t' },
        () => [],
      ),
    ).toBeNull();
  });
});

describe('readTranscriptTail', () => {
  const dirs: string[] = [];
  afterEach(() => {
    dirs.splice(0).forEach((dir) => {
      fs.rmSync(dir, { force: true, recursive: true });
    });
  });

  const writeTranscript = (events: readonly unknown[]): string => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'plan-run-guard-'));
    dirs.push(dir);
    const file = path.join(dir, 't.jsonl');
    fs.writeFileSync(
      file,
      events.map((e) => JSON.stringify(e)).join('\n') + '\n',
    );
    return file;
  };

  it('returns no events for a missing file', () => {
    expect(readTranscriptTail('/nonexistent/t.jsonl')).toEqual([]);
  });

  it('reads whole lines and drops a line cut by the byte window', () => {
    const file = writeTranscript([...register, setStatus('u1', 'IN_PROGRESS')]);
    const size = fs.statSync(file).size;
    expect(readTranscriptTail(file)).toHaveLength(3);
    const tail = readTranscriptTail(file, size - 10);
    expect(tail.length).toBeLessThan(3);
    expect(tail.length).toBeGreaterThan(0);
  });

  it('allows when the register fell outside the window', () => {
    const file = writeTranscript([
      ...register,
      ...Array(50).fill(setStatus('u', 'IN_PROGRESS')),
    ]);
    const events = readTranscriptTail(file, 2000);
    expect(decidePlanRunTask(events)).toEqual({ kind: 'pass' });
  });
});
