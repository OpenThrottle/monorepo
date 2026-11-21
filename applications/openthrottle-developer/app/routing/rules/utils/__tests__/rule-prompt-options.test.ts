import { describe, expect, test } from 'vitest';

import {
  buildRulePromptOptions,
  resolveRulePromptOwner,
} from '../rule-prompt-options';

describe('resolveRulePromptOwner', () => {
  test('a null or missing userId is a system prompt', () => {
    expect(resolveRulePromptOwner(null)).toBe('system');
    expect(resolveRulePromptOwner(undefined)).toBe('system');
  });

  test("any user id is the caller's own prompt", () => {
    expect(resolveRulePromptOwner('user-1')).toBe('yours');
  });
});

describe('buildRulePromptOptions', () => {
  test('merges personas and prompts, tags type and owner, sorts by title', () => {
    expect(
      buildRulePromptOptions(
        [{ id: 'p1', title: 'Reviewer', userId: null }],
        [
          { id: 'q1', title: 'Zeta', userId: 'user-1' },
          { id: 'q2', title: 'Alpha', userId: null },
        ],
      ),
    ).toEqual([
      { id: 'q2', owner: 'system', promptType: 'prompts', title: 'Alpha' },
      { id: 'p1', owner: 'system', promptType: 'personas', title: 'Reviewer' },
      { id: 'q1', owner: 'yours', promptType: 'prompts', title: 'Zeta' },
    ]);
  });
});
