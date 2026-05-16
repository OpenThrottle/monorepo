import { describe, expect, test } from 'vitest';
import { parseSkillsDate } from '~/routing/skills/utils/parsers';

describe('routing/skills utils parsers', () => {
  test('parseSkillsDate returns the input unchanged (placeholder)', () => {
    expect(parseSkillsDate('2024-01-02')).toBe('2024-01-02');
    expect(parseSkillsDate('')).toBe('');
  });
});
