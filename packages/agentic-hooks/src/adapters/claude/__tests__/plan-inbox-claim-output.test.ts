import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlanInboxClaimTarget, PlanInboxMessage } from '../../../index.ts';
import {
  decideClaudePlanInboxClaim,
  findActivePlanRun,
  isInboxClaimTool,
} from '../plan-inbox-claim-output.ts';

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
const start = toolUse('u1', 'mcp__ot__update_task', {
  id: 'task-9',
  status: 'IN_PROGRESS',
});
const settle = toolUse('s1', 'mcp__ot__settle_plan_run', {});

const steer: PlanInboxMessage = {
  author: 'visormatt',
  body: 'Stop, do not delete that.',
  id: 'm1',
  kind: 'STEER',
};
const queue: PlanInboxMessage = {
  author: 'visormatt',
  body: 'Also add a test.',
  id: 'm2',
  kind: 'QUEUE',
};

const bashPayload = (command: string, sessionId = 'sess') => {
  return {
    session_id: sessionId,
    tool_input: { command },
    tool_name: 'Bash',
    transcript_path: '/t.jsonl',
  };
};

let stateDir = '';

beforeEach(() => {
  stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'inbox-claim-'));
});

afterEach(() => {
  fs.rmSync(stateDir, { force: true, recursive: true });
});

const run = (
  raw: unknown,
  events: readonly unknown[],
  claim: (
    target: PlanInboxClaimTarget,
  ) => Promise<readonly PlanInboxMessage[] | null>,
  nowMs = 1_000,
) => {
  return decideClaudePlanInboxClaim(raw, {
    claim,
    nowMs: () => nowMs,
    readEvents: () => events,
    stateDir,
  });
};

describe('isInboxClaimTool', () => {
  it('matches subagent delegation', () => {
    expect(isInboxClaimTool({ tool_name: 'Agent' })).toBe(true);
    expect(isInboxClaimTool({ tool_name: 'Task' })).toBe(true);
  });

  it('matches a destructive Bash command only', () => {
    expect(isInboxClaimTool(bashPayload('rm -rf dist'))).toBe(true);
    expect(isInboxClaimTool(bashPayload('git push origin x'))).toBe(true);
    expect(isInboxClaimTool(bashPayload('ls'))).toBe(false);
    expect(isInboxClaimTool(bashPayload('grep rm file'))).toBe(false);
    expect(isInboxClaimTool(bashPayload('git status'))).toBe(false);
    expect(isInboxClaimTool(bashPayload('git commit -m "x"'))).toBe(false);
  });

  it('ignores other tools', () => {
    expect(isInboxClaimTool({ tool_name: 'Edit' })).toBe(false);
    expect(isInboxClaimTool('nope')).toBe(false);
  });
});

describe('findActivePlanRun', () => {
  it('returns null with no register', () => {
    expect(findActivePlanRun([start])).toBeNull();
  });

  it('returns null once settled', () => {
    expect(findActivePlanRun([...register, start, settle])).toBeNull();
  });

  it('reads plan, run and the in-flight task', () => {
    expect(findActivePlanRun([...register, start])).toEqual({
      planId: PLAN_ID,
      planRunId: RUN_ID,
      taskId: 'task-9',
    });
  });

  it('has no task before one is started', () => {
    expect(findActivePlanRun(register)?.taskId).toBeNull();
  });

  it('has no task once the in-flight one leaves IN_PROGRESS', () => {
    const complete = toolUse('u2', 'mcp__ot__update_task', {
      id: 'task-9',
      status: 'COMPLETED',
    });
    const other = toolUse('u3', 'mcp__ot__update_task', {
      id: 'task-1',
      summary: 'note only',
    });
    expect(findActivePlanRun([...register, start, other])?.taskId).toBe(
      'task-9',
    );
    expect(
      findActivePlanRun([...register, start, complete])?.taskId,
    ).toBeNull();
  });
});

describe('decideClaudePlanInboxClaim', () => {
  it('does not claim for a non-matching tool call', async () => {
    const claim = vi.fn(async () => [steer]);
    expect(
      await run(bashPayload('ls'), [...register, start], claim),
    ).toBeNull();
    expect(claim).not.toHaveBeenCalled();
  });

  it('does not claim without an active run', async () => {
    const claim = vi.fn(async () => [steer]);
    const raw = bashPayload('rm -rf x');
    expect(await run(raw, [start], claim)).toBeNull();
    expect(await run(raw, [...register, start, settle], claim)).toBeNull();
    expect(claim).not.toHaveBeenCalled();
  });

  it('denies when a STEER arrives and passes the claim target', async () => {
    const claim = vi.fn(async () => [steer, queue]);
    const out = await run(bashPayload('rm -rf x'), [...register, start], claim);
    expect(claim).toHaveBeenCalledWith({
      planId: PLAN_ID,
      planRunId: RUN_ID,
      taskId: 'task-9',
    });
    const parsed = JSON.parse(out ?? '{}');
    expect(parsed.hookSpecificOutput.permissionDecision).toBe('deny');
    const reason = parsed.hookSpecificOutput.permissionDecisionReason;
    expect(reason).toContain('[inbox:STEER from @visormatt] (message m1)');
    expect(reason).toContain('Stop, do not delete that.');
    expect(reason).toContain('[inbox:QUEUE from @visormatt] (message m2)');
    expect(reason).toContain('append_plan_output');
  });

  it('allows with additionalContext for QUEUE only', async () => {
    const out = await run(
      { session_id: 's', tool_name: 'Agent', transcript_path: '/t' },
      [...register, start],
      async () => [queue],
    );
    const parsed = JSON.parse(out ?? '{}');
    expect(parsed.hookSpecificOutput.permissionDecision).toBeUndefined();
    expect(parsed.hookSpecificOutput.hookEventName).toBe('PreToolUse');
    expect(parsed.hookSpecificOutput.additionalContext).toContain('m2');
  });

  it('prints nothing for an empty inbox or a failed claim', async () => {
    const events = [...register, start];
    expect(
      await run(bashPayload('git push'), events, async () => []),
    ).toBeNull();
    expect(
      await run(bashPayload('git push'), events, async () => null, 50_000),
    ).toBeNull();
  });

  it('throttles a second claim inside 20 seconds, then allows it', async () => {
    const claim = vi.fn(async () => [queue]);
    const events = [...register, start];
    const raw = bashPayload('git push');
    expect(await run(raw, events, claim, 1_000)).not.toBeNull();
    expect(await run(raw, events, claim, 10_000)).toBeNull();
    expect(claim).toHaveBeenCalledTimes(1);
    expect(await run(raw, events, claim, 21_001)).not.toBeNull();
    expect(claim).toHaveBeenCalledTimes(2);
  });

  it('prints nothing when the claim throws', async () => {
    const out = await run(bashPayload('git push'), [...register, start], () => {
      return Promise.reject(new Error('boom'));
    });
    expect(out).toBeNull();
  });
});
