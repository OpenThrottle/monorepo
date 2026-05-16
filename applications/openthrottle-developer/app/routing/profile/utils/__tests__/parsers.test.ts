import { describe, expect, test } from 'vitest';
import { parseSkillsDate } from '~/routing/profile/utils/parsers';

describe('routing/profile utils parsers', () => {
  test('parseSkillsDate returns the input unchanged (placeholder)', () => {
    expect(parseSkillsDate('2024-01-02')).toBe('2024-01-02');
    expect(parseSkillsDate('')).toBe('');
  });
});
