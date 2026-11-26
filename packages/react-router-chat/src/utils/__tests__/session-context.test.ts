import { describe, expect, it } from 'vitest';

import type { ChatMessage, ChatTokenUsage } from '../../types';
import { summarizeSessionContext } from '../session-context';

const turn = (usage: ChatTokenUsage, id = 'm'): ChatMessage => {
  return {
    body: '',
    events: [
      {
        error: null,
        kind: 'usage',
        result: null,
        sortOrder: 1,
        usage,
        usageJson: null,
      },
    ],
    id,
    role: 'assistant',
  };
};

const keys = (messages: readonly ChatMessage[]): readonly string[] => {
  return summarizeSessionContext(messages).rows.map((row) => row.key);
};

describe('summarizeSessionContext', () => {
  describe('with no usage', () => {
    it('is empty', () => {
      const summary = summarizeSessionContext([
        { body: 'hi', id: 'u', role: 'user' },
      ]);

      expect(summary.isEmpty).toBe(true);
      expect(summary.rows).toEqual([]);
      expect(summary.window).toBeUndefined();
      expect(summary.lastTurnTotal).toBeUndefined();
    });
  });

  describe('Claude-shaped history', () => {
    const messages = [
      turn(
        {
          cacheReadTokens: 1000,
          cacheWriteTokens: 200,
          contextTokens: 50000,
          contextWindowTokens: 200000,
          costUsd: 0.5,
          inputTokens: 100,
          outputTokens: 50,
        },
        'a',
      ),
      turn(
        {
          cacheReadTokens: 2000,
          contextTokens: 100000,
          contextWindowTokens: 200000,
          costUsd: 0.25,
          inputTokens: 300,
          outputTokens: 70,
        },
        'b',
      ),
    ];

    it('takes the window from the latest turn, not a sum', () => {
      const { window } = summarizeSessionContext(messages);

      expect(window?.usedTokens).toBe(100000);
      expect(window?.percent).toBe(50);
    });

    it('sums counts and reports cache and cost rows', () => {
      expect(keys(messages)).toEqual([
        'input',
        'output',
        'cacheRead',
        'cacheWrite',
        'total',
        'cost',
      ]);
    });

    it('reports the last turn total', () => {
      expect(summarizeSessionContext(messages).lastTurnTotal).toBe('370');
    });
  });

  describe('OpenCode-shaped history', () => {
    it('has reasoning and no window', () => {
      const messages = [
        turn({ inputTokens: 10, outputTokens: 5, reasoningTokens: 7 }),
      ];

      expect(summarizeSessionContext(messages).window).toBeUndefined();
      expect(keys(messages)).toContain('reasoning');
    });
  });

  describe('Codex-shaped history', () => {
    it('has only input, output and total', () => {
      const messages = [turn({ inputTokens: 10, outputTokens: 5 })];

      expect(keys(messages)).toEqual(['input', 'output', 'total']);
    });
  });
});
