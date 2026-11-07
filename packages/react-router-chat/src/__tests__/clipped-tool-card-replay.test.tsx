/**
 * Replay of a turn whose tool payloads the server clipped to fit the persisted
 * tool_metadata cap (`metadata.payloadTruncated: true`, set by
 * `capAgentConversationToolMetadata`). Spans fold -> card, like
 * claude-tool-card-replay.test.tsx: every card must survive with its identity
 * and status, and only the clipped ones show the truncation note.
 */

import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { ChatToolCall } from '../components/ChatToolCall';
import { CHAT_TOOL_CALL_COPY } from '../data/data.copy';
import { foldPersistedTurnEvents } from '../turn-events';
import type { ChatTurnEvent, ChatTurnToolEvent } from '../types';

const isToolEvent = (event: ChatTurnEvent): event is ChatTurnToolEvent => {
  return event.kind === 'tool';
};

const replayToolEvents = (
  events: ReadonlyArray<Record<string, unknown>>,
): readonly ChatTurnToolEvent[] => {
  return foldPersistedTurnEvents(
    JSON.stringify({ events, truncated: true }),
    '',
  ).filter(isToolEvent);
};

const renderCard = (event: ChatTurnToolEvent): ReturnType<typeof render> => {
  return render(<ChatToolCall defaultOpen={true} event={event} />);
};

const toolCall = (
  callId: string,
  input: Record<string, unknown> | string,
  payloadTruncated = false,
): Record<string, unknown> => {
  return {
    delta: '',
    kind: 'tool_call',
    metadata: {
      callId,
      name: 'Read',
      toolCall: input,
      toolName: 'Read',
      ...(payloadTruncated ? { payloadTruncated: true } : {}),
    },
  };
};

const toolResult = (
  callId: string,
  content: string,
  payloadTruncated = false,
): Record<string, unknown> => {
  return {
    delta: '',
    kind: 'tool_result',
    metadata: {
      callId,
      isError: false,
      toolCall: content,
      ...(payloadTruncated ? { payloadTruncated: true } : {}),
    },
  };
};

describe('clipped tool cards (persisted replay)', () => {
  describe('when a result was clipped', () => {
    const events = replayToolEvents([
      toolCall('toolu_big', { file_path: '/tmp/big.log' }),
      toolCall('toolu_small', { file_path: '/tmp/small.ts' }),
      toolResult('toolu_big', 'first lines of a very large file', true),
      toolResult('toolu_small', 'export const small = 1;'),
    ]);
    const big = events.find((event) => event.callId === 'toolu_big');
    const small = events.find((event) => event.callId === 'toolu_small');

    test('keeps every card resolved, with its arguments', () => {
      expect(events).toHaveLength(2);
      expect(events.every((event) => event.status === 'succeeded')).toBe(true);
      expect(big?.argsJson).toContain('/tmp/big.log');
      expect(small?.argsJson).toContain('/tmp/small.ts');
    });

    test('shows the clipped prefix and the truncation note', () => {
      expect(big).toBeDefined();
      if (big === undefined) {
        return;
      }

      const component = renderCard(big);
      expect(component.container).toHaveTextContent('Result');
      expect(component.container).toHaveTextContent(
        'first lines of a very large file',
      );
      expect(component.getByTestId('ChatToolCall-truncated')).toHaveTextContent(
        CHAT_TOOL_CALL_COPY.payloadTruncated,
      );
    });

    test('shows no note on a card that was saved whole', () => {
      expect(small).toBeDefined();
      if (small === undefined) {
        return;
      }

      const component = renderCard(small);
      expect(component.queryByTestId('ChatToolCall-truncated')).toBeNull();
    });
  });

  describe('when only the arguments were clipped', () => {
    test('flags the card from its tool_call', () => {
      const [event] = replayToolEvents([
        toolCall('toolu_write', '{"content":"aaaa', true),
        toolResult('toolu_write', 'wrote 1 file'),
      ]);

      expect(event).toBeDefined();
      if (event === undefined) {
        return;
      }

      expect(event.status).toBe('succeeded');
      expect(
        renderCard(event).getByTestId('ChatToolCall-truncated'),
      ).toBeInTheDocument();
    });
  });
});
