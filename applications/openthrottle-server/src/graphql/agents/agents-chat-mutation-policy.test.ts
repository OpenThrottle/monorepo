import { createMock } from '@golevelup/ts-vitest';
import { ConfigService } from '@nestjs/config';
import { describe, expect, test } from 'vitest';
import {
  isAgentsChatMutationRoutedTool,
  readAgentsChatMutationsEnabledFromConfig,
} from './agents-chat-mutation-policy';

describe('readAgentsChatMutationsEnabledFromConfig', () => {
  test('returns false when unset', () => {
    const config = createMock<ConfigService>({
      get: () => undefined,
    });

    expect(readAgentsChatMutationsEnabledFromConfig(config)).toBe(false);
  });

  test('returns true for affirmative string values', () => {
    for (const raw of ['true', 'TRUE', '1', 'yes']) {
      const config = createMock<ConfigService>({
        get: () => raw,
      });

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
