import { describe, expect, test } from 'vitest';
import { CustomPromptType } from '~/__generated__/graphql';
import {
  PROMPTS_TYPE_FILTER_OPTIONS,
  TYPE_OPTIONS,
  parsePromptsSortFromSearchParams,
  parsePromptsTypesFromSearchParams,
} from '~/routing/prompts/utils/parsers';

describe('routing/prompts utils parsers', () => {
  describe('PROMPTS_TYPE_FILTER_OPTIONS', () => {
    test('has five options aligned with CustomPromptType', () => {
      expect(PROMPTS_TYPE_FILTER_OPTIONS).toHaveLength(5);
      const values = PROMPTS_TYPE_FILTER_OPTIONS.map((opt) => opt.value);
      expect(values).toContain(CustomPromptType.Agents);
      expect(values).toContain(CustomPromptType.Commands);
      expect(values).toContain(CustomPromptType.Prompts);
      expect(values).toContain(CustomPromptType.Rules);
      expect(values).toContain(CustomPromptType.Skills);
    });
  });

  describe('TYPE_OPTIONS', () => {
    test('matches values from PROMPTS_TYPE_FILTER_OPTIONS', () => {
      expect(TYPE_OPTIONS).toEqual(
        PROMPTS_TYPE_FILTER_OPTIONS.map((opt) => opt.value),
      );
    });
  });

  describe('parsePromptsSortFromSearchParams', () => {
    test('defaults to updatedAt and desc when params missing', () => {
      const params = new URLSearchParams();
      expect(parsePromptsSortFromSearchParams(params)).toEqual({
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      });
    });

    test('reads valid sortBy and sortOrder from URL', () => {
      const params = new URLSearchParams('sortBy=title&sortOrder=asc');
      expect(parsePromptsSortFromSearchParams(params)).toEqual({
        sortBy: 'title',
        sortOrder: 'asc',
      });
    });

    describe('when sortBy is invalid', () => {
      test('falls back to updatedAt', () => {
        const params = new URLSearchParams('sortBy=invalid&sortOrder=asc');
        expect(parsePromptsSortFromSearchParams(params)).toEqual({
          sortBy: 'updatedAt',
          sortOrder: 'asc',
        });
      });
    });

    describe('when sortOrder is invalid', () => {
      test('falls back to desc', () => {
        const params = new URLSearchParams('sortBy=title&sortOrder=sideways');
        expect(parsePromptsSortFromSearchParams(params)).toEqual({
          sortBy: 'title',
          sortOrder: 'desc',
        });
      });
    });
  });

  describe('parsePromptsTypesFromSearchParams', () => {
    test('returns empty array when no type param', () => {
      const params = new URLSearchParams();
      expect(parsePromptsTypesFromSearchParams(params)).toEqual([]);
    });

    test('parses single type param to uppercase enum value', () => {
      const params = new URLSearchParams('type=agents');
      expect(parsePromptsTypesFromSearchParams(params)).toEqual([
        CustomPromptType.Agents,
      ]);
    });

    test('parses multiple type params', () => {
      const params = new URLSearchParams('type=AGENTS&type=SKILLS');
      expect(parsePromptsTypesFromSearchParams(params)).toEqual([
        CustomPromptType.Agents,
        CustomPromptType.Skills,
      ]);
    });

    test('parses comma-separated types in one param', () => {
      const params = new URLSearchParams('type=AGENTS,COMMANDS');
      expect(parsePromptsTypesFromSearchParams(params)).toEqual([
        CustomPromptType.Agents,
        CustomPromptType.Commands,
      ]);
    });

    describe('when type values include invalid entries', () => {
      test('filters out invalid types', () => {
        const params = new URLSearchParams('type=AGENTS&type=INVALID');
        expect(parsePromptsTypesFromSearchParams(params)).toEqual([
          CustomPromptType.Agents,
        ]);
      });
    });

    describe('when type string has extra whitespace', () => {
      test('trims and still parses', () => {
        const params = new URLSearchParams('type= AGENTS ');
        expect(parsePromptsTypesFromSearchParams(params)).toEqual([
          CustomPromptType.Agents,
        ]);
      });
    });
  });
});
