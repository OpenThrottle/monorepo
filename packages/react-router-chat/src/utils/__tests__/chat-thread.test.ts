import { describe, expect, test } from 'vitest';
import {
  findLastAssistantMessage,
  findLastUserMessageId,
  hasStreamedContent,
} from '../chat-thread';
import type { ChatMessage } from '../../types';

describe('hasStreamedContent', () => {
  test('returns true when the body is non-empty', () => {
    const message: ChatMessage = { body: 'Hello', id: '1', role: 'assistant' };
    expect(hasStreamedContent(message)).toBe(true);
  });

  test('returns false when the body is only whitespace and there are no events', () => {
    const message: ChatMessage = { body: '   ', id: '1', role: 'assistant' };
    expect(hasStreamedContent(message)).toBe(false);
  });

  test('returns true when events are present even with an empty body', () => {
    const message: ChatMessage = {
      body: '',
      events: [{ kind: 'session', sessionId: 'abc', sortOrder: 0 }],
      id: '1',
      role: 'assistant',
    };
    expect(hasStreamedContent(message)).toBe(true);
  });

  test('returns false when events is an empty array and body is empty', () => {
    const message: ChatMessage = {
      body: '',
      events: [],
      id: '1',
      role: 'assistant',
    };
    expect(hasStreamedContent(message)).toBe(false);
  });
});

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

describe('findLastAssistantMessage', () => {
  test('returns undefined for an empty list', () => {
    expect(findLastAssistantMessage([])).toBeUndefined();
  });

  test('returns undefined when there is no assistant message', () => {
    const messages: readonly ChatMessage[] = [
      { body: 'Hi', id: '1', role: 'user' },
    ];
    expect(findLastAssistantMessage(messages)).toBeUndefined();
  });

  test('returns the last assistant message', () => {
    const messages: readonly ChatMessage[] = [
      { body: 'First reply', id: 'a1', role: 'assistant' },
      { body: 'Question', id: 'u1', role: 'user' },
      { body: 'Second reply', id: 'a2', role: 'assistant' },
    ];
    expect(findLastAssistantMessage(messages)?.id).toBe('a2');
  });
});
