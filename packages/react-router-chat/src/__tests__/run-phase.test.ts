import { describe, expect, test } from 'vitest';
import {
  RUN_PHASE_CONNECTING_UNTIL_MS,
  RUN_PHASE_STILL_WORKING_AFTER_MS,
  deriveRunPhaseFromElapsed,
  deriveRunPhaseFromEvents,
} from '../run-phase';
import { ChatRunPhase } from '../types';
import type { ChatTurnEvent, ChatTurnToolEvent } from '../types';

const tool = (
  overrides: Partial<ChatTurnToolEvent> = {},
): ChatTurnToolEvent => ({
  argsJson: null,
  callId: 'c1',
  error: null,
  kind: 'tool',
  name: 'read',
  resultJson: null,
  sortOrder: 0,
  status: 'running',
  ...overrides,
});

const thinking = (sortOrder: number): ChatTurnEvent => ({
  kind: 'thinking',
  sortOrder,
  text: 'hmm',
});

const text = (sortOrder: number): ChatTurnEvent => ({
  kind: 'text',
  sortOrder,
  text: 'hello',
});

describe('deriveRunPhaseFromEvents', () => {
  test('a running tool wins and names the tool', () => {
    const events = [thinking(0), tool({ name: 'shell', sortOrder: 1 })];

    expect(deriveRunPhaseFromEvents(events)).toEqual({
      detail: 'shell',
      phase: ChatRunPhase.runningTool,
    });
  });

  test('picks the latest running tool when several are outstanding', () => {
    const events = [
      tool({ name: 'read', sortOrder: 1 }),
      tool({ name: 'grep', sortOrder: 3 }),
    ];

    expect(deriveRunPhaseFromEvents(events).detail).toBe('grep');
  });

  test('a finished tool does not force the running-tool phase', () => {
    const events = [tool({ sortOrder: 0, status: 'succeeded' }), thinking(1)];

    expect(deriveRunPhaseFromEvents(events).phase).toBe(ChatRunPhase.thinking);
  });

  test('latest event thinking → thinking', () => {
    expect(deriveRunPhaseFromEvents([text(0), thinking(1)]).phase).toBe(
      ChatRunPhase.thinking,
    );
  });

  test('falls back to waiting when the latest event is neither', () => {
    expect(deriveRunPhaseFromEvents([thinking(0), text(1)]).phase).toBe(
      ChatRunPhase.waiting,
    );
  });

  test('empty events → waiting', () => {
    expect(deriveRunPhaseFromEvents([]).phase).toBe(ChatRunPhase.waiting);
  });
});

describe('deriveRunPhaseFromElapsed', () => {
  test('connecting before the connecting cutoff', () => {
    expect(deriveRunPhaseFromElapsed(0)).toBe(ChatRunPhase.connecting);
    expect(deriveRunPhaseFromElapsed(RUN_PHASE_CONNECTING_UNTIL_MS - 1)).toBe(
      ChatRunPhase.connecting,
    );
  });

  test('waiting in the middle band', () => {
    expect(deriveRunPhaseFromElapsed(RUN_PHASE_CONNECTING_UNTIL_MS)).toBe(
      ChatRunPhase.waiting,
    );
    expect(
      deriveRunPhaseFromElapsed(RUN_PHASE_STILL_WORKING_AFTER_MS - 1),
    ).toBe(ChatRunPhase.waiting);
  });

  test('still-working once past the escalation threshold', () => {
    expect(deriveRunPhaseFromElapsed(RUN_PHASE_STILL_WORKING_AFTER_MS)).toBe(
      ChatRunPhase.stillWorking,
    );
    expect(
      deriveRunPhaseFromElapsed(RUN_PHASE_STILL_WORKING_AFTER_MS * 4),
    ).toBe(ChatRunPhase.stillWorking);
  });
});
