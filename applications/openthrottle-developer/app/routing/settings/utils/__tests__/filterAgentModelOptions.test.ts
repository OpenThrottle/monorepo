import { describe, expect, test } from 'vitest';

import { filterAgentModelOptions } from '../filterAgentModelOptions';

const OPTIONS = ['gpt-5.2', 'GPT-5.2-Fast', 'sonnet-4.5'].map((model) => ({
  enabled: true,
  favorite: false,
  model,
}));

describe('filterAgentModelOptions', () => {
  describe('with a blank query', () => {
    test('keeps every option', () => {
      expect(filterAgentModelOptions(OPTIONS, '   ')).toBe(OPTIONS);
    });
  });

  describe('with a query', () => {
    test('matches a case-insensitive, trimmed substring of the model id', () => {
      const result = filterAgentModelOptions(OPTIONS, ' fast ');
      expect(result.map((option) => option.model)).toEqual(['GPT-5.2-Fast']);
    });

    test('returns nothing when no id matches', () => {
      expect(filterAgentModelOptions(OPTIONS, 'opus')).toEqual([]);
    });
  });
});
