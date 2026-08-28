import { describe, expect, test } from 'vitest';
import { findLastUserMessageId } from '../chat-thread';
import type { ChatMessage } from '../../types';

describe('findLastUserMessageId', () => {
  test('returns null for an empty list', () => {
    expect(findLastUserMessageId([])).toBeNull();
  });

  test('returns null when there is no user message', () => {
    const messages: readonly ChatMessage[] = [
      { body: 'Hi', id: '1', role: 'assistant' },
      { body: 'Sys', id: '2', role: 'system' },
    ];
    expect(findLastUserMessageId(messages)).toBeNull();
  });

  test('returns the id of the last user message', () => {
    const messages: readonly ChatMessage[] = [
      { body: 'First', id: 'u1', role: 'user' },
      { body: 'Reply', id: 'a1', role: 'assistant' },
      { body: 'Second', id: 'u2', role: 'user' },
      { body: 'Reply2', id: 'a2', role: 'assistant' },
    ];
    expect(findLastUserMessageId(messages)).toBe('u2');
  });
});
