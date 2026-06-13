import { describe, expect, test } from 'vitest';
import { CustomPromptType } from '~/__generated__/graphql';
import {
  PROMPTS_BASE_PATH,
  PROMPTS_DEFAULT_CONTENT,
  PROMPTS_DEFAULT_TYPE,
  PROMPTS_SORT_OPTIONS,
} from '~/routing/prompts/config';

describe('routing/prompts config', () => {
  test('PROMPTS_BASE_PATH is the list route', () => {
    expect(PROMPTS_BASE_PATH).toBe('/prompts');
  });

  test('PROMPTS_DEFAULT_TYPE is Agents', () => {
    expect(PROMPTS_DEFAULT_TYPE).toBe(CustomPromptType.Agents);
  });

  test('PROMPTS_DEFAULT_CONTENT is a markdown starter string', () => {
    expect(PROMPTS_DEFAULT_CONTENT).toContain('# New Prompt');
  });

  describe('PROMPTS_SORT_OPTIONS', () => {
    test('includes expected combined sort keys', () => {
      const values = PROMPTS_SORT_OPTIONS.map((o) => o.value);
      expect(values).toContain('updatedAt-desc');
      expect(values).toContain('title-asc');
    });

    test('labels are unique', () => {
      const labels = PROMPTS_SORT_OPTIONS.map((o) => o.label);
      expect(new Set(labels).size).toBe(labels.length);
    });
  });
});
