import { describe, expect, it, vi } from 'vitest';

import type { OtIdLookup } from '../../../index.ts';
import { decideKickoff, readKickoffBrief } from '../kickoff-guard.ts';

const PLAN_ID = '586bcff7-dbef-4e2c-ae22-d3f9210b2a39';

const startSession = (toolInput: Record<string, unknown>) => ({
  hook_event_name: 'PreToolUse',
  session_id: 'session-1',
  tool_input: toolInput,
  tool_name: 'mcp__ccd_session__start_session',
});

const lookupReturning = (result: OtIdLookup) =>
  vi.fn(async (_id: string): Promise<OtIdLookup> => result);

describe('readKickoffBrief', () => {
  it('reads a start_session prompt', () => {
    expect(readKickoffBrief(startSession({ prompt: 'brief' }))).toBe('brief');
  });

  it('reads a hand-off remaining_plan', () => {
    expect(
      readKickoffBrief({
        tool_input: { remaining_plan: 'rest', title: 'T' },
        tool_name: 'mcp__ccd_session__hand_off_to_session',
      }),
    ).toBe('rest');
  });

  it('is null when no brief field is set', () => {
    expect(readKickoffBrief(startSession({ title: 'Fix it' }))).toBeNull();
  });
});

describe('decideKickoff', () => {
  it('allows an /ot-loop brief whose plan exists', async () => {
    const lookup = lookupReturning('found');
    const result = await decideKickoff(
      startSession({ prompt: `/ot-loop ${PLAN_ID}\nOne line of context.` }),
      lookup,
    );
    expect(result).toEqual({ decision: 'allow' });
    expect(lookup).toHaveBeenCalledWith(PLAN_ID);
  });

  it('denies a prose start_session brief', async () => {
    const result = await decideKickoff(
      startSession({ prompt: 'Refactor the payload parser in `payload.ts`.' }),
      lookupReturning('found'),
    );
    expect(result.decision).toBe('deny');
  });

  it('denies a prose hand-off', async () => {
    const result = await decideKickoff(
      {
        tool_input: { remaining_plan: 'Finish the tests.', title: 'Tests' },
        tool_name: 'mcp__ccd_session__hand_off_to_session',
      },
      lookupReturning('found'),
    );
    expect(result.decision).toBe('deny');
  });

  it.each([
    ['an offer (title alone)', { initiation: 'offer', title: 'Fix it' }],
    ['a start by proposal_id', { proposal_id: 'task_ab12cd34' }],
  ])('passes %s through without a lookup', async (_label, toolInput) => {
    const lookup = lookupReturning('missing');
    const result = await decideKickoff(startSession(toolInput), lookup);
    expect(result).toEqual({ decision: 'allow' });
    expect(lookup).not.toHaveBeenCalled();
  });

  it('ignores tools it is not registered for', async () => {
    const result = await decideKickoff(
      { tool_input: { prompt: 'prose' }, tool_name: 'Agent' },
      lookupReturning('missing'),
    );
    expect(result).toEqual({ decision: 'allow' });
  });
});
