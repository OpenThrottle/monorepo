import { ConfigService } from '@nestjs/config';
import { describe, expect, test } from 'vitest';
import {
  isAgentsChatMutationRoutedTool,
  readAgentsChatMutationsEnabledFromConfig,
} from './agents-chat-mutation-policy';

describe('readAgentsChatMutationsEnabledFromConfig', () => {
  test('returns false when unset', () => {
    const config = {
      get: () => undefined,
    } as unknown as ConfigService;

    expect(readAgentsChatMutationsEnabledFromConfig(config)).toBe(false);
  });

  test('returns true for affirmative string values', () => {
    for (const raw of ['true', 'TRUE', '1', 'yes']) {
      const config = {
        get: () => raw,
      } as unknown as ConfigService;

      expect(readAgentsChatMutationsEnabledFromConfig(config)).toBe(true);
    }
  });
});

describe('isAgentsChatMutationRoutedTool', () => {
  test('returns false for typical read tools while the mutation list is empty', () => {
    expect(isAgentsChatMutationRoutedTool('semantic_search')).toBe(false);
    expect(isAgentsChatMutationRoutedTool('health')).toBe(false);
  });
});
