import { PROMPT_TYPE_VALUES } from '@openthrottle/react-router-editor';
import { describe, expect, test } from 'vitest';
import { CustomPromptType } from '~/__generated__/graphql';
import { isCustomPromptType, isPromptType } from './prompt-type-guards';

describe('isPromptType', () => {
  test.each(PROMPT_TYPE_VALUES)('accepts known prompt type %s', (value) => {
    expect(isPromptType(value)).toBe(true);
  });

  test('rejects an unknown prompt type', () => {
    expect(isPromptType('not-a-prompt-type')).toBe(false);
  });

  test('rejects an empty string', () => {
    expect(isPromptType('')).toBe(false);
  });
});

describe('isCustomPromptType', () => {
  test.each(Object.values(CustomPromptType))(
    'accepts known custom prompt type %s',
    (value) => {
      expect(isCustomPromptType(value)).toBe(true);
    },
  );

  test('rejects an unknown custom prompt type', () => {
    expect(isCustomPromptType('NOT_A_TYPE')).toBe(false);
  });

  test('rejects an empty string', () => {
    expect(isCustomPromptType('')).toBe(false);
  });
});
