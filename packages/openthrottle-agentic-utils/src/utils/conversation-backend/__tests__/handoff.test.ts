import { describe, expect, it } from 'vitest';

import type { ChatCompletionMessage } from '../../chat-completions/index.ts';
import { CHAT_ACP_BACKENDS_ENV } from '../acp/index.ts';
import {
  backendReplaysFullHistory,
  CHAT_HANDOFF_DEFAULT_TOKEN_BUDGET,
  CHAT_HANDOFF_TOKEN_BUDGET_ENV,
  formatHandoffPreamble,
  resolveHandoffTokenBudget,
  selectHandoffMessages,
} from '../handoff.ts';

const message = (
  role: ChatCompletionMessage['role'],
  chars: number,
): ChatCompletionMessage => {
  return { content: 'x'.repeat(chars), role };
};

describe('selectHandoffMessages', () => {
  it('returns nothing for no messages', () => {
    expect(selectHandoffMessages([], 100)).toEqual({
      included: [],
      omittedCount: 0,
    });
  });

  it('includes everything that fits, in chronological order', () => {
    const missed = [
      { content: 'one', role: 'user' },
      { content: 'two', role: 'assistant' },
    ] satisfies ChatCompletionMessage[];

    expect(selectHandoffMessages(missed, 100)).toEqual({
      included: missed,
      omittedCount: 0,
    });
  });

  it('includes a message exactly at the budget boundary', () => {
    const missed = [message('user', 40)];

    expect(selectHandoffMessages(missed, 10).included).toEqual(missed);
    expect(selectHandoffMessages(missed, 9).included).toEqual([]);
  });

  it('keeps the newest whole messages and counts the omitted ones', () => {
    const older = message('user', 40);
    const middle = message('assistant', 40);
    const newest = message('user', 40);

    expect(selectHandoffMessages([older, middle, newest], 20)).toEqual({
      included: [middle, newest],
      omittedCount: 1,
    });
  });

  it('stops at the first message that does not fit instead of skipping it', () => {
    const small = message('user', 4);
    const huge = message('assistant', 400);
    const newest = message('user', 4);

    expect(selectHandoffMessages([small, huge, newest], 10)).toEqual({
      included: [newest],
      omittedCount: 2,
    });
  });
});

describe('formatHandoffPreamble', () => {
  it('is empty when nothing was included', () => {
    expect(formatHandoffPreamble({ included: [], omittedCount: 3 })).toBe('');
  });

  it('renders User and Assistant blocks without an omitted line', () => {
    const preamble = formatHandoffPreamble({
      included: [
        { content: 'hi', role: 'user' },
        { content: 'hello', role: 'assistant' },
      ],
      omittedCount: 0,
    });

    expect(preamble).toContain('different agent');
    expect(preamble).toContain('User: hi\n\nAssistant: hello');
    expect(preamble).not.toContain('omitted');
  });

  it('states how many earlier messages were omitted', () => {
    const preamble = formatHandoffPreamble({
      included: [{ content: 'hi', role: 'user' }],
      omittedCount: 2,
    });

    expect(preamble).toContain('2 earlier messages omitted');
  });
});

describe('resolveHandoffTokenBudget', () => {
  it('defaults to 16000', () => {
    expect(resolveHandoffTokenBudget({})).toBe(
      CHAT_HANDOFF_DEFAULT_TOKEN_BUDGET,
    );
  });

  it('honors a positive integer and ignores junk', () => {
    expect(
      resolveHandoffTokenBudget({ [CHAT_HANDOFF_TOKEN_BUDGET_ENV]: '500' }),
    ).toBe(500);
    expect(
      resolveHandoffTokenBudget({ [CHAT_HANDOFF_TOKEN_BUDGET_ENV]: '-1' }),
    ).toBe(CHAT_HANDOFF_DEFAULT_TOKEN_BUDGET);
    expect(
      resolveHandoffTokenBudget({ [CHAT_HANDOFF_TOKEN_BUDGET_ENV]: 'abc' }),
    ).toBe(CHAT_HANDOFF_DEFAULT_TOKEN_BUDGET);
  });
});

describe('backendReplaysFullHistory', () => {
  it('is true for openai', () => {
    expect(backendReplaysFullHistory('openai', {})).toBe(true);
  });

  it('is true for gemini on its CLI path', () => {
    expect(backendReplaysFullHistory('gemini', {})).toBe(true);
  });

  it('is false for gemini once the ACP flag routes it', () => {
    expect(
      backendReplaysFullHistory('gemini', {
        [CHAT_ACP_BACKENDS_ENV]: 'gemini',
      }),
    ).toBe(false);
  });

  it('is false for session-based backends', () => {
    expect(backendReplaysFullHistory('claude', {})).toBe(false);
    expect(backendReplaysFullHistory('cursor', {})).toBe(false);
  });
});
