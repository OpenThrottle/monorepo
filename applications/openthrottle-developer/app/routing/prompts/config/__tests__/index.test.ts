import { describe, expect, test } from 'vitest';
import { CustomPromptType } from '~/__generated__/graphql';
import {
  PROMPTS_TYPE_FILTER_OPTIONS,
  TYPE_OPTIONS,
} from '~/routing/prompts/utils/parsers';

describe('type-options config', () => {
  // describe('DEFAULT_PROMPT_TYPE', () => {
  //   test('should be AGENTS', () => {
  //     expect(PROMPTS_DEFAULT_TYPE).toBe(CustomPromptType.Agents);
  //   });
  // });

  describe('PROMPT_TYPE_FILTER_OPTIONS', () => {
    test('should have 5 options', () => {
      expect(PROMPTS_TYPE_FILTER_OPTIONS).toHaveLength(5);
    });

    test('should include all CustomPromptType values', () => {
      const values = PROMPTS_TYPE_FILTER_OPTIONS.map((opt) => opt.value);
      expect(values).toContain(CustomPromptType.Agents);
      expect(values).toContain(CustomPromptType.Commands);
      expect(values).toContain(CustomPromptType.Prompts);
      expect(values).toContain(CustomPromptType.Rules);
      expect(values).toContain(CustomPromptType.Skills);
    });
  });

  describe('TYPE_OPTIONS', () => {
    test('should be an array of values from PROMPT_TYPE_FILTER_OPTIONS', () => {
      expect(TYPE_OPTIONS).toEqual(
        PROMPTS_TYPE_FILTER_OPTIONS.map((opt) => opt.value),
      );
    });
  });

  // describe('parseTypesFromSearchParams', () => {
  //   test('should return empty array when no type param', () => {
  //     const params = new URLSearchParams();
  //     expect(parseTypesFromSearchParams(params)).toEqual([]);
  //   });

  //   test('should parse single type param', () => {
  //     const params = new URLSearchParams('type=AGENTS');
  //     expect(parseTypesFromSearchParams(params)).toEqual(['AGENTS']);
  //   });

  //   test('should parse multiple type params', () => {
  //     const params = new URLSearchParams('type=AGENTS&type=SKILLS');
  //     expect(parseTypesFromSearchParams(params)).toEqual(['AGENTS', 'SKILLS']);
  //   });

  //   test('should parse comma-separated types', () => {
  //     const params = new URLSearchParams('type=AGENTS,COMMANDS');
  //     expect(parseTypesFromSearchParams(params)).toEqual([
  //       'AGENTS',
  //       'COMMANDS',
  //     ]);
  //   });

  //   test('should filter out invalid types', () => {
  //     const params = new URLSearchParams('type=AGENTS&type=INVALID');
  //     expect(parseTypesFromSearchParams(params)).toEqual(['AGENTS']);
  //   });

  //   test('should handle case-insensitive input', () => {
  //     const params = new URLSearchParams('type=agents');
  //     expect(parseTypesFromSearchParams(params)).toEqual(['AGENTS']);
  //   });

  //   test('should trim whitespace', () => {
  //     const params = new URLSearchParams('type= AGENTS ');
  //     expect(parseTypesFromSearchParams(params)).toEqual(['AGENTS']);
  //   });
  // });
});
